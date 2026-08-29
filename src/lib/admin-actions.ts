'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { BusinessStatus, Prisma, ReviewStatus, ReportStatus, Role } from '@prisma/client'
import { db } from './db'
import { forgetBadgeBusiness } from './badge-server'
import { recomputeRating } from './rating'
import { forgetBlockedWords } from './moderation-db'
import { requireAdmin } from './admin'
import {
  recountCategories,
  categoryIdsOf,
  findDuplicateBusiness,
  duplicateMessage,
} from './business'
import { forgetCities } from './cities'
import { sendMail, businessDecisionMail, businessClaimMail } from './mail'
import {
  welcomeOwner,
  welcomeOwnerOfBusiness,
  welcomeCandidates,
  pendingWelcomeOwners,
} from './owner-welcome'
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
      addedByAdmin: true,
      extraCategories: { select: { id: true } },
      owner: { select: { email: true } },
    },
  })
  forgetBadgeBusiness(biz.slug)
  // going live can be the first listing in its city, or the last one out of it
  forgetCities()
  await recountCategories([biz.categoryId, ...biz.extraCategories.map((c) => c.id)])

  // The owner cannot see this queue, so a decision that never reaches them
  // reads as a listing that silently vanished.
  //
  // Going live is also the moment an admin-added owner first has something to
  // manage, so they get the welcome with its set-password link instead — it
  // carries the same "you are live" news plus the only way into the account.
  //
  // An owner who listed their own shop is told nothing of the sort: they signed
  // up themselves and are already logged in, so a "set your password" mail
  // about their own listing reads as somebody else's account.
  const welcomed =
    status === 'LIVE' &&
    biz.addedByAdmin &&
    (await welcomeOwnerOfBusiness(id, { force: true })) === 'sent'

  if (biz.owner?.email && !welcomed) {
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
 * An existing account is reused (and promoted to BUSINESS), and an unknown
 * email gets a passwordless account it can claim through Google sign-in. The
 * admin is never the owner — a listing belongs to the business it describes —
 * so when no owner email is named the caller passes the business's own email.
 */
async function resolveOwnerId(ownerEmail: string): Promise<{ id: string; created: boolean }> {
  const existing = await db.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, role: true },
  })
  if (existing) {
    if (existing.role === 'USER') {
      await db.user.update({ where: { id: existing.id }, data: { role: 'BUSINESS' } })
    }
    return { id: existing.id, created: false }
  }

  const created = await db.user.create({
    data: { email: ownerEmail, role: 'BUSINESS' },
    select: { id: true },
  })
  // the caller announces it — an account nobody hears about is never claimed
  return { id: created.id, created: true }
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
 * the admin names one by email, and leaving that blank hands the listing to the
 * business's own email rather than to the admin (see resolveOwnerId).
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

  // Same rule as the public form: the shop may already be here under an owner
  // who listed it themselves. The admin is sent back with the match named, not
  // left to discover two half-filled profiles later.
  const dup = await findDuplicateBusiness({ name, city, phone })
  if (dup) {
    redirect(
      `/admin/businesses/new?duplicate=${encodeURIComponent(duplicateMessage(dup))}&slug=${dup.slug}`,
    )
  }

  // no owner named? the listing goes to the business's own inbox, never to the
  // admin who typed it in
  const ownerEmail = str('ownerEmail').toLowerCase() || email.toLowerCase()
  const owner = await resolveOwnerId(ownerEmail)
  const ownerId = owner.id
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
      website: externalUrl(str('website')),
      whatsapp: str('whatsapp') || null,
      mapUrl: externalUrl(str('mapUrl')),
      description: str('description') || null,
      // the named person we deal with — stored, never published
      contactName: str('contactName') || null,
      contactRole: str('contactRole') || null,
      contactEmail: str('contactEmail') || null,
      contactPhone: str('contactPhone') || null,
      // added by an admin, but still not verified — verification has its own queue
      status,
      addedByAdmin: true,
      extraCategories: { connect: extraIds(formData, categoryId).map((id) => ({ id })) },
    },
    select: { id: true },
  })

  // An admin-created listing skips the queue: the person adding it is the
  // person who would have approved it.
  await recountCategories([categoryId, ...extraIds(formData, categoryId)])

  // Live from the first second means the owner can be told the whole story now:
  // the page is up, and here is the link that lets them into the account. A
  // listing parked in the queue has nothing to show yet, so it keeps the older
  // claim note instead.
  const welcomed =
    status === 'LIVE' && (await welcomeOwnerOfBusiness(business.id, { force: true })) === 'sent'

  if (owner.created && !welcomed) {
    await sendMail(businessClaimMail({ to: ownerEmail, businessName: name, city, slug }))
  }

  await logAudit(session, 'business.create', 'business', business.id, name)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')
  redirect('/admin/businesses')
}

