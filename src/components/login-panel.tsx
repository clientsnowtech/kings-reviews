'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { PasswordField } from '@/components/password-field'
import { GoogleButton } from '@/components/google-button'
import { readRememberedEmail, rememberEmail, forgetEmail } from '@/lib/prefs'
import { loginPrecheck } from '@/lib/account-actions'

/**
 * The credentials + Google pair, shared by the /login page and the review
 * dialog. `onSuccess` lets the dialog stay open and swap in the review form;
 * without it the panel navigates to `next` the way a login page should.
 */
export function LoginPanel({
  next,
  onSuccess,
  registerHref = '/register',
}: {
  next: string
  onSuccess?: () => void
  registerHref?: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [remember, setRemember] = useState(true)
  // second factor: only asked for once the password itself has checked out
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)

  // prefill with the last account that logged in on this device
  useEffect(() => {
    const saved = readRememberedEmail()
    if (saved) setEmail(saved)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')

    // Ask the server whether this account wants a second factor before we try
    // to sign in — authorize() can only answer yes or no, so a missing code
    // would come back as "invalid password" and read as a broken login.
    if (!needsCode) {
      const stage = await loginPrecheck(email, password)
      if (stage === 'invalid') {
        setPending(false)
        setError('Invalid email or password')
        return
      }
      if (stage === 'twoFactor') {
        setPending(false)
        setNeedsCode(true)
        return
      }
    }

    const res = await signIn('credentials', { email, password, code, redirect: false })
    if (res?.error) {
      setPending(false)
      setError(needsCode ? 'That code did not work' : 'Invalid email or password')
      return
    }
    if (remember) rememberEmail(email)
    else forgetEmail()

    if (onSuccess) {
      router.refresh()
      onSuccess()
      setPending(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  // Step two of a two-factor login: the password is already accepted, so the
  // only thing left to collect is the code.
  if (needsCode) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Two-factor code</label>
          <input
            name="code"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            required
            className="h-11 w-full rounded-lg border bg-background px-3 tracking-[0.3em] outline-none focus:border-brand"
          />
          <p className="mt-1 text-xs text-muted">
            From your authenticator app — or one of your backup codes.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          disabled={pending}
          className="h-11 w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? 'Checking…' : 'Verify and log in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setNeedsCode(false)
            setCode('')
            setError('')
          }}
          className="w-full text-sm text-muted hover:text-foreground"
        >
          ← Use a different account
        </button>
      </form>
    )
  }

  return (
    <>
      <GoogleButton callbackUrl={next} />

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
        <Link href={registerHref} className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </>
  )
}
