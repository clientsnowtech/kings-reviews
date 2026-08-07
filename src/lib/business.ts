import { redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from './db'
import { actingOwnerId } from './impersonation'

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

/** Fetch a business the current user owns, or redirect. Used by edit routes. */
export async function requireOwnedBusiness(id: string) {
  const { session, ownerId } = await requireOwner(`/business/dashboard/businesses/${id}/edit`)
  const business = await db.business.findUnique({ where: { id } })
  if (!business || business.ownerId !== ownerId) redirect('/business/dashboard/businesses')
  return { session, business }
}
