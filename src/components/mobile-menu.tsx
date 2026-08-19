'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import type { Role } from '@prisma/client'
import { signOutAction } from '@/lib/actions'

/** Matches the exit animations in globals.css (--dur-fast) plus a frame of slack. */
const EXIT_MS = 160

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function MobileMenu({ role, email }: { role: Role | null; email?: string | null }) {
  const [open, setOpen] = useState(false)
  // The drawer has to stay mounted while it slides back out, so closing is its
  // own state rather than an immediate unmount.
  const [closing, setClosing] = useState(false)
  const signedIn = role !== null
  const pathname = usePathname()

  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setOpen(false)
      setClosing(false)
      // Dismissing a dialog has to hand the caret back where it came from, or a
      // keyboard user restarts from the top of the document.
      triggerRef.current?.focus()
    }, EXIT_MS)
  }, [])

  // A back gesture changes the route without unmounting the header, so the
  // drawer would sit over a page it no longer belongs to.
  useEffect(() => {
    setOpen(false)
    setClosing(false)
  }, [pathname])

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

  // Opening moves the caret into the panel and Tab then cycles inside it.
  // Without the trap, tabbing walks the page behind the backdrop — invisible,
  // still focusable, and still clickable by Enter.
  useEffect(() => {
    if (!open) return

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return

      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (items.length === 0) return
      const edge = e.shiftKey ? items[0] : items[items.length - 1]
      if (document.activeElement === edge) {
        e.preventDefault()
        ;(e.shiftKey ? items[items.length - 1] : items[0]).focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
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
          {/* dvh rather than a percentage height: a phone browser counts its
              collapsing URL bar as viewport, so the last row of a signed-in menu
              sat under the chrome with no way to reach it. The safe-area padding
              keeps that same row clear of the home indicator. */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={`absolute right-0 top-0 flex h-[100dvh] w-[min(20rem,85vw)] flex-col gap-1 overflow-y-auto overscroll-contain bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float ${
              closing ? 'animate-slide-out-right' : 'animate-slide-in-right'
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              {/* On a phone the bar has no avatar to check, so the drawer is the
                  only place that says which account you are signed in as. */}
              {signedIn && email && (
                <span className="min-w-0 flex-1 truncate text-xs text-muted" title={email}>
                  {email}
                </span>
              )}
              <button
                onClick={close}
                aria-label="Close menu"
                className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-transform hover:rotate-90 hover:bg-mint"
              >
                <X size={22} />
              </button>
            </div>

            {/* Links ride in behind the panel — see .stagger in globals.css. */}
            <div className={`flex flex-col gap-1 ${closing ? '' : 'stagger'}`}>
              {/* Below sm the navbar has no search box at all, so without this
                  row a phone can only search from the home page. */}
              <MobileLink href="/search" onClick={close}>Search</MobileLink>
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
