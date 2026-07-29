'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Star } from 'lucide-react'
import { PasswordField } from '@/components/password-field'
import { GoogleButton } from '@/components/google-button'
import { readRememberedEmail, rememberEmail, forgetEmail } from '@/lib/prefs'

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/post-login'
  const justRegistered = params.get('registered')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [remember, setRemember] = useState(true)

  // prefill with the last account that logged in on this device
  useEffect(() => {
    const saved = readRememberedEmail()
    if (saved) setEmail(saved)
  }, [])

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
    if (remember) rememberEmail(email)
    else forgetEmail()
    router.push(next)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex items-center justify-center gap-2 font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white">
          <Star size={18} fill="white" />
        </span>
        <span className="text-lg">Trust<span className="text-brand">Index</span></span>
      </div>

      <div className="rounded-2xl border bg-surface p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to write reviews and manage your business.</p>

        {justRegistered && (
          <p className="mt-4 rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
            Account created — please log in.
          </p>
        )}

        <div className="mt-6">
          <GoogleButton callbackUrl={next} />
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <PasswordField
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Remember my email on this device
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            disabled={pending}
            className="h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{' '}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {process.env.NODE_ENV !== 'production' && (
        <p className="mt-4 text-center text-xs text-muted">
          Demo login — owner@trustindex.in / password123
        </p>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
