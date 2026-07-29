'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const SORTS = [
  { key: 'recent', label: 'Most recent' },
  { key: 'helpful', label: 'Most helpful' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest', label: 'Lowest rated' },
] as const

export function ReviewControls({
  slug,
  rating,
  sort,
  counts,
}: {
  slug: string
  rating: number
  sort: string
  /** histogram counts, index 0 = 5★ … index 4 = 1★ */
  counts: number[]
}) {
  const router = useRouter()
  const params = useSearchParams()

  function go(next: { rating?: number; sort?: string }) {
    const sp = new URLSearchParams(params.toString())
    if ('rating' in next) {
      if (next.rating) sp.set('rating', String(next.rating))
      else sp.delete('rating')
    }
    if ('sort' in next && next.sort) {
      if (next.sort === 'recent') sp.delete('sort')
      else sp.set('sort', next.sort)
    }
    sp.delete('page') // reset paging on any filter/sort change
    const qs = sp.toString()
    router.push(`/company/${slug}${qs ? `?${qs}` : ''}#reviews`, { scroll: false })
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => go({ rating: 0 })}
        className={cn(
          'rounded-full border px-3 py-1 transition',
          !rating
            ? 'border-brand bg-brand text-white'
            : 'bg-surface hover:border-brand hover:bg-brand hover:text-white',
        )}
      >
        All
      </button>
      {[5, 4, 3, 2, 1].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => go({ rating: s })}
          className={cn(
            'group inline-flex items-center gap-1 rounded-full border px-3 py-1 transition',
            rating === s
              ? 'border-brand bg-brand text-white'
              : 'bg-surface hover:border-brand hover:bg-brand hover:text-white',
          )}
        >
          {s}★{' '}
          <span
            className={cn(
              'text-xs',
              rating === s ? 'text-white/80' : 'text-muted group-hover:text-white/80',
            )}
          >
            ({counts[5 - s]})
          </span>
        </button>
      ))}

      <label className="ml-auto flex items-center gap-2 text-muted">
        <span className="sr-only">Sort reviews</span>
        <select
          value={sort}
          onChange={(e) => go({ sort: e.target.value })}
          className="rounded-full border bg-surface px-3 py-1 text-sm text-foreground/80 outline-none transition hover:border-brand focus:border-brand"
        >
          {SORTS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
