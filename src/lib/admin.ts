import { redirect } from 'next/navigation'
import { auth } from './auth'

/**
 * Guard for admin server components and actions.
 * Redirects non-admins away; returns the session when authorised.
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')
  if (session.user.role !== 'ADMIN') redirect('/admin/login?denied=1')
  return session
}
