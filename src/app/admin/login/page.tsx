'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ShieldCheck } from 'lucide-react'
import { PasswordField } from '@/components/password-field'

function AdminLoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const denied = params.get('denied')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(denied ? 'That account is not an admin.' : '')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setPending(false)
    if (res?.error) {
      setError('Invalid email or password')
      return
    }
    // the /admin guard bounces non-admins back here with ?denied=1
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white">
            <ShieldCheck size={24} />
          </span>
          <h1 className="text-xl font-bold">Admin sign in</h1>
          <p className="text-sm text-muted">Restricted area — platform staff only.</p>
        </div>

        <div className="rounded-2xl border bg-surface p-8 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              disabled={pending}
              className="h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-strong disabled:opacity-60"
            >
              {pending ? 'Signing in…' : 'Sign in to admin'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Demo admin — admin@kingsreviews.com / password123
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginInner />
    </Suspense>
  )
}
