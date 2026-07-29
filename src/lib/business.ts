import { redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from './db'

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

/** Fetch a business the current user owns, or redirect. Used by edit routes. */
export async function requireOwnedBusiness(id: string) {
  const session = await requireUser(`/business/dashboard/businesses/${id}/edit`)
  const business = await db.business.findUnique({ where: { id } })
  if (!business || business.ownerId !== session.user.id) redirect('/business/dashboard/businesses')
  return { session, business }
}
