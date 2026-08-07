'use client'

import { useActionState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { updateProfile, type AccountState } from '@/lib/account-actions'
import { initials, colorFrom } from '@/lib/utils'
import { ImageInput } from './image-input'

const initial: AccountState = {}

export function ProfileForm({
  user,
}: {
  user: { name: string | null; email: string; phone: string | null; image: string | null }
}) {
  const [state, action, pending] = useActionState(updateProfile, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5 rounded-xl border bg-surface p-6">
      <div className="flex items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatars are local uploads
          <img src={user.image} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-semibold text-white"
            style={{ background: colorFrom(user.email) }}
          >
            {initials(user.name ?? user.email)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium">Photo</label>
          <ImageInput name="avatar" className="max-w-full text-sm" hint="JPG, PNG or WebP" />
          {user.image && (
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="removeAvatar" className="h-4 w-4 accent-[var(--brand)]" />
              Remove my photo
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Full name <span className="text-danger">*</span>
        </label>
        <input
          name="name"
          defaultValue={user.name ?? ''}
          required
          className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
        />
        {fe.name && <p className="mt-1 text-sm text-danger">{fe.name}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input
            name="phone"
            defaultValue={user.phone ?? ''}
            placeholder="+91 …"
            className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
          />
          {fe.phone && <p className="mt-1 text-sm text-danger">{fe.phone}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            value={user.email}
            readOnly
            className="h-11 w-full cursor-not-allowed rounded-lg border bg-background px-3 text-muted outline-none"
          />
          {/* Login, reviews and business ownership all hang off this address, so
              it is not something a profile form should quietly rewrite. */}
          <p className="mt-1 text-xs text-muted">Contact us if this needs to change.</p>
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
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
