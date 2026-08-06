'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import type { Role } from '@prisma/client'
import { signOutAction } from '@/lib/actions'

export function MobileMenu({ role }: { role: Role | null }) {
  const [open, setOpen] = useState(false)
  const signedIn = role !== null

  // Without this the page keeps scrolling under the open drawer, so closing it
  // drops you somewhere else on the page.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-10 w-10 place-items-center rounded-lg hover:bg-mint"
      >
        <Menu size={22} />
      </button>

      {/* The header sets backdrop-blur, and a backdrop-filter makes its box the
          containing block for fixed-position descendants — the drawer would be
          trapped inside the header strip. Portalling to body escapes that. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          {/* Narrow phones cannot fit a fixed 18rem panel beside the backdrop,
              and a signed-in menu is tall enough to overflow a short screen. */}
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto overscroll-contain bg-white p-4 shadow-float">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="mb-2 grid h-10 w-10 place-items-center self-end rounded-lg hover:bg-mint"
            >
              <X size={22} />
            </button>

            <MobileLink href="/businesses" onClick={() => setOpen(false)}>Businesses</MobileLink>
            <MobileLink href="/categories" onClick={() => setOpen(false)}>Categories</MobileLink>
            {(!signedIn || role === 'USER') && (
              <MobileLink href="/business/register" onClick={() => setOpen(false)}>For businesses</MobileLink>
            )}

            {signedIn ? (
              <>
                {role === 'ADMIN' && (
                  <MobileLink href="/admin" onClick={() => setOpen(false)}>Admin panel</MobileLink>
                )}
                {role === 'BUSINESS' && (
                  <MobileLink href="/business/dashboard" onClick={() => setOpen(false)}>Dashboard</MobileLink>
                )}
                <MobileLink href="/my/reviews" onClick={() => setOpen(false)}>My reviews</MobileLink>
                <form action={signOutAction} className="mt-2">
                  <button className="w-full rounded-lg border px-4 py-2.5 text-left font-medium text-muted hover:bg-mint">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <MobileLink href="/login" onClick={() => setOpen(false)}>Log in</MobileLink>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-center font-semibold text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="rounded-lg px-4 py-2.5 font-medium hover:bg-mint">
      {children}
    </Link>
  )
}
