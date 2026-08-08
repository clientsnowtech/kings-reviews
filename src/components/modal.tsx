'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Matches the exit animations in globals.css (--dur-fast) plus a frame of slack. */
const EXIT_MS = 160

/**
 * Portalled to the body on purpose: the sticky header carries a backdrop-blur,
 * and that makes it a containing block for anything `position: fixed` nested
 * under it — the dialog would end up clipped inside the header.
 */
export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** `lg` buys horizontal room for dialogs that would otherwise scroll */
  size?: 'md' | 'lg'
  children: React.ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  // `open` is the caller's intent; `render` is what is actually on screen. They
  // diverge for one exit animation so the dialog can play its way out instead
  // of vanishing the instant the parent flips the flag.
  const [prevOpen, setPrevOpen] = useState(open)
  const [closing, setClosing] = useState(false)

  // Adjusted during render rather than in an effect: an effect would paint the
  // unstyled frame first, so the dialog would flash before it started animating.
  if (prevOpen !== open) {
    setPrevOpen(open)
    setClosing(prevOpen && !open)
  }

  const render = open || closing

  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => setClosing(false), EXIT_MS)
    return () => clearTimeout(t)
  }, [closing])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panel.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!render) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onMouseDown={(e) => {
        // only a click on the backdrop itself closes — not a drag that ends there
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`max-h-[92vh] w-full ${
          size === 'lg' ? 'max-w-3xl' : 'max-w-lg'
        } overflow-y-auto overscroll-contain rounded-t-2xl bg-surface shadow-float outline-none sm:rounded-2xl ${
          // phones get a bottom sheet, desktop a centred dialog — each arrives
          // from where its own shape says it should
          closing
            ? 'animate-sheet-down sm:animate-scale-out'
            : 'animate-sheet-up sm:animate-scale-in'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-surface px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:rotate-90 hover:bg-background hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
