import { cookies } from 'next/headers'
import type { Session } from 'next-auth'

/**
 * Lets an admin work inside a business's own dashboard.
 *
 * The cookie only names the owner to act as — every read checks the live
 * session's role first, so the cookie on its own grants nothing. That is why it
 * needs no signature: forging it gets you exactly the access you already had.
 */
export const ACT_AS_COOKIE = 'ti.act_as_owner'

export async function setActingOwner(ownerId: string) {
  const jar = await cookies()
  jar.set(ACT_AS_COOKIE, ownerId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // a working day; admins forget to switch back
  })
}

export async function clearActingOwner() {
  const jar = await cookies()
  jar.delete(ACT_AS_COOKIE)
}

/** The owner an admin is standing in for, or null for everyone else. */
export async function actingOwnerId(session: Session | null): Promise<string | null> {
  if (session?.user?.role !== 'ADMIN') return null
  const jar = await cookies()
  return jar.get(ACT_AS_COOKIE)?.value ?? null
}
