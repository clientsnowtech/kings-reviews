'use client'

import { useActionState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { changePassword, type AccountState } from '@/lib/account-actions'
import { PasswordField } from './password-field'

const initial: AccountState = {}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-surface p-6">
      <div>
        <h2 className="text-lg font-semibold">
          {hasPassword ? 'Change password' : 'Set a password'}
        </h2>
        <p className="text-sm text-muted">
          {hasPassword
            ? 'At least 8 characters. You stay logged in on this device.'
            : 'You signed up with Google. A password lets you log in without it too.'}
        </p>
      </div>

      {hasPassword && (
        <div>
          <label className="mb-1 block text-sm font-medium">Current password</label>
          <PasswordField name="currentPassword" autoComplete="current-password" required />
          {fe.currentPassword && <p className="mt-1 text-sm text-danger">{fe.currentPassword}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">New password</label>
          <PasswordField name="password" autoComplete="new-password" required minLength={8} />
          {fe.password && <p className="mt-1 text-sm text-danger">{fe.password}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Repeat new password</label>
          <PasswordField name="confirm" autoComplete="new-password" required minLength={8} />
          {fe.confirm && <p className="mt-1 text-sm text-danger">{fe.confirm}</p>}
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-brand">
          <CheckCircle2 size={16} /> {state.ok}
        </p>
      )}

      <button
        disabled={pending}
        className="h-11 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
      </button>
    </form>
  )
}
