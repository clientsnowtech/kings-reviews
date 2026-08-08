'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { auth, signOut } from './auth'
import { actingOwnerId } from './impersonation'
import {
  recountCategories,
  categoryIdsOf,
  findDuplicateBusiness,
  duplicateMessage,
} from './business'
import { recomputeRating } from './rating'
import { checkText } from './moderation-db'
import { sendMail, reviewPendingMail, businessSubmittedMail } from './mail'
import { AUTO_PUBLISH_DAYS } from './review-sla'
import { slugify } from './utils'
import { saveImages, deleteUploads } from './upload'
import { rateLimit } from './rate-limit'

export async function signOutAction() {
  await signOut({ redirectTo: '/' })
}
import {
  registerSchema,
  reviewSchema,
  businessSchema,
  businessEditSchema,
  replySchema,
} from './validations'

export type ActionState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> }

function firstErrors(err: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

// ---------------------------------------------------------------- auth

export async function registerUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { error: 'Email already registered' }

  const password = await bcrypt.hash(parsed.data.password, 10)
  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password,
      role: 'USER',
    },
  })
  redirect('/login?registered=1')
}

// ---------------------------------------------------------------- reviews

/**
 * The four contact-person fields, read the same way by register and edit.
 *
 * They describe a named human rather than the business, so they are stored but
 * never published — no public query selects them.
 */
function contactPerson(formData: FormData) {
  return {
    contactName: formData.get('contactName'),
    contactRole: formData.get('contactRole'),
    contactEmail: formData.get('contactEmail'),
    contactPhone: formData.get('contactPhone'),
  }
}

/** …and the same four ready for Prisma, where blank means "nobody named". */
function contactPersonData(d: {
  contactName?: string
  contactRole?: string
  contactEmail?: string
  contactPhone?: string
}) {
  return {
    contactName: d.contactName || null,
    contactRole: d.contactRole || null,
    contactEmail: d.contactEmail || null,
    contactPhone: d.contactPhone || null,
  }
}

