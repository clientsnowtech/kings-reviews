import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { otpauthUrl, parseBackupCodes } from '@/lib/totp'
import { PasswordForm } from '@/components/password-form'
import { TwoFactorPanel } from '@/components/two-factor-panel'

export const metadata: Metadata = { title: 'Security' }
export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/my/security')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      password: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorAt: true,
      twoFactorCodes: true,
    },
  })
  if (!user) redirect('/login')

  // The QR is only wanted mid-setup, and drawing it here keeps the secret on the
  // server — the browser gets a picture and the key, never a scan library.
  const pendingSecret = user.twoFactorEnabled ? null : user.twoFactorSecret
  const qrSvg = pendingSecret
    ? await QRCode.toString(otpauthUrl({ secret: pendingSecret, label: user.email }), {
        type: 'svg',
        margin: 0,
      })
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted">Your password and the second step at login.</p>
      </div>

      <PasswordForm hasPassword={Boolean(user.password)} />

      <TwoFactorPanel
        enabled={user.twoFactorEnabled}
        enabledAt={user.twoFactorAt ? formatDate(user.twoFactorAt) : null}
        pendingSecret={pendingSecret}
        qrSvg={qrSvg}
        backupLeft={parseBackupCodes(user.twoFactorCodes).length}
      />
    </div>
  )
}
