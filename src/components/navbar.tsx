import { Suspense } from 'react'
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { initials, colorFrom } from '@/lib/utils'
import { MobileMenu } from './mobile-menu'
import { NavSearch } from './nav-search'
import { Logo } from './logo'
import { Skeleton } from './skeleton'

/**
 * Static shell only — nothing here awaits. The session lives behind <Suspense>
 * below, because a root layout that awaits runtime data (cookies) blocks every
 * route's loading.tsx fallback from ever painting.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />

        <NavSearch className="hidden max-w-md flex-1 sm:block" />

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/businesses" className="hidden rounded-md px-3 py-2 hover:bg-background md:block">
            Businesses
          </Link>
          <Link href="/categories" className="hidden rounded-md px-3 py-2 hover:bg-background md:block">
            Categories
          </Link>

          <Suspense fallback={<NavAuthSkeleton />}>
            <NavAuth />
          </Suspense>
        </nav>
      </div>
    </header>
  )
}

async function NavAuth() {
  const session = await auth()
  const user = session?.user

  return (
    <>
      {(!user || user.role === 'USER') && (
        <Link
          href="/business/register"
          className="hidden rounded-md px-3 py-2 font-medium hover:bg-background sm:block"
        >
          For businesses
        </Link>
      )}

      {user ? (
        <div className="hidden items-center gap-2 md:flex">
          {user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-2 font-medium text-brand hover:bg-mint"
            >
              Admin
            </Link>
          )}
          {user.role === 'BUSINESS' && (
            <Link href="/business/dashboard" className="rounded-md px-3 py-2 hover:bg-background">
              Dashboard
            </Link>
          )}
          <Link href="/my/profile" title={user.name ?? user.email ?? ''}>
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
              style={{ background: colorFrom(user.email ?? user.name ?? 'u') }}
            >
              {initials(user.name ?? user.email)}
            </span>
          </Link>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <button className="rounded-md px-3 py-2 text-muted hover:text-foreground">
              Logout
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden items-center gap-1 md:flex">
          <Link href="/login" className="rounded-md px-3 py-2 hover:bg-mint">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong"
          >
            Sign up
          </Link>
        </div>
      )}

      <MobileMenu role={user?.role ?? null} />
    </>
  )
}

/** Reserves the same footprint as the resolved auth block so the bar never jumps. */
function NavAuthSkeleton() {
  return (
    <>
      <Skeleton className="hidden h-6 w-28 sm:block" />
      <div className="hidden items-center gap-2 md:flex">
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
      <div className="h-10 w-10 md:hidden" />
    </>
  )
}
