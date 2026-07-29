import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Server-rendered pager. Builds hrefs from the base path + preserved query params.
 * `params` should contain every current query value except `page`.
 */
export function Pagination({
  basePath,
  page,
  pageCount,
  total,
  params = {},
}: {
  basePath: string
  page: number
  pageCount: number
  total: number
  params?: Record<string, string | undefined>
}) {
  if (pageCount <= 1) {
    return <p className="text-center text-xs text-muted">{total} total</p>
  }

  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    if (p > 1) sp.set('page', String(p))
    const q = sp.toString()
    return q ? `${basePath}?${q}` : basePath
  }

  // window of page numbers around the current page
  const nums: number[] = []
  const from = Math.max(1, page - 2)
  const to = Math.min(pageCount, page + 2)
  for (let i = from; i <= to; i++) nums.push(i)

  const cls = (active: boolean) =>
    `grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm font-medium ${
      active ? 'border-brand bg-brand text-white' : 'text-muted hover:bg-mint'
    }`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <span className="text-xs text-muted">
        Page {page} of {pageCount} · {total} total
      </span>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link href={href(page - 1)} className={cls(false)} aria-label="Previous page">
            <ChevronLeft size={16} />
          </Link>
        )}
        {from > 1 && <span className="px-1 text-muted">…</span>}
        {nums.map((n) => (
          <Link key={n} href={href(n)} className={cls(n === page)}>
            {n}
          </Link>
        ))}
        {to < pageCount && <span className="px-1 text-muted">…</span>}
        {page < pageCount && (
          <Link href={href(page + 1)} className={cls(false)} aria-label="Next page">
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </div>
  )
}
