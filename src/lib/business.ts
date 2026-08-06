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

/** Fetch a business the current user owns, or redirect. Used by edit routes. */
export async function requireOwnedBusiness(id: string) {
  const { session, ownerId } = await requireOwner(`/business/dashboard/businesses/${id}/edit`)
  const business = await db.business.findUnique({ where: { id } })
  if (!business || business.ownerId !== ownerId) redirect('/business/dashboard/businesses')
  return { session, business }
}
