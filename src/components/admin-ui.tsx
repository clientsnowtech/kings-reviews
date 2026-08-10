'use client'

import { cn } from '@/lib/utils'
import { SubmitButton } from '@/components/submit-button'

const TONES: Record<string, string> = {
  green: 'bg-mint text-brand-strong',
  gray: 'bg-background text-muted',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-danger',
  blue: 'bg-blue-100 text-blue-800',
  teal: 'bg-brand/10 text-brand',
}

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  LIVE: 'green',
  PENDING: 'amber',
  REJECTED: 'red',
  SUSPENDED: 'red',
  REMOVED: 'red',
  OPEN: 'amber',
  RESOLVED: 'green',
  DISMISSED: 'gray',
  USER: 'teal',
  BUSINESS: 'blue',
  ADMIN: 'green',
  // outbound email — a skipped notification is not a failure, it simply never
  // left, so the two do not share a colour
  SENT: 'green',
  FAILED: 'red',
  SKIPPED: 'amber',
}

export function Badge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'gray'
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        TONES[tone],
      )}
    >
      {status}
    </span>
  )
}

/**
 * Submit button that asks for confirmation before firing the form action.
 * Thin wrapper over SubmitButton so it also reports the pending state —
 * a destructive action with no feedback reads as a click that never landed.
 */
export function ConfirmButton({
  children,
  className,
  message = 'Are you sure?',
  pendingLabel = 'Working…',
}: {
  children: React.ReactNode
  className?: string
  message?: string
  pendingLabel?: string
}) {
  return (
    <SubmitButton className={className} confirmMessage={message} pendingLabel={pendingLabel}>
      {children}
    </SubmitButton>
  )
}
