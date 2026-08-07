'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { BusinessStatus, ReviewStatus, ReportStatus, Role } from '@prisma/client'
import { db } from './db'
import { forgetBadgeBusiness } from './badge-server'
import { recomputeRating } from './rating'
import { forgetBlockedWords } from './moderation-db'
import { requireAdmin } from './admin'
import { recountCategories, categoryIdsOf } from './business'
import { sendMail, businessDecisionMail } from './mail'
import { setActingOwner, clearActingOwner } from './impersonation'
import { slugify, externalUrl } from './utils'
import { businessSchema } from './validations'
import { parseCsv, csvRecords, csvList } from './csv'

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
    select: {
      slug: true,
      name: true,
      categoryId: true,
      extraCategories: { select: { id: true } },
      owner: { select: { email: true } },
    },
  })
  forgetBadgeBusiness(biz.slug)
  await recountCategories([biz.categoryId, ...biz.extraCategories.map((c) => c.id)])

  // The owner cannot see this queue, so a decision that never reaches them
  // reads as a listing that silently vanished.
  if (biz.owner?.email) {
    await sendMail(
      businessDecisionMail({
        to: biz.owner.email,
        businessName: biz.name,
        status,
        slug: biz.slug,
      }),
    )
  }

  await logAudit(session, `business.${status.toLowerCase()}`, 'business', id)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')
}

/**
 * Whose account owns an admin-added listing.
 *
 * An existing account is reused (and promoted to BUSINESS), an unknown email
 * gets a passwordless account it can claim through Google sign-in, and a blank
 * email leaves the listing under the admin who added it.
 */
async function resolveOwnerId(ownerEmail: string, fallbackId: string): Promise<string> {
  if (!ownerEmail) return fallbackId

  const existing = await db.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, role: true },
  })
  if (existing) {
    if (existing.role === 'USER') {
      await db.user.update({ where: { id: existing.id }, data: { role: 'BUSINESS' } })
    }
    return existing.id
  }

  const created = await db.user.create({
    data: { email: ownerEmail, role: 'BUSINESS' },
    select: { id: true },
  })
  return created.id
}

/** A slug nobody is using yet — two "Sharma Motors" cannot share a URL. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = base
  for (let i = 2; await db.business.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`
  }
  return slug
}

/**
 * Create a listing from the admin panel.
 *
 * Businesses normally register themselves, so a listing always needs an owner —
 * the admin names one by email (see resolveOwnerId).
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

  const ownerId = await resolveOwnerId(str('ownerEmail').toLowerCase(), session.user.id)
  const slug = await uniqueSlug(name)

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

  // An admin-created listing skips the queue: the person adding it is the
  // person who would have approved it.
  await recountCategories([categoryId, ...extraIds(formData, categoryId)])

  await logAudit(session, 'business.create', 'business', business.id, name)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')
  redirect('/admin/businesses')
}

// ---------------------------------------------------------------- csv import

/** One upload, one request — a bigger sheet is split rather than timed out. */
const IMPORT_MAX_ROWS = 500
const IMPORT_MAX_BYTES = 2 * 1024 * 1024

export type ImportRowResult = {
  /** line in the uploaded file, so the admin can fix the row in Excel */
  line: number
  name: string
  outcome: 'created' | 'skipped' | 'error'
  message?: string
}

export type ImportState = {
  error?: string
  /** the run only validated — nothing was written */
  dryRun?: boolean
  created?: number
  skipped?: number
  failed?: number
  rows?: ImportRowResult[]
}

/**
 * Add many listings from one CSV.
 *
 * Onboarding a directory means typing hundreds of listings through the single
 * add form, so this takes the sheet the data already lives in. Every row is
 * judged on its own: a bad row is reported by line number and the rest still
 * land, because a 300-row upload that aborts on row 7 is worse than useless.
 * Categories are matched by name (or slug), and a listing whose name and city
 * already exist is skipped rather than duplicated — the same file gets
 * re-uploaded after a fix all the time.
 */
