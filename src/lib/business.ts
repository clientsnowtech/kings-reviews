import { redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from './db'
import { actingOwnerId } from './impersonation'
import { slugify } from './utils'

/**
 * Guard for the business panel. Redirects anonymous users to login.
 * Any signed-in user may reach the panel; owning zero businesses is fine
 * (the panel prompts them to list one).
 */
export async function requireUser(next = '/business/dashboard') {
  const session = await auth()
  if (!session?.user) redirect(`/login?next=${encodeURIComponent(next)}`)
  return session
}

/**
 * Whose businesses this request is about.
 *
 * Normally the signed-in user's own. An admin who has picked a business to work
 * on sees that owner's panel instead, so support can fix a listing without
 * asking anyone for their password.
 */
export async function requireOwner(next = '/business/dashboard') {
  const session = await requireUser(next)
  const actingAs = await actingOwnerId(session)
  return { session, ownerId: actingAs ?? session.user.id, actingAs }
}

/**
 * Rewrite a category's listing count from what is actually live.
 *
 * The count drives the category cards and their ordering, and listings now move
 * in and out of LIVE as admins approve, reject or suspend them — an increment
 * per event drifts the moment one path forgets to fire, so we recount instead.
 */
export async function recountCategory(categoryId: number | null | undefined): Promise<void> {
  if (!categoryId) return
  const listingCount = await db.business.count({
    where: {
      status: 'LIVE',
      // A listing is filed under one primary trade and any number of extra
      // ones, and the category page shows all of them — so the count has to
      // agree with the page, not just with the primary column.
      OR: [{ categoryId }, { extraCategories: { some: { id: categoryId } } }],
    },
  })
  await db.category.update({ where: { id: categoryId }, data: { listingCount } })
}

/** Recount several categories at once, ignoring blanks and duplicates. */
export async function recountCategories(
  ids: Iterable<number | null | undefined>,
): Promise<void> {
  for (const id of new Set([...ids].filter(Boolean))) {
    await recountCategory(id)
  }
}

/** Every category a listing appears under — primary first, then the extras. */
export async function categoryIdsOf(businessId: string): Promise<number[]> {
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { categoryId: true, extraCategories: { select: { id: true } } },
  })
  return biz ? [biz.categoryId, ...biz.extraCategories.map((c) => c.id)] : []
}

// ---------------------------------------------------------------- duplicates

export type DuplicateMatch = {
  id: string
  name: string
  slug: string
  city: string
  /** what gave it away, so the message can say why */
  reason: 'name' | 'phone'
}

/** Last ten digits — the same line written +91 98765 43210 or 09876543210. */
function phoneKey(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : ''
}

/**
 * The listing this one would duplicate, or null.
 *
 * The same shop gets submitted twice all the time — the owner double-clicks,
 * re-sends the form after a slow save, or an admin re-uploads a fixed CSV. Slug
 * uniqueness alone does not stop it: "Sharma Motors" simply becomes
 * sharma-motors-2. So two things are treated as the same business:
 *
 *   - the same name (compared as a slug, so spacing and punctuation do not
 *     matter) in the same city, and
 *   - the same phone number anywhere, since one line is not shared by two
 *     genuinely different listings.
 *
 * Cities repeat names across the country — "Gupta Sweets" in Indore and in
 * Delhi are different shops — so the name test is scoped to the city.
 */
export async function findDuplicateBusiness(input: {
  name: string
  city: string
  phone?: string | null
  /** ignore this listing — an edit is not a duplicate of itself */
  excludeId?: string
}): Promise<DuplicateMatch | null> {
  const base = slugify(input.name)
  const city = input.city.trim().toLowerCase()
  const phone = phoneKey(input.phone)

  // Every listing of this name already carries the slug or a -N form of it, so
  // the unique index does the narrowing before we compare in JS.
  const or = [
    ...(base ? [{ slug: base }, { slug: { startsWith: `${base}-` } }] : []),
    ...(phone ? [{ phone: { contains: phone } }] : []),
  ]
  if (!or.length) return null

  const candidates = await db.business.findMany({
    where: {
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      OR: or,
    },
    select: { id: true, name: true, slug: true, city: true, phone: true },
    take: 50,
  })

  for (const c of candidates) {
    if (phone && phoneKey(c.phone) === phone) {
      return { id: c.id, name: c.name, slug: c.slug, city: c.city, reason: 'phone' }
    }
    if (base && slugify(c.name) === base && c.city.trim().toLowerCase() === city) {
      return { id: c.id, name: c.name, slug: c.slug, city: c.city, reason: 'name' }
    }
  }
  return null
}

/** What to tell someone whose submission collided with an existing listing. */
export function duplicateMessage(dup: DuplicateMatch): string {
  return dup.reason === 'phone'
    ? `That phone number already belongs to “${dup.name}” (${dup.city}).`
    : `“${dup.name}” is already listed in ${dup.city}.`
}

/** Fetch a business the current user owns, or redirect. Used by edit routes. */
export async function requireOwnedBusiness(id: string) {
  const { session, ownerId } = await requireOwner(`/business/dashboard/businesses/${id}/edit`)
  const business = await db.business.findUnique({ where: { id } })
  if (!business || business.ownerId !== ownerId) redirect('/business/dashboard/businesses')
  return { session, business }
}