// ---------------------------------------------------------------- csv import

/** rows per INSERT — one 100 000-row statement overruns max_allowed_packet */
const IMPORT_CHUNK = 500
/** created rows listed back by name; the rest are only counted */
const IMPORT_LISTED_OK = 50
/**
 * Problem rows listed back.
 *
 * There is no row cap on the upload any more, so a sheet with the wrong header
 * fails every one of its rows — and the result travels to the browser as one
 * server-action payload. The first few hundred say what is wrong just as well
 * as a hundred thousand would.
 */
const IMPORT_LISTED_BAD = 200

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
  /** tags every row this run created, so the whole batch can be undone */
  importId?: string
  /** set once the batch has been rolled back */
  undone?: boolean
  /** `rows` lists every problem but only the first few successes */
  truncated?: boolean
}

/** Last ten digits — the same line written +91 98765 43210 or 09876543210. */
function importPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : ''
}

/**
 * Add many listings from one CSV.
 *
 * Onboarding a directory means typing hundreds of listings through the single
 * add form, so this takes the sheet the data already lives in. Every row is
 * judged on its own: a bad row is reported by line number and the rest still
 * land, because a 300-row upload that aborts on row 7 is worse than useless.
 * Categories are matched by name (or slug), and a row that duplicates an
 * existing listing — same name in the same city, or the same phone number —
 * is skipped rather than added twice, because the same file gets re-uploaded
 * after a fix all the time. Rows that repeat each other inside one file are
 * caught the same way.
 *
 * A directory is seeded from sheets of tens of thousands of rows, so nothing
 * here runs per row against the database: the duplicate index and the taken
 * slugs are read once up front and kept in memory, and the listings go in as
 * chunked inserts. Doing it a row at a time was three round-trips each, and
 * the host times out long before a sheet this size finishes.
 */
