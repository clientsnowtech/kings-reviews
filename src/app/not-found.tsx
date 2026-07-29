import Link from 'next/link'
import { Compass, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-mint text-brand">
        <Compass size={30} />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="h-11 rounded-lg bg-brand px-5 font-medium leading-[2.75rem] text-white hover:bg-brand-strong"
        >
          Go home
        </Link>
        <Link
          href="/search"
          className="flex h-11 items-center gap-2 rounded-lg border px-5 font-medium hover:bg-surface"
        >
          <Search size={16} /> Search businesses
        </Link>
      </div>
    </div>
  )
}
