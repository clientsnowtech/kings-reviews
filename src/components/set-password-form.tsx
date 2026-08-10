'use client'

import { useActionState } from 'react'
import { setPasswordFromToken, type AccountState } from '@/lib/account-actions'
import { PasswordField } from './password-field'

const initial: AccountState = {}

/**
 * The form behind the welcome mail's link. The token rides along in a hidden
 * field rather than being read from the URL on the client, so the action gets
 * it whether or not anything rewrote the address bar first.
 */
export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(setPasswordFromToken, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          readOnly
          value={email}
          autoComplete="username"
          className="h-11 w-full rounded-lg border bg-background px-3 text-muted outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <PasswordField name="password" autoComplete="new-password" required minLength={8} />
        {fe.password && <p className="mt-1 text-sm text-danger">{fe.password}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Repeat password</label>
        <PasswordField name="confirm" autoComplete="new-password" required minLength={8} />
        {fe.confirm && <p className="mt-1 text-sm text-danger">{fe.confirm}</p>}
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        disabled={pending}
        className="h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Set password and continue'}
      </button>
    </form>
  )
}