export async function adminImportBusinesses(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const session = await requireAdmin()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a CSV file first.' }

  // No row or size cap: a directory is seeded from one sheet of a hundred
  // thousand listings, and splitting that by hand is the whole problem. What
  // does bound it is the host — the file is parsed in memory and the request
  // has to survive the insert, so a sheet big enough to run either of those out
  // fails as a timeout. If that happens, the fix is a smaller file, not a
  // retry. `serverActions.bodySizeLimit` in next.config.ts caps the upload.
  const { records } = csvRecords(parseCsv(await file.text()))
  if (records.length === 0) return { error: 'No data rows found under the header.' }

  const dryRun = formData.get('dryRun') === 'on'
  const defaultStatus = formData.get('status') === 'PENDING' ? 'PENDING' : 'LIVE'

  // one lookup table for the whole file — a per-row query would be 500 queries
  const categories = await db.category.findMany({ select: { id: true, name: true, slug: true } })
  const byName = new Map<string, number>()
  for (const c of categories) {
    byName.set(c.name.toLowerCase(), c.id)
    byName.set(c.slug.toLowerCase(), c.id)
  }

  // The whole duplicate test, read once. Two listings are the same shop when
  // they share a phone number, or a name inside one city — see
  // findDuplicateBusiness, which this mirrors row-for-row.
  const existing = await db.business.findMany({
    select: { name: true, slug: true, city: true, phone: true },
  })
  const takenSlugs = new Set(existing.map((b) => b.slug))
  type Match = { name: string; city: string; fresh: boolean }
  const byNameCity = new Map<string, Match>()
  const byPhone = new Map<string, Match>()
  for (const b of existing) {
    const match: Match = { name: b.name, city: b.city, fresh: false }
    byNameCity.set(`${slugify(b.name)}|${b.city.trim().toLowerCase()}`, match)
    const key = importPhoneKey(b.phone)
    if (key) byPhone.set(key, match)
  }

  /** A slug nobody has taken — including rows earlier in this same file. */
  const claimSlug = (name: string) => {
    const base = slugify(name) || 'listing'
    let slug = base
    for (let i = 2; takenSlugs.has(slug); i++) slug = `${base}-${i}`
    takenSlugs.add(slug)
    return slug
  }

  const rows: ImportRowResult[] = []
  const touched = new Set<number>()
  const owners = new Map<string, string>()
  const audits: { action: string; entity: string; entityId: string; detail: string }[] = []
  const pending: Prisma.BusinessCreateManyInput[] = []
  const withExtras: { id: string; extras: number[] }[] = []
  let created = 0
  let skipped = 0
  let failed = 0
  let listedOk = 0
  let listedBad = 0
  // one id for the whole run — a sheet that turns out wrong is undone in a click
  const importId = crypto.randomUUID()
  // told after the loop: 500 SMTP round-trips mid-import would stall the request
  const claims: { to: string; businessName: string; city: string; slug: string }[] = []

  for (const r of records) {
    const name = r.get('name', 'business name', 'business')
    const push = (outcome: ImportRowResult['outcome'], message?: string) => {
      if (outcome === 'created') {
        created++
        if (listedOk >= IMPORT_LISTED_OK) return
        listedOk++
      } else {
        if (outcome === 'skipped') skipped++
        else failed++
        if (listedBad >= IMPORT_LISTED_BAD) return
        listedBad++
      }
      rows.push({ line: r.line, name: name || '(unnamed)', outcome, message })
    }

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
      // the person behind the listing, kept off the public profile
      contactName: r.get('contact name', 'contact person'),
      contactRole: r.get('contact role', 'designation'),
      contactEmail: r.get('contact email'),
      contactPhone: r.get('contact phone', 'contact mobile'),
    })
    if (!parsed.success) {
      push('error', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
      continue
    }
    const data = parsed.data

    // a re-upload after fixing a few rows must not double the ones that worked
    const key = `${slugify(name)}|${data.city.trim().toLowerCase()}`
    const phoneKey = importPhoneKey(data.phone)
    const clash = (phoneKey && byPhone.get(phoneKey)) || byNameCity.get(key)
    if (clash) {
      const reason = phoneKey && byPhone.get(phoneKey) ? 'phone' : 'name'
      push(
        'skipped',
        clash.fresh
          ? 'Duplicate of an earlier row in this file'
          : duplicateMessage({ id: '', slug: '', name: clash.name, city: clash.city, reason }),
      )
      continue
    }
    const mine: Match = { name, city: data.city, fresh: true }
    byNameCity.set(key, mine)
    if (phoneKey) byPhone.set(phoneKey, mine)

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

    // a sheet rarely carries an owner column; without one the listing belongs to
    // the address printed on it, not to the admin who uploaded the file
    const ownerEmail = r.get('owner email', 'owner').toLowerCase() || data.email.toLowerCase()
    let ownerId = owners.get(ownerEmail)
    let ownerIsNew = false
    if (!ownerId) {
      // one email may own several rows — resolve it once per file
      const owner = await resolveOwnerId(ownerEmail)
      ownerId = owner.id
      ownerIsNew = owner.created
      owners.set(ownerEmail, ownerId)
    }

    // the id is minted here rather than by the database, because a chunked
    // insert gives nothing back to hang the audit entry on
    const id = crypto.randomUUID()
    const slug = claimSlug(name)
    pending.push({
      id,
      ownerId,
      categoryId,
      importId,
      slug,
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
      contactName: data.contactName || null,
      contactRole: data.contactRole || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      // listed by an admin, still not verified — verification has its own queue
      status: status as BusinessStatus,
      addedByAdmin: true,
    })
    // createMany cannot touch a relation table, so the extras are linked after
    if (extraIdsForRow.length) withExtras.push({ id, extras: extraIdsForRow })

    touched.add(categoryId)
    for (const extraId of extraIdsForRow) touched.add(extraId)
    if (ownerIsNew) claims.push({ to: ownerEmail, businessName: name, city: data.city, slug })
    audits.push({
      action: 'business.create',
      entity: 'business',
      entityId: id,
      detail: `${name} · CSV import (${file.name}, line ${r.line})`,
    })
    push('created')
  }

  if (!dryRun) {
    for (let i = 0; i < pending.length; i += IMPORT_CHUNK) {
      await db.business.createMany({ data: pending.slice(i, i + IMPORT_CHUNK) })
    }
    for (const row of withExtras) {
      await db.business.update({
        where: { id: row.id },
        data: { extraCategories: { connect: row.extras.map((id) => ({ id })) } },
      })
    }

    // a sheet of a hundred thousand rows brings cities the list has never seen
    forgetCities()
    await recountCategories(touched)
    for (let i = 0; i < audits.length; i += IMPORT_CHUNK) {
      await db.auditLog.createMany({
        data: audits.slice(i, i + IMPORT_CHUNK).map((a) => ({
          ...a,
          actorId: session.user.id,
          actorEmail: session.user.email ?? '',
        })),
      })
    }
    // Same rule as a single admin-added listing: a row that landed live gets
    // the welcome with its set-password link, and only a row still in the queue
    // falls back to the plain claim note.
    for (const claim of claims) {
      if ((await welcomeOwner(claim.to, { force: true })) !== 'sent') {
        await sendMail(businessClaimMail(claim))
      }
    }

    revalidatePath('/admin/businesses')
    revalidatePath('/admin')
    revalidatePath('/categories')
  }

  return {
    dryRun,
    created,
    skipped,
    failed,
    rows,
    truncated: created > listedOk || skipped + failed > listedBad,
    importId: !dryRun && created > 0 ? importId : undefined,
  }
}

