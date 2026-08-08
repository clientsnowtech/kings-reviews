'use server'

import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { db } from './db'
import { auth } from './auth'
import { actingOwnerId } from './impersonation'
import { recomputeRating } from './rating'
import { sendMail, reviewDecidedMail, reviewCardMail } from './mail'
import { saveImages, deleteUploads } from './upload'
import { shortReviewLink } from './review-link'

/**
 * Returns the business only if the caller owns it (or is acting for its owner).
 *
 * Admins pass too: they edit listings through the owner's own screens rather
 * than a thinner copy of them, so support fixes exactly what the owner sees.
 * It grants nothing new — an admin can already open any dashboard as its owner.
 */
async function ownedBusiness(businessId: string) {
  const session = await auth()
  if (!session?.user) return null
  const ownerId = (await actingOwnerId(session)) ?? session.user.id
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, slug: true, verifiedAt: true },
  })
  if (!biz) return null
  if (biz.ownerId !== ownerId && session.user.role !== 'ADMIN') return null
  return biz
}

// ---------------------------------------------------------------- review card

/** A card is a page of artwork, not a photo album. */
const CARD_MAX_BYTES = 3 * 1024 * 1024

export type MailCardState = { ok?: boolean; error?: string; to?: string }

/**
 * Mail the printable QR card to the owner as a real attachment.
 *
 * `mailto:` cannot carry a file, so the browser otherwise leaves the owner to
 * download the card and attach it by hand. The bitmap already exists in the
 * dialog — it is posted here and sent from the server instead.
 */
export async function emailReviewCard(formData: FormData): Promise<MailCardState> {
  const session = await auth()
  if (!session?.user?.email) return { error: 'Sign in first.' }

  const biz = await ownedBusiness(String(formData.get('businessId')))
  if (!biz) return { error: 'That business is not yours.' }

  const card = formData.get('card')
  if (!(card instanceof File) || card.size === 0) return { error: 'The card did not come through.' }
  if (card.type !== 'image/png') return { error: 'The card must be a PNG.' }
  if (card.size > CARD_MAX_BYTES) return { error: 'That card is too large to mail.' }

  const business = await db.business.findUnique({
    where: { id: biz.id },
    select: { name: true, slug: true },
  })
  if (!business) return { error: 'That business is not yours.' }

  await sendMail(
    reviewCardMail({
      to: session.user.email,
      businessName: business.name,
      url: shortReviewLink(business.slug),
      card: Buffer.from(await card.arrayBuffer()),
      filename: `${business.slug}-review-card.png`,
    }),
  )

  return { ok: true, to: session.user.email }
}

// ---------------------------------------------------------------- hours

const DAYS = [0, 1, 2, 3, 4, 5, 6]

export async function setBusinessHours(formData: FormData) {
  const businessId = String(formData.get('businessId'))
  const biz = await ownedBusiness(businessId)
  if (!biz) return

  for (const day of DAYS) {
    const closed = formData.get(`closed_${day}`) === 'on'
    const openTime = String(formData.get(`open_${day}`) ?? '').trim() || null
    const closeTime = String(formData.get(`close_${day}`) ?? '').trim() || null

    await db.businessHour.upsert({
      where: { businessId_day: { businessId, day } },
      update: { closed, openTime: closed ? null : openTime, closeTime: closed ? null : closeTime },
      create: { businessId, day, closed, openTime: closed ? null : openTime, closeTime: closed ? null : closeTime },
    })
  }

  revalidatePath(`/business/dashboard/businesses/${businessId}/edit`)
  revalidatePath(`/company/${biz.slug}`)
}

// ---------------------------------------------------------------- gallery

