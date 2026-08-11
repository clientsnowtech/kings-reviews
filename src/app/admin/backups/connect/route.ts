import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin'
import { consentUrl } from '@/lib/drive'

export const dynamic = 'force-dynamic'

/**
 * Sends the admin to Google to authorise the backup folder.
 *
 * A GET that starts an OAuth flow is safe because it grants nothing by itself:
 * the token arrives at the callback, which refuses any state but the one this
 * handler minted and put in a cookie.
 */
export async function GET() {
  await requireAdmin()

  const state = randomBytes(16).toString('hex')
  const jar = await cookies()
  jar.set('drive_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin/backups',
    maxAge: 600,
  })

  redirect(consentUrl(state))
}
