'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import type { BusinessStatus, ReviewStatus, ReportStatus, Role } from '@prisma/client'
import { db } from './db'
import { forgetBadgeBusiness } from './badge-server'
import { requireAdmin } from './admin'
import { setActingOwner, clearActingOwner } from './impersonation'
import { slugify, externalUrl } from './utils'

type Session = Awaited<ReturnType<typeof requireAdmin>>

// ---------------------------------------------------------------- audit

async function logAudit(
  session: Session,
  action: string,
  entity: string,
  entityId: string,
  detail?: string,
) {
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? '',
      action,
      entity,
      entityId,
      detail: detail ?? null,
    },
  })
}

// ---------------------------------------------------------------- businesses

/** Secondary category ids from a form, deduped and minus the primary one. */
function extraIds(formData: FormData, primaryId: number): number[] {
  const ids = formData
    .getAll('extraCategoryIds')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0 && n !== primaryId)
  return [...new Set(ids)]
}

export async function setBusinessStatus(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const status = String(formData.get('status')) as BusinessStatus
  if (!['PENDING', 'LIVE', 'REJECTED', 'SUSPENDED'].includes(status)) return

  // approving a listing is not verifying it — verification has its own queue,
  // and the badge shows a verification tick only for that
  const biz = await db.business.update({
    where: { id },
    data: { status, ...(status === 'LIVE' ? {} : { verifiedAt: null }) },
    select: { slug: true },
  })
  forgetBadgeBusiness(biz.slug)
  await logAudit(session, `business.${status.toLowerCase()}`, 'business', id)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
}

/**
 * Create a listing from the admin panel.
 *
 * Businesses normally register themselves, so a listing always needs an owner.
 * The admin names one by email: an existing account is reused (and promoted to
 * BUSINESS), an unknown email gets a passwordless account it can claim through
 * Google sign-in, and a blank field leaves the listing under the admin.
 */