export async function addBusinessImages(formData: FormData) {
  const businessId = String(formData.get('businessId'))
  const biz = await ownedBusiness(businessId)
  if (!biz) return

  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0)
  if (!files.length) return

  const existing = await db.businessImage.count({ where: { businessId } })
  const paths = await saveImages(files, 'business', 8)
  if (paths.length) {
    await db.businessImage.createMany({
      data: paths.map((p, i) => ({ businessId, path: p, sort: existing + i })),
    })
  }
  revalidatePath(`/business/dashboard/businesses/${businessId}/edit`)
  revalidatePath(`/company/${biz.slug}`)
}

export async function deleteBusinessImage(formData: FormData) {
  const businessId = String(formData.get('businessId'))
  const imageId = Number(formData.get('imageId'))
  const biz = await ownedBusiness(businessId)
  if (!biz) return

  const img = await db.businessImage.findUnique({ where: { id: imageId } })
  if (!img || img.businessId !== businessId) return

  await db.businessImage.delete({ where: { id: imageId } })
  // best-effort remove the file from disk
  try {
    if (img.path.startsWith('/uploads/')) {
      await unlink(path.join(process.cwd(), 'public', img.path))
    }
  } catch {
    // file already gone — ignore
  }
  revalidatePath(`/business/dashboard/businesses/${businessId}/edit`)
  revalidatePath(`/company/${biz.slug}`)
}

// ---------------------------------------------------------------- reviews

/**
 * Owner-side moderation. A review sits at PENDING until the owner approves it
 * (LIVE) or rejects it (REMOVED) — rejections stay in the admin queue, so an
 * owner burying honest criticism is visible rather than silent. Once a review
 * has been decided, only an admin can move it again.
 */
export async function moderateReview(formData: FormData) {
  const id = String(formData.get('id'))
  const next = String(formData.get('status'))
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500)
  if (next !== 'LIVE' && next !== 'REMOVED') return

  const session = await auth()
  if (!session?.user) return
  const ownerId = (await actingOwnerId(session)) ?? session.user.id

  const review = await db.review.findUnique({
    where: { id },
    select: {
      status: true,
      businessId: true,
      images: { select: { path: true } },
      user: { select: { email: true } },
      business: { select: { ownerId: true, slug: true, name: true } },
    },
  })
  if (!review || review.business.ownerId !== ownerId) return
  if (review.status !== 'PENDING') return

  await db.review.update({
    where: { id },
    data: {
      status: next,
      moderatedAt: new Date(),
      rejectReason: next === 'REMOVED' ? reason || 'No reason given.' : null,
    },
  })

  // Every owner decision goes on the record. Admins can see who rejects what,
  // which is the only thing stopping an owner from quietly burying criticism.
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? '',
      action: next === 'LIVE' ? 'review.owner.approve' : 'review.owner.reject',
      entity: 'review',
      entityId: id,
      detail: next === 'REMOVED' ? reason || 'No reason given.' : null,
    },
  })

  // a rejected review's photos are never shown again — do not keep them
  if (next === 'REMOVED' && review.images.length) {
    await db.reviewImage.deleteMany({ where: { reviewId: id } })
    await deleteUploads(review.images.map((i) => i.path))
  }

  // a decision the reviewer never hears about is indistinguishable from silence
  await sendMail(
    reviewDecidedMail({
      to: review.user.email,
      businessName: review.business.name,
      approved: next === 'LIVE',
      reason: reason || null,
      slug: review.business.slug,
    }),
  )

  await recomputeRating(review.businessId)

  revalidatePath('/business/dashboard/reviews')
  revalidatePath('/business/dashboard')
  revalidatePath(`/company/${review.business.slug}`)
}

// ---------------------------------------------------------------- verification

export async function requestVerification(formData: FormData) {
  const businessId = String(formData.get('businessId'))
  const biz = await ownedBusiness(businessId)
  if (!biz || biz.verifiedAt) return

  await db.business.update({
    where: { id: businessId },
    data: { verifyRequestedAt: new Date() },
  })
  revalidatePath(`/business/dashboard/businesses/${businessId}/edit`)
}