export async function createReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Abuse braking: at most 5 review submissions per user per minute.
  if (!rateLimit(`review:${session.user.id}`, 5, 60_000).ok) {
    return { error: 'You’re doing that too fast. Please wait a moment and try again.' }
  }

  const parsed = reviewSchema.safeParse({
    businessId: formData.get('businessId'),
    rating: formData.get('rating'),
    title: formData.get('title'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  // the admin-managed blocklist runs after zod, since it needs a DB read
  const extra = (await checkText(parsed.data.title)) ?? (await checkText(parsed.data.body))
  if (extra) return { fieldErrors: { body: extra } }

  const business = await db.business.findUnique({
    where: { id: parsed.data.businessId },
    select: { slug: true, name: true, owner: { select: { email: true } } },
  })
  if (!business) return { error: 'Business not found' }

  let review
  try {
    review = await db.review.upsert({
      where: {
        businessId_userId: {
          businessId: parsed.data.businessId,
          userId: session.user.id,
        },
      },
      // Nothing a reviewer writes goes live on its own — the owner or an admin
      // has to approve it first, and an edit sends it back for approval too.
      update: {
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        status: 'PENDING',
      },
      create: {
        businessId: parsed.data.businessId,
        userId: session.user.id,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        status: 'PENDING',
      },
    })
  } catch {
    return { error: 'Could not save review' }
  }

  // Optional photos. An edit re-submits the whole set, so new uploads replace
  // the old ones instead of piling up on the review.
  const files = formData.getAll('images').filter((f): f is File => f instanceof File)
  if (files.length) {
    const paths = await saveImages(files, 'reviews')
    if (paths.length) {
      const old = await db.reviewImage.findMany({
        where: { reviewId: review.id },
        select: { path: true },
      })
      if (old.length) {
        await db.reviewImage.deleteMany({ where: { reviewId: review.id } })
        await deleteUploads(old.map((i) => i.path))
      }
      await db.reviewImage.createMany({
        data: paths.map((p) => ({ reviewId: review.id, path: p })),
      })
    }
  }

  // the owner cannot approve what they do not know about
  await sendMail(
    reviewPendingMail({
      to: business.owner.email,
      businessName: business.name,
      rating: parsed.data.rating,
      days: AUTO_PUBLISH_DAYS,
    }),
  )

  // an edit can pull a previously live review back out of the average
  await recomputeRating(parsed.data.businessId)
  revalidatePath(`/company/${business.slug}`)
  revalidatePath('/business/dashboard/reviews')
  return { ok: true }
}

export async function toggleHelpful(
  reviewId: string,
): Promise<{ helpfulCount: number; voted: boolean }> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Abuse braking: cap vote toggles per user per minute.
  if (!rateLimit(`vote:${session.user.id}`, 30, 60_000).ok) {
    throw new Error('Too many requests')
  }

  const existing = await db.reviewVote.findUnique({
    where: { reviewId_userId: { reviewId, userId: session.user.id } },
  })
  let voted: boolean
  if (existing) {
    await db.reviewVote.delete({ where: { id: existing.id } })
    voted = false
  } else {
    await db.reviewVote.create({ data: { reviewId, userId: session.user.id } })
    voted = true
  }

  // The client updates optimistically from the returned count, so there is no
  // need to revalidate the whole company page on every vote toggle.
  const helpfulCount = await db.reviewVote.count({ where: { reviewId } })
  await db.review.update({ where: { id: reviewId }, data: { helpfulCount } })
  return { helpfulCount, voted }
}

export async function replyToReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const parsed = replySchema.safeParse({
    reviewId: formData.get('reviewId'),
    body: formData.get('body'),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  // a reply is published text too — same rules as the review it answers
  const bad = await checkText(parsed.data.body)
  if (bad) return { fieldErrors: { body: bad } }

  const review = await db.review.findUnique({
    where: { id: parsed.data.reviewId },
    include: { business: { select: { id: true, ownerId: true, slug: true } } },
  })
  if (!review) return { error: 'Review not found' }
  if (review.business.ownerId !== ((await actingOwnerId(session)) ?? session.user.id))
    return { error: 'Only the business owner can reply' }

  await db.reviewReply.upsert({
    where: { reviewId: review.id },
    update: { body: parsed.data.body },
    create: {
      reviewId: review.id,
      businessId: review.business.id,
      body: parsed.data.body,
    },
  })
  revalidatePath(`/company/${review.business.slug}`)
  return { ok: true }
}

// ---------------------------------------------------------------- business

/**
 * Secondary categories from a form, minus the primary one — a listing filed
 * twice under the same category would count itself twice.
 */
function extraCategoryIds(formData: FormData, primaryId: number): number[] {
  const ids = formData
    .getAll('extraCategoryIds')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0 && n !== primaryId)
  return [...new Set(ids)]
}

export async function registerBusiness(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const parsed = businessSchema.safeParse({
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
    website: formData.get('website'),
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    foundedYear: formData.get('foundedYear'),
    instagram: formData.get('instagram'),
    facebook: formData.get('facebook'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    pincode: formData.get('pincode'),
    mapUrl: formData.get('mapUrl'),
    ...contactPerson(formData),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  // The same shop must not land twice — checked before the logo and cover are
  // written, so a rejected submission leaves no orphan uploads behind.
  const dup = await findDuplicateBusiness({
    name: parsed.data.name,
    city: parsed.data.city,
    phone: parsed.data.phone,
  })
  if (dup) {
    return {
      fieldErrors: {
        [dup.reason]: `${duplicateMessage(dup)} Claim it or write to us instead of listing it again.`,
      },
    }
  }

  // unique slug
  const base = slugify(parsed.data.name)
  let slug = base
  for (let i = 2; await db.business.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`
  }

  // optional logo / cover uploaded straight from the listing form
  const logoFile = formData.get('logo')
  const coverFile = formData.get('cover')
  const [logo] =
    logoFile instanceof File && logoFile.size > 0 ? await saveImages([logoFile], 'business', 1) : []
  const [cover] =
    coverFile instanceof File && coverFile.size > 0 ? await saveImages([coverFile], 'business', 1) : []

  await db.business.create({
    data: {
      ownerId: session.user.id,
      categoryId: parsed.data.categoryId,
      slug,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp || null,
      website: parsed.data.website || null,
      tagline: parsed.data.tagline || null,
      description: parsed.data.description || null,
      foundedYear: parsed.data.foundedYear ?? null,
      instagram: parsed.data.instagram || null,
      facebook: parsed.data.facebook || null,
      address: parsed.data.address || null,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode || null,
      mapUrl: parsed.data.mapUrl || null,
      ...contactPersonData(parsed.data),
      logo: logo ?? null,
      cover: cover ?? null,
      // Nothing an owner lists is public until an admin approves it. Every
      // public query filters on LIVE, so PENDING is invisible everywhere.
      status: 'PENDING',
      extraCategories: {
        connect: extraCategoryIds(formData, parsed.data.categoryId).map((id) => ({ id })),
      },
    },
  })

  // promote plain user to business role — the panel is where they now wait
  if (session.user.role === 'USER') {
    await db.user.update({ where: { id: session.user.id }, data: { role: 'BUSINESS' } })
  }

  // The category count only tracks live listings, so it moves on approval,
  // not here. See recountCategory().

  const adminInbox = process.env.ADMIN_EMAIL ?? process.env.MAIL_FROM
  if (adminInbox) {
    await sendMail(
      businessSubmittedMail({
        to: adminInbox,
        businessName: parsed.data.name,
        city: parsed.data.city,
        ownerEmail: session.user.email ?? parsed.data.email,
      }),
    )
  }

  revalidatePath('/admin/businesses')
  redirect('/business/dashboard/businesses?submitted=1')
}

export async function updateBusiness(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const parsed = businessEditSchema.safeParse({
    id: formData.get('id'),
    categoryId: formData.get('categoryId'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
    website: formData.get('website'),
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    foundedYear: formData.get('foundedYear'),
    instagram: formData.get('instagram'),
    facebook: formData.get('facebook'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    pincode: formData.get('pincode'),
    mapUrl: formData.get('mapUrl'),
    ...contactPerson(formData),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  const business = await db.business.findUnique({
    where: { id: parsed.data.id },
    select: { ownerId: true, slug: true, categoryId: true, logo: true, cover: true },
  })
  if (!business) return { error: 'Business not found' }
  const ownerId = (await actingOwnerId(session)) ?? session.user.id
  // Admins save through this same form — the admin panel shows the owner's own
  // screens instead of a thinner copy that drifts away from them.
  const asAdmin = business.ownerId !== ownerId && session.user.role === 'ADMIN'
  if (business.ownerId !== ownerId && !asAdmin) return { error: 'Not your business' }

  // the categories it sat under before this edit, primary and extras alike
  const before = await categoryIdsOf(parsed.data.id)

  // optional logo / cover replacement
  const logoFile = formData.get('logo')
  const coverFile = formData.get('cover')
  const [logo] =
    logoFile instanceof File && logoFile.size > 0
      ? await saveImages([logoFile], 'business', 1)
      : []
  const [cover] =
    coverFile instanceof File && coverFile.size > 0
      ? await saveImages([coverFile], 'business', 1)
      : []

  // Clearing a picture needs saying out loud: an empty file input means "leave
  // it alone", so without this a wrong logo could only be replaced, never taken
  // down. A fresh upload in the same save wins over the tick.
  const dropLogo = !logo && formData.get('removeLogo') === 'on'
  const dropCover = !cover && formData.get('removeCover') === 'on'

  // whatever this save orphans on disk — replaced or removed
  const orphaned = [
    ...(logo || dropLogo ? [business.logo] : []),
    ...(cover || dropCover ? [business.cover] : []),
  ].filter((p): p is string => !!p)

  await db.business.update({
    where: { id: parsed.data.id },
    data: {
      categoryId: parsed.data.categoryId,
      email: parsed.data.email,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp || null,
      website: parsed.data.website || null,
      tagline: parsed.data.tagline || null,
      description: parsed.data.description || null,
      foundedYear: parsed.data.foundedYear ?? null,
      instagram: parsed.data.instagram || null,
      facebook: parsed.data.facebook || null,
      address: parsed.data.address || null,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode || null,
      mapUrl: parsed.data.mapUrl || null,
      ...contactPersonData(parsed.data),
      extraCategories: {
        set: extraCategoryIds(formData, parsed.data.categoryId).map((id) => ({ id })),
      },
      ...(logo ? { logo } : dropLogo ? { logo: null } : {}),
      ...(cover ? { cover } : dropCover ? { cover: null } : {}),
    },
  })

  // only once the row no longer points at them, so a failed save leaves the
  // listing with its pictures rather than with dead links
  if (orphaned.length) await deleteUploads(orphaned)

  // Keep category listing counts honest. Recounted rather than shifted by one:
  // this listing may still be PENDING (an unapproved listing counts nowhere),
  // and an edit can rewrite the extra categories as well as the primary one.
  await recountCategories([
    ...before,
    parsed.data.categoryId,
    ...extraCategoryIds(formData, parsed.data.categoryId),
  ])

  // Someone editing a listing that is not theirs should never be invisible —
  // the same rule the impersonation switch follows.
  if (asAdmin) {
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email ?? '',
        action: 'business.update',
        entity: 'business',
        entityId: parsed.data.id,
        detail: 'edited through the owner form',
      },
    })
  }

  revalidatePath(`/company/${business.slug}`)
  revalidatePath('/business/dashboard/businesses')
  revalidatePath('/admin/businesses')
  return { ok: true }
}
