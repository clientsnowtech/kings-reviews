import { cn } from '@/lib/utils'

/** Base shimmer block. Compose these to mirror the real layout so nothing shifts on swap. */
export function Skeleton({ className }: { className?: string }) {
  // `.skeleton` (globals.css) sweeps a highlight across instead of pulsing — at
  // this contrast a pulse reads as a broken element rather than a pending one.
  return <div className={cn('skeleton rounded bg-border', className)} />
}

/** Mirrors <BusinessCard /> — 56px logo + title, stars row, meta row. */
export function BusinessCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border bg-surface p-4 shadow-soft">
      <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  )
}

export function BusinessGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Avatar + stars + title + two body lines. */
export function ReviewCardSkeleton() {
  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      <Skeleton className="mt-3 h-4 w-24 rounded-sm" />
      <Skeleton className="mt-3 h-3.5 w-1/2" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
    </div>
  )
}

/** Dashboard/admin KPI tile. */
export function StatTileSkeleton() {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-12" />
    </div>
  )
}

/** Row of pill filters — widths vary so it does not read as a progress bar. */
export function ChipRowSkeleton({ count = 6 }: { count?: number }) {
  const widths = ['w-16', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24', 'w-20', 'w-32']
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn('h-8 rounded-full', widths[i % widths.length])} />
      ))}
    </div>
  )
}

/** Generic bordered list — admin tables and panel lists. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Screen-reader announcement so a pulsing page is not silence for AT users. */
export function LoadingLabel({ children = 'Loading…' }: { children?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {children}
    </span>
  )
}
