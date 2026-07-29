'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Submit button for server-action forms.
 *
 * A plain <button> inside <form action={serverAction}> looks completely inert
 * while the action round-trips, so people click again thinking it missed.
 * useFormStatus() exposes the pending flag of the enclosing form.
 */
export function SubmitButton({
  children,
  className,
  pendingLabel,
  confirmMessage,
  title,
}: {
  children: React.ReactNode
  className?: string
  /** replaces the label while the action runs; omit to keep the label and just spin */
  pendingLabel?: string
  /** ask before firing — for destructive actions */
  confirmMessage?: string
  title?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      onClick={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault()
      }}
      className={cn(
        'inline-flex items-center gap-1 transition disabled:cursor-wait disabled:opacity-60',
        className,
      )}
    >
      {pending && <Loader2 size={13} className="animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