/**
 * Delete every listing one import created.
 *
 * A 300-row sheet with the wrong category or the wrong city is noticed after
 * the upload, not before, and undoing it by hand means 300 delete clicks. Only
 * rows carrying this run's id go, so anything edited or added since survives.
 */
export async function undoBusinessImport(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const session = await requireAdmin()

  const importId = String(formData.get('importId') ?? '')
  if (!importId) return { error: 'Nothing to undo.' }

  const doomed = await db.business.findMany({
    where: { importId },
    select: { id: true, name: true, slug: true, categoryId: true, extraCategories: { select: { id: true } } },
  })
  if (doomed.length === 0) return { error: 'That import has already been undone.' }

  await db.business.deleteMany({ where: { importId } })

  for (const b of doomed) forgetBadgeBusiness(b.slug)
  await recountCategories(doomed.flatMap((b) => [b.categoryId, ...b.extraCategories.map((c) => c.id)]))

  await logAudit(
    session,
    'business.import_undo',
    'business',
    importId,
    `${doomed.length} listing(s) removed`,
  )
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')

  return { undone: true, created: doomed.length }
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
  forgetCities()
  await recountCategories(categoryIds)
  await logAudit(session, 'business.delete', 'business', id, biz?.name)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
}

/**
 * Rename a listing.
 *
 * Everything else about a profile — categories, links, hours, pictures — is now
 * edited through the owner's own form, which the admin panel embeds. The name
 * stays here because owners cannot change theirs: a listing that renames itself
 * keeps the reviews of the business it used to be.
 */
export async function adminRenameBusiness(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return

  const current = await db.business.findUnique({
    where: { id },
    select: { name: true, city: true, phone: true },
  })
  if (!current || current.name === name) return

  // a rename must not walk this listing on top of another one
  const dup = await findDuplicateBusiness({
    name,
    city: current.city,
    phone: current.phone,
    excludeId: id,
  })
  if (dup) {
    redirect(
      `/admin/businesses/${id}/edit?duplicate=${encodeURIComponent(duplicateMessage(dup))}&slug=${dup.slug}`,
    )
  }

  await db.business.update({ where: { id }, data: { name } })

  await logAudit(session, 'business.rename', 'business', id, `${current.name} → ${name}`)
  revalidatePath('/admin/businesses')
  revalidatePath(`/admin/businesses/${id}/edit`)
}

