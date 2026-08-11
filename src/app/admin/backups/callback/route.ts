import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { exchangeCode } from '@/lib/drive'
import { connectDrive } from '@/lib/backup'

export const dynamic = 'force-dynamic'

/** Where Google comes back to. Everything it says is checked before it counts. */
export async function GET(request: NextRequest) {
  await requireAdmin()

  const params = request.nextUrl.searchParams
  const jar = await cookies()
  const expected = jar.get('drive_state')?.value
  jar.delete('drive_state')

  // Annotated rather than inferred: TypeScript only lets a never-returning call
  // narrow what follows it when the binding says never out loud.
  const back: (error?: string) => never = (error) =>
    redirect(`/admin/backups${error ? `?error=${encodeURIComponent(error)}` : '?connected=1'}`)

  // the admin pressed Cancel on the consent screen, or Google refused outright
  const denied = params.get('error')
  if (denied) back(denied === 'access_denied' ? 'Connection cancelled.' : denied)

  const code = params.get('code')
  const state = params.get('state')
  if (!code) back('Google sent no authorisation code.')
  // A mismatch means this request did not start here — a link somebody else
  // built, aimed at an admin session that happens to be signed in.
  if (!state || !expected || state !== expected) back('That link did not come from this panel.')

  try {
    const { refreshToken, email } = await exchangeCode(code)
    await connectDrive(refreshToken, email)
  } catch (e) {
    back(e instanceof Error ? e.message : 'Could not connect to Google Drive.')
  }

  back()
}
