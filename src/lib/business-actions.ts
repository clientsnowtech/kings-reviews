'use server'

import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { db } from './db'
import { auth } from './auth'
import { saveImages } from './upload'

/** Returns the business only if the signed-in user owns it, else null. */
async function ownedBusiness(businessId: string) {
  const session = await auth()
  if (!session?.user) return null
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, slug: true, verifiedAt: true },
  })
  if (!biz || biz.ownerId !== session.user.id) return null
  return biz
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