export async function adminCreateBusiness(formData: FormData) {
  const session = await requireAdmin()

  const str = (key: string) => String(formData.get(key) ?? '').trim()
  const name = str('name')
  const categoryId = Number(formData.get('categoryId'))
  const email = str('email')
  const phone = str('phone')
  const city = str('city')
  const state = str('state')
  const status = str('status') as BusinessStatus

  if (name.length < 2 || !categoryId || !email || !phone || !city || !state) return
  if (!['PENDING', 'LIVE'].includes(status)) return

  const ownerEmail = str('ownerEmail').toLowerCase()
  let ownerId = session.user.id
  if (ownerEmail) {
    const existing = await db.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true, role: true },
    })
    if (existing) {
      ownerId = existing.id
      if (existing.role === 'USER') {
        await db.user.update({ where: { id: existing.id }, data: { role: 'BUSINESS' } })
      }
    } else {
      const created = await db.user.create({
        data: { email: ownerEmail, role: 'BUSINESS' },
        select: { id: true },
      })
      ownerId = created.id
    }
  }

  const base = slugify(name)
  let slug = base
  for (let i = 2; await db.business.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`
  }

  const business = await db.business.create({
    data: {
      ownerId,
      categoryId,
      slug,
      name,
      email,
      phone,
      city,
      state,
      website: str('website') || null,
      description: str('description') || null,
      // added by an admin, but still not verified — verification has its own queue
      status,
      extraCategories: { connect: extraIds(formData, categoryId).map((id) => ({ id })) },
    },
    select: { id: true },
  })

  await db.category.update({ where: { id: categoryId }, data: { listingCount: { increment: 1 } } })

  await logAudit(session, 'business.create', 'business', business.id, name)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')
  redirect('/admin/businesses')
}

/**
 * Open a business's own dashboard as its owner.
 *
 * Support work otherwise means asking an owner for their password, or an admin
 * editing through a second set of screens that drift from what owners see. The
 * switch is recorded in the audit log because acting as someone else should
 * never be invisible.
 */
export async function actAsOwner(formData: FormData) {
  const session = await requireAdmin()
  const businessId = String(formData.get('businessId'))

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true, name: true },
  })
  if (!business) return

  await setActingOwner(business.ownerId)
  await logAudit(session, 'owner.act_as', 'business', businessId, business.name)
  redirect('/business/dashboard/businesses')
}

/** Drop back to the admin's own account. */
export async function stopActingAsOwner() {
  await requireAdmin()
  await clearActingOwner()
  redirect('/admin/businesses')
}

/** Revoke or restore a business's embeddable badge. */
export async function setBadgeEnabled(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const enabled = String(formData.get('enabled')) === '1'

  const biz = await db.business.update({
    where: { id },
    data: { badgeEnabled: enabled },
    select: { slug: true },
  })
  forgetBadgeBusiness(biz.slug)
  await logAudit(
    session,
    enabled ? 'business.badge.restore' : 'business.badge.revoke',
    'business',
    id,
  )
  revalidatePath('/admin/businesses')
}

export async function deleteBusiness(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const biz = await db.business.findUnique({ where: { id }, select: { categoryId: true, name: true } })
  await db.business.delete({ where: { id } })
  if (biz) {
    await db.category.update({
      where: { id: biz.categoryId },
      data: { listingCount: { decrement: 1 } },
    })
  }
  await logAudit(session, 'business.delete', 'business', id, biz?.name)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
}

export async function adminUpdateBusiness(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const categoryId = Number(formData.get('categoryId'))
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  // admin form has no zod pass — normalise so "example.com" never becomes a
  // relative link on the public profile
  const website = externalUrl(String(formData.get('website') ?? ''))
  const city = String(formData.get('city') ?? '').trim()
  const state = String(formData.get('state') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  if (!name || !email || !city || !state || !Number.isFinite(categoryId)) return

  const current = await db.business.findUnique({ where: { id }, select: { categoryId: true } })
  if (!current) return

  await db.business.update({
    where: { id },
    data: {
      name,
      categoryId,
      email,
      phone,
      website,
      city,
      state,
      description: description || null,
      extraCategories: { set: extraIds(formData, categoryId).map((cid) => ({ id: cid })) },
    },
  })

  // keep category listing counts correct if it moved
  if (current.categoryId !== categoryId) {
    await db.category.update({ where: { id: current.categoryId }, data: { listingCount: { decrement: 1 } } })
    await db.category.update({ where: { id: categoryId }, data: { listingCount: { increment: 1 } } })
  }
  await logAudit(session, 'business.edit', 'business', id)
  revalidatePath('/admin/businesses')
  redirect('/admin/businesses')
}

export async function bulkBusinessStatus(formData: FormData) {
  const session = await requireAdmin()
  const ids = formData.getAll('ids').map(String).filter(Boolean)
  const status = String(formData.get('bulkStatus')) as BusinessStatus
  if (!ids.length || !['PENDING', 'LIVE', 'REJECTED', 'SUSPENDED'].includes(status)) return

  await db.business.updateMany({
    where: { id: { in: ids } },
    data: { status, verifiedAt: status === 'LIVE' ? new Date() : null },
  })
  await logAudit(session, `business.bulk.${status.toLowerCase()}`, 'business', ids.join(','), `${ids.length} businesses`)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------- verification

export async function approveVerification(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  await db.business.update({
    where: { id },
    data: { verifiedAt: new Date(), verifyRequestedAt: null, status: 'LIVE' },
  })
  await logAudit(session, 'business.verify', 'business', id)
  revalidatePath('/admin/verifications')
  revalidatePath('/admin')
}

export async function rejectVerification(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  await db.business.update({ where: { id }, data: { verifyRequestedAt: null } })
  await logAudit(session, 'business.verify.reject', 'business', id)
  revalidatePath('/admin/verifications')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------- reviews

async function recomputeRating(businessId: string) {
  const rows = await db.review.groupBy({
    by: ['rating'],
    where: { businessId, status: 'LIVE' },
    _count: { rating: true },
  })
  const hist = [0, 0, 0, 0, 0]
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

export async function setReviewStatus(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const status = String(formData.get('status')) as ReviewStatus
  if (!['LIVE', 'PENDING', 'REMOVED'].includes(status)) return

  const review = await db.review.update({
    where: { id },
    data: { status },
    select: { businessId: true },
  })
  await recomputeRating(review.businessId)
  await logAudit(session, `review.${status.toLowerCase()}`, 'review', id)
  revalidatePath('/admin/reviews')
  revalidatePath('/admin')
}

export async function deleteReview(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const review = await db.review.delete({ where: { id }, select: { businessId: true } })
  await recomputeRating(review.businessId)
  await logAudit(session, 'review.delete', 'review', id)
  revalidatePath('/admin/reviews')
  revalidatePath('/admin')
}

export async function bulkReviewStatus(formData: FormData) {
  const session = await requireAdmin()
  const ids = formData.getAll('ids').map(String).filter(Boolean)
  const status = String(formData.get('bulkStatus')) as ReviewStatus
  if (!ids.length || !['LIVE', 'PENDING', 'REMOVED'].includes(status)) return

  const affected = await db.review.findMany({ where: { id: { in: ids } }, select: { businessId: true } })
  await db.review.updateMany({ where: { id: { in: ids } }, data: { status } })
  const businessIds = [...new Set(affected.map((r) => r.businessId))]
  for (const bId of businessIds) await recomputeRating(bId)
  await logAudit(session, `review.bulk.${status.toLowerCase()}`, 'review', ids.join(','), `${ids.length} reviews`)
  revalidatePath('/admin/reviews')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------- reports

export async function setReportStatus(formData: FormData) {
  const session = await requireAdmin()
  const id = Number(formData.get('id'))
  const status = String(formData.get('status')) as ReportStatus
  if (!['OPEN', 'RESOLVED', 'DISMISSED'].includes(status)) return

  await db.reviewReport.update({ where: { id }, data: { status } })
  await logAudit(session, `report.${status.toLowerCase()}`, 'report', String(id))
  revalidatePath('/admin/reports')
  revalidatePath('/admin')
}

/** Remove the reported review and mark its report resolved in one step. */
export async function resolveReportRemoveReview(formData: FormData) {
  const session = await requireAdmin()
  const id = Number(formData.get('id'))
  const report = await db.reviewReport.findUnique({ where: { id }, select: { reviewId: true } })
  if (!report) return

  const review = await db.review.update({
    where: { id: report.reviewId },
    data: { status: 'REMOVED' },
    select: { businessId: true },
  })
  await recomputeRating(review.businessId)
  await db.reviewReport.update({ where: { id }, data: { status: 'RESOLVED' } })
  await logAudit(session, 'report.remove_review', 'report', String(id), report.reviewId)
  revalidatePath('/admin/reports')
  revalidatePath('/admin/reviews')
  revalidatePath('/admin')
}

// ---------------------------------------------------------------- users

export async function setUserRole(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const role = String(formData.get('role')) as Role
  if (!['USER', 'BUSINESS', 'ADMIN'].includes(role)) return
  if (id === session.user.id) return // don't let an admin change their own role

  await db.user.update({ where: { id }, data: { role } })
  await logAudit(session, 'user.role', 'user', id, role)
  revalidatePath('/admin/users')
}

// ---------------------------------------------------------------- categories

export async function createCategory(formData: FormData) {
  const session = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const icon = String(formData.get('icon') ?? '').trim()
  if (name.length < 2) return

  const base = slugify(name)
  let slug = base
  for (let i = 2; await db.category.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`
  }

  const cat = await db.category.create({ data: { name, slug, icon: icon || null } })
  await logAudit(session, 'category.create', 'category', String(cat.id), name)
  revalidatePath('/admin/categories')
  revalidatePath('/categories')
}

export async function updateCategory(formData: FormData) {
  const session = await requireAdmin()
  const id = Number(formData.get('id'))
  const name = String(formData.get('name') ?? '').trim()
  const icon = String(formData.get('icon') ?? '').trim()
  const sort = Number(formData.get('sort') ?? 0)
  if (name.length < 2) return

  await db.category.update({
    where: { id },
    data: { name, icon: icon || null, sort: Number.isFinite(sort) ? sort : 0 },
  })
  await logAudit(session, 'category.edit', 'category', String(id), name)
  revalidatePath('/admin/categories')
  revalidatePath('/categories')
}

export async function deleteCategory(formData: FormData) {
  const session = await requireAdmin()
  const id = Number(formData.get('id'))
  const count = await db.business.count({ where: { categoryId: id } })
  if (count > 0) return // block deleting a category that still has listings
  await db.category.delete({ where: { id } })
  await logAudit(session, 'category.delete', 'category', String(id))
  revalidatePath('/admin/categories')
  revalidatePath('/categories')
}
