'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { db } from './db'
import { auth, signOut } from './auth'
import { actingOwnerId } from './impersonation'
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

async function recomputeRating(businessId: string) {
  const rows = await db.review.groupBy({
    by: ['rating'],
    where: { businessId, status: 'LIVE' },
    _count: { rating: true },
  })
  const hist = [0, 0, 0, 0, 0] // index 0 => 1 star
  let total = 0
  let sum = 0
  for (const r of rows) {
    const n = r._count.rating
    hist[r.rating - 1] = n
    total += n
    sum += r.rating * n
  }
  await db.business.update({
    where: { id: businessId },
    data: {
      ratingCount: total,
      ratingAvg: total ? new Prisma.Decimal((sum / total).toFixed(2)) : new Prisma.Decimal(0),
      rating1: hist[0],
      rating2: hist[1],
      rating3: hist[2],
      rating4: hist[3],
      rating5: hist[4],
    },
  })
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

  const business = await db.business.findUnique({
    where: { id: parsed.data.businessId },
    select: { slug: true },
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
      update: {
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
      },
      create: {
        businessId: parsed.data.businessId,
        userId: session.user.id,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
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

  await recomputeRating(parsed.data.businessId)
  revalidatePath(`/company/${business.slug}`)
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
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

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
      logo: logo ?? null,
      cover: cover ?? null,
      // hybrid: auto-live but unverified until admin/OTP verifies
      status: 'LIVE',
      extraCategories: {
        connect: extraCategoryIds(formData, parsed.data.categoryId).map((id) => ({ id })),
      },
    },
  })

  // promote plain user to business role
  if (session.user.role === 'USER') {
    await db.user.update({ where: { id: session.user.id }, data: { role: 'BUSINESS' } })
  }

  await db.category.update({
    where: { id: parsed.data.categoryId },
    data: { listingCount: { increment: 1 } },
  })

  revalidatePath('/categories')
  redirect(`/company/${slug}`)
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
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  const business = await db.business.findUnique({
    where: { id: parsed.data.id },
    select: { ownerId: true, slug: true, categoryId: true },
  })
  if (!business) return { error: 'Business not found' }
  const ownerId = (await actingOwnerId(session)) ?? session.user.id
  if (business.ownerId !== ownerId) return { error: 'Not your business' }

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
      extraCategories: {
        set: extraCategoryIds(formData, parsed.data.categoryId).map((id) => ({ id })),
      },
      ...(logo ? { logo } : {}),
      ...(cover ? { cover } : {}),
    },
  })

  // keep category listing counts honest when the category changes
  if (business.categoryId !== parsed.data.categoryId) {
    await db.category.update({
      where: { id: business.categoryId },
      data: { listingCount: { decrement: 1 } },
    })
    await db.category.update({
      where: { id: parsed.data.categoryId },
      data: { listingCount: { increment: 1 } },
    })
  }

  revalidatePath(`/company/${business.slug}`)
  revalidatePath('/business/dashboard/businesses')
  return { ok: true }
}