export async function adminImportBusinesses(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const session = await requireAdmin()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a CSV file first.' }
  if (file.size > IMPORT_MAX_BYTES) return { error: 'That file is over 2 MB — split it.' }

  const { records } = csvRecords(parseCsv(await file.text()))
  if (records.length === 0) return { error: 'No data rows found under the header.' }
  if (records.length > IMPORT_MAX_ROWS) {
    return { error: `Up to ${IMPORT_MAX_ROWS} rows per upload — this file has ${records.length}.` }
  }

  const dryRun = formData.get('dryRun') === 'on'
  const defaultStatus = formData.get('status') === 'PENDING' ? 'PENDING' : 'LIVE'

  // one lookup table for the whole file — a per-row query would be 500 queries
  const categories = await db.category.findMany({ select: { id: true, name: true, slug: true } })
  const byName = new Map<string, number>()
  for (const c of categories) {
    byName.set(c.name.toLowerCase(), c.id)
    byName.set(c.slug.toLowerCase(), c.id)
  }

  const rows: ImportRowResult[] = []
  const touched = new Set<number>()
  const owners = new Map<string, string>()
  const seen = new Set<string>()
  const audits: { action: string; entity: string; entityId: string; detail: string }[] = []

  for (const r of records) {
    const name = r.get('name', 'business name', 'business')
    const push = (outcome: ImportRowResult['outcome'], message?: string) =>
      rows.push({ line: r.line, name: name || '(unnamed)', outcome, message })

    if (!name) {
      push('error', 'Name is empty')
      continue
    }

    const categoryName = r.get('category', 'category name', 'primary category')
    const categoryId = byName.get(categoryName.toLowerCase())
    if (!categoryId) {
      push('error', categoryName ? `Unknown category "${categoryName}"` : 'Category is empty')
      continue
    }

    const status = (r.get('status') || defaultStatus).toUpperCase()
    if (status !== 'LIVE' && status !== 'PENDING') {
      push('error', `Status must be LIVE or PENDING, got "${status}"`)
      continue
    }

    const parsed = businessSchema.safeParse({
      name,
      categoryId,
      email: r.get('email', 'business email'),
      phone: r.get('phone', 'mobile', 'contact'),
      website: r.get('website', 'url'),
      whatsapp: r.get('whatsapp'),
      tagline: r.get('tagline'),
      description: r.get('description', 'about'),
      foundedYear: r.get('founded year', 'founded', 'year'),
      instagram: r.get('instagram'),
      facebook: r.get('facebook'),
      address: r.get('address'),
      city: r.get('city'),
      state: r.get('state'),
      pincode: r.get('pincode', 'pin', 'zip'),
      mapUrl: r.get('map url', 'map', 'google maps'),
    })
    if (!parsed.success) {
      push('error', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
      continue
    }
    const data = parsed.data

    // a re-upload after fixing a few rows must not double the ones that worked
    const key = `${name.toLowerCase()}|${data.city.toLowerCase()}`
    if (seen.has(key)) {
      push('skipped', 'Duplicate of an earlier row in this file')
      continue
    }
    seen.add(key)

    const clash = await db.business.findFirst({
      where: { name, city: data.city },
      select: { id: true },
    })
    if (clash) {
      push('skipped', `Already listed in ${data.city}`)
      continue
    }

    const extraIdsForRow = [
      ...new Set(
        csvList(r.get('extra categories', 'extra category', 'other categories'))
          .map((n) => byName.get(n.toLowerCase()))
          .filter((id): id is number => !!id && id !== categoryId),
      ),
    ]

    if (dryRun) {
      push('created', 'Valid')
      continue
    }

    const ownerEmail = r.get('owner email', 'owner').toLowerCase()
    let ownerId = owners.get(ownerEmail)
    if (!ownerId) {
      // one email may own several rows — resolve it once per file
      ownerId = await resolveOwnerId(ownerEmail, session.user.id)
      owners.set(ownerEmail, ownerId)
    }

    const business = await db.business.create({
      data: {
        ownerId,
        categoryId,
        slug: await uniqueSlug(name),
        name,
        email: data.email,
        phone: data.phone,
        website: data.website || null,
        whatsapp: data.whatsapp || null,
        tagline: data.tagline || null,
        description: data.description || null,
        foundedYear: data.foundedYear ?? null,
        instagram: data.instagram || null,
        facebook: data.facebook || null,
        address: data.address || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode || null,
        mapUrl: data.mapUrl || null,
        // listed by an admin, still not verified — verification has its own queue
        status: status as BusinessStatus,
        extraCategories: { connect: extraIdsForRow.map((id) => ({ id })) },
      },
      select: { id: true },
    })

    touched.add(categoryId)
    for (const id of extraIdsForRow) touched.add(id)
    audits.push({
      action: 'business.create',
      entity: 'business',
      entityId: business.id,
      detail: `${name} · CSV import (${file.name}, line ${r.line})`,
    })
    push('created')
  }

  if (!dryRun) {
    await recountCategories(touched)
    if (audits.length) {
      await db.auditLog.createMany({
        data: audits.map((a) => ({
          ...a,
          actorId: session.user.id,
          actorEmail: session.user.email ?? '',
        })),
      })
    }
    revalidatePath('/admin/businesses')
    revalidatePath('/admin')
    revalidatePath('/categories')
  }

  return {
    dryRun,
    created: rows.filter((r) => r.outcome === 'created').length,
    skipped: rows.filter((r) => r.outcome === 'skipped').length,
    failed: rows.filter((r) => r.outcome === 'error').length,
    rows,
  }
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
  const biz = await db.business.findUnique({ where: { id }, select: { name: true } })
  // capture the categories before the row (and its links) disappear
  const categoryIds = await categoryIdsOf(id)
  await db.business.delete({ where: { id } })
  await recountCategories(categoryIds)
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

  // the categories it sat under before this edit, primary and extras alike
  const before = await categoryIdsOf(id)
  if (before.length === 0) return

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

  // an edit can move the primary trade and rewrite the extras, so both the
  // categories it left and the ones it joined need a fresh count
  await recountCategories([...before, categoryId, ...extraIds(formData, categoryId)])
  await logAudit(session, 'business.edit', 'business', id)
  revalidatePath('/admin/businesses')
  redirect('/admin/businesses')
}

export async function bulkBusinessStatus(formData: FormData) {
  const session = await requireAdmin()
  const ids = formData.getAll('ids').map(String).filter(Boolean)
  const status = String(formData.get('bulkStatus')) as BusinessStatus
  if (!ids.length || !['PENDING', 'LIVE', 'REJECTED', 'SUSPENDED'].includes(status)) return

  const affected = await db.business.findMany({
    where: { id: { in: ids } },
    select: { categoryId: true, extraCategories: { select: { id: true } } },
  })
  await db.business.updateMany({
    where: { id: { in: ids } },
    data: { status, verifiedAt: status === 'LIVE' ? new Date() : null },
  })
  await recountCategories(
    affected.flatMap((b) => [b.categoryId, ...b.extraCategories.map((c) => c.id)]),
  )

  await logAudit(session, `business.bulk.${status.toLowerCase()}`, 'business', ids.join(','), `${ids.length} businesses`)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')
}

// ---------------------------------------------------------------- verification

export async function approveVerification(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  await db.business.update({
    where: { id },
    data: { verifiedAt: new Date(), verifyRequestedAt: null, status: 'LIVE' },
  })
  // verifying also approves, so a listing can enter LIVE through this door too
  await recountCategories(await categoryIdsOf(id))
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

// ---------------------------------------------------------------- blocklist

export async function addBlockedWord(formData: FormData) {
  const session = await requireAdmin()
  // one word or short phrase per row; the matcher already handles spacing and
  // leetspeak, so "chutiya" covers "ch.u.t.i.y.a" too
  const word = String(formData.get('word') ?? '').trim().toLowerCase().slice(0, 60)
  if (word.length < 2) return

  await db.blockedWord.upsert({ where: { word }, update: {}, create: { word } })
  forgetBlockedWords()
  await logAudit(session, 'word.add', 'word', word)
  revalidatePath('/admin/words')
}

export async function deleteBlockedWord(formData: FormData) {
  const session = await requireAdmin()
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const row = await db.blockedWord.delete({ where: { id } }).catch(() => null)
  if (!row) return
  forgetBlockedWords()
  await logAudit(session, 'word.delete', 'word', row.word)
  revalidatePath('/admin/words')
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
