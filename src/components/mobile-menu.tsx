'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { Role } from '@prisma/client'
import { signOutAction } from '@/lib/actions'

/** Matches the exit animations in globals.css (--dur-fast) plus a frame of slack. */
const EXIT_MS = 160

export function MobileMenu({ role }: { role: Role | null }) {
  const [open, setOpen] = useState(false)
  // The drawer has to stay mounted while it slides back out, so closing is its
  // own state rather than an immediate unmount.
  const [closing, setClosing] = useState(false)
  const signedIn = role !== null

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, EXIT_MS)
  }, [])

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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <div className="md:hidden">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-lg hover:bg-mint"
      >
        <Burger open={open && !closing} />
      </button>

      {/* The header sets backdrop-blur, and a backdrop-filter makes its box the
          containing block for fixed-position descendants — the drawer would be
          trapped inside the header strip. Portalling to body escapes that. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50">
          <div
            className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] ${
              closing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={close}
          />
          {/* Narrow phones cannot fit a fixed 18rem panel beside the backdrop,
              and a signed-in menu is tall enough to overflow a short screen. */}
          <div
            className={`absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto overscroll-contain bg-white p-4 shadow-float ${
              closing ? 'animate-slide-out-right' : 'animate-slide-in-right'
            }`}
          >
            <button
              onClick={close}
              aria-label="Close menu"
              className="mb-2 grid h-10 w-10 place-items-center self-end rounded-lg hover:rotate-90 hover:bg-mint"
            >
              <X size={22} />
            </button>

            {/* Links ride in behind the panel — see .stagger in globals.css. */}
            <div className={`flex flex-col gap-1 ${closing ? '' : 'stagger'}`}>
              <MobileLink href="/businesses" onClick={close}>Businesses</MobileLink>
              <MobileLink href="/categories" onClick={close}>Categories</MobileLink>
              <MobileLink href="/cities" onClick={close}>Cities</MobileLink>
              {(!signedIn || role === 'USER') && (
                <MobileLink href="/business/register" onClick={close}>For businesses</MobileLink>
              )}

              {signedIn ? (
                <>
                  {role === 'ADMIN' && (
                    <MobileLink href="/admin" onClick={close}>Admin panel</MobileLink>
                  )}
                  {role === 'BUSINESS' && (
                    <MobileLink href="/business/dashboard" onClick={close}>Dashboard</MobileLink>
                  )}
                  <MobileLink href="/my/reviews" onClick={close}>My reviews</MobileLink>
                  <MobileLink href="/my/profile" onClick={close}>Profile</MobileLink>
                  <MobileLink href="/my/security" onClick={close}>Security</MobileLink>
                  <form action={signOutAction} className="mt-2">
                    <button className="w-full rounded-lg border px-4 py-2.5 text-left font-medium text-muted hover:bg-mint">
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <MobileLink href="/login" onClick={close}>Log in</MobileLink>
                  <Link
                    href="/register"
                    onClick={close}
                    className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-strong active:scale-[0.98]"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/**
 * Three bars that fold into an X. Drawn by hand rather than swapping two lucide
 * icons, because a swap cannot tween — the bars have to travel to become the X.
 */
function Burger({ open }: { open: boolean }) {
  const bar = 'absolute h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out'
  return (
    <span className="relative grid h-5 w-5 place-items-center" aria-hidden>
      <span className={`${bar} ${open ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`} />
      <span className={`${bar} ${open ? 'scale-x-0 opacity-0' : ''}`} />
      <span className={`${bar} ${open ? 'translate-y-0 -rotate-45' : 'translate-y-1.5'}`} />
    </span>
  )
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-4 py-2.5 font-medium hover:translate-x-1 hover:bg-mint"
    >
      {children}
    </Link>
  )
}
