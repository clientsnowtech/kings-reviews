'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface for logging / monitoring.
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle size={30} />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">
        An unexpected error occurred. Please try again — if it keeps happening, come back later.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted">Ref: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="h-11 rounded-lg bg-brand px-5 font-medium text-white hover:bg-brand-strong"
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex h-11 items-center rounded-lg border px-5 font-medium hover:bg-surface"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
