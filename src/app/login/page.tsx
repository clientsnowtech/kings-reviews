'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import { LoginPanel } from '@/components/login-panel'

function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/post-login'
  const justRegistered = params.get('registered')

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
          <LoginPanel next={next} />
        </div>
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
