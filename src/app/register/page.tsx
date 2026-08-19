'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerUser, type ActionState } from '@/lib/actions'
import { PasswordField } from '@/components/password-field'
import { GoogleButton } from '@/components/google-button'
import { rememberEmail } from '@/lib/prefs'
import { Logo } from '@/components/logo'

const initial: ActionState = {}

export default function RegisterPage() {
  // stash the email before it reaches the server action, so the login screen
  // this redirects to already has it filled in
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      rememberEmail(String(formData.get('email') ?? '').trim())
      return registerUser(prev, formData)
    },
    initial,
  )

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex justify-center">
        <Logo href={null} />
      </div>

      <div className="rounded-2xl border bg-surface p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Join Kings Reviews to review businesses across India.</p>

        <div className="mt-6">
          <GoogleButton label="Sign up with Google" />
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Full name</label>
            <input
              name="name"
              autoComplete="name"
              required
              className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
            />
            {state.fieldErrors?.name && <p className="mt-1 text-sm text-danger">{state.fieldErrors.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
            />
            {state.fieldErrors?.email && <p className="mt-1 text-sm text-danger">{state.fieldErrors.email}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <PasswordField name="password" autoComplete="new-password" required />
            {state.fieldErrors?.password && <p className="mt-1 text-sm text-danger">{state.fieldErrors.password}</p>}
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            disabled={pending}
            className="h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? 'Creating…' : 'Create account'}
          </button>

          {/* DPDP Act §5 wants the notice presented where consent is taken, not
              only linked from the footer. */}
          <p className="text-center text-xs leading-relaxed text-muted">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="font-medium text-brand hover:underline">
              Terms of Service
            </Link>{' '}
            and consent to the processing of your personal data as described in our{' '}
            <Link href="/privacy" className="font-medium text-brand hover:underline">
              Privacy Policy
            </Link>
            . You can withdraw consent at any time.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