export async function bulkBusinessStatus(formData: FormData) {
  const session = await requireAdmin()
  const ids = formData.getAll('ids').map(String).filter(Boolean)
  const status = String(formData.get('bulkStatus')) as BusinessStatus
  if (!ids.length || !['PENDING', 'LIVE', 'REJECTED', 'SUSPENDED'].includes(status)) return

  const affected = await db.business.findMany({
    where: { id: { in: ids } },
    select: {
      categoryId: true,
      addedByAdmin: true,
      extraCategories: { select: { id: true } },
      owner: { select: { email: true } },
    },
  })
  await db.business.updateMany({
    where: { id: { in: ids } },
    data: { status, verifiedAt: status === 'LIVE' ? new Date() : null },
  })
  forgetCities()
  await recountCategories(
    affected.flatMap((b) => [b.categoryId, ...b.extraCategories.map((c) => c.id)]),
  )

  // Approving a screenful at a time is how a CSV import gets published, so the
  // welcome has to go from here too — deduped, because one owner can hold
  // several of the listings in the selection, and only for the listings an
  // admin put there. Owners who listed their own shop are not in this mail's
  // audience at all.
  if (status === 'LIVE') {
    const addressees = affected.filter((b) => b.addedByAdmin).map((b) => b.owner?.email)
    for (const email of new Set(addressees.filter(Boolean) as string[])) {
      await welcomeOwner(email, { force: true })
    }
  }

  await logAudit(session, `business.bulk.${status.toLowerCase()}`, 'business', ids.join(','), `${ids.length} businesses`)
  revalidatePath('/admin/businesses')
  revalidatePath('/admin')
  revalidatePath('/categories')
}

// ---------------------------------------------------------------- verification

export async function approveVerification(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get('id'))
  const biz = await db.business.update({
    where: { id },
    data: { verifiedAt: new Date(), verifyRequestedAt: null, status: 'LIVE' },
    select: { slug: true },
  })
  // the badge only serves for verified listings, so the memo has to be dropped
  // or the 404 keeps being served for up to a minute after approval
  forgetBadgeBusiness(biz.slug)
  // verifying also approves, so a listing can enter LIVE through this door too
  await recountCategories(await categoryIdsOf(id))
  await logAudit(session, 'business.verify', 'business', id)
  revalidatePath('/admin/verifications')
  revalidatePath('/admin')
  revalidatePath(`/company/${biz.slug}`)
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

/**
 * How many owners a single click may mail.
 *
 * One SMTP handshake per owner, run one after the other so the host's relay is
 * not hit with a burst — a few hundred of those outlive any request timeout, so
 * the run is capped and the page says how many are left.
 */
const WELCOME_BATCH = 100

/**
 * The welcome mail for owners of listings they did not add themselves.
 *
 * Only accounts with no password get one: those are the ones locked out, since
 * the login form needs a password and the register form refuses an email that
 * already exists. Owners who have a password can already log in, and an
 * unasked-for password link is not something to send them.
 *
 * Anyone already holding a live link is skipped, so pressing the button twice
 * does not mail the same owner twice — `resend` overrides that for a run whose
 * mail server was down.
 */
export async function sendOwnerWelcomeEmails(formData: FormData) {
  const session = await requireAdmin()
  const resend = String(formData.get('resend')) === '1'

  // The queue is the accounts never mailed at all — the stamp outlives the
  // link, so an owner welcomed a month ago stays out of it. A resend run wants
  // them back, so it takes the unfiltered list.
  const waiting = resend ? await welcomeCandidates(true) : await pendingWelcomeOwners()
  const batch = waiting.slice(0, WELCOME_BATCH)

  let sent = 0
  let failed = 0
  for (const email of batch) {
    const outcome = await welcomeOwner(email, { force: resend })
    if (outcome === 'sent') sent++
    else if (outcome === 'failed') failed++
  }

  const left = waiting.length - batch.length + failed
  await logAudit(
    session,
    'owner.welcome',
    'user',
    '—',
    `sent ${sent}, failed ${failed}, left ${left}`,
  )

  redirect(`/admin/users?welcome=${sent}.${failed}.${left}`)
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
