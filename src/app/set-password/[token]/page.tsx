import Link from 'next/link'
import type { Metadata } from 'next'
import { emailForSetPasswordToken } from '@/lib/password-token'
import { SetPasswordForm } from '@/components/set-password-form'
import { Logo } from '@/components/logo'

// The token is the credential — nothing here may be cached or indexed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Set your password',
  robots: { index: false, follow: false },
}

export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const email = await emailForSetPasswordToken(token)

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex justify-center">
        <Logo href={null} />
      </div>

      <div className="rounded-2xl border bg-surface p-8">
        {email ? (
          <>
            <h1 className="text-2xl font-bold">Set your password</h1>
            <p className="mt-1 text-sm text-muted">
              Your business is already listed — this is the account that manages it.
            </p>
            <div className="mt-6">
              <SetPasswordForm token={token} email={email} />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">This link no longer works</h1>
            <p className="mt-2 text-sm text-muted">
              It has expired, or the password was already set. A Google account on the same address
              can sign in right away — otherwise write to us and we will send a fresh link.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-strong"
              >
                Go to login
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-lg border px-5 font-medium hover:bg-mint"
              >
                Contact us
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
