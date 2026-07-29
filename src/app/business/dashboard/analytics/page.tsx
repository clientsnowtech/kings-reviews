import Link from 'next/link'
import { TrendingUp, Star, MessageSquare } from 'lucide-react'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/business'
import { Stars } from '@/components/stars'

export const dynamic = 'force-dynamic'

const DAY = 24 * 60 * 60 * 1000

export default async function AnalyticsPage() {
  const session = await requireUser()

  const businesses = await db.business.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
  })
  const ids = businesses.map((b) => b.id)

  if (ids.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-8 text-center text-muted">
        List a business to see analytics.{' '}
        <Link href="/business/dashboard/businesses/new" className="font-medium text-brand hover:underline">
          List one
        </Link>
      </p>
    )
  }

  const since = new Date(Date.now() - 90 * DAY)
  const reviews = await db.review.findMany({
    where: { businessId: { in: ids }, status: 'LIVE', createdAt: { gte: since } },
    select: { rating: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // last 12 weeks, oldest → newest
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const end = Date.now() - (11 - i) * 7 * DAY
    const start = end - 7 * DAY
    const inWeek = reviews.filter((r) => {
      const t = r.createdAt.getTime()
      return t >= start && t < end
    })
    const avg = inWeek.length ? inWeek.reduce((s, r) => s + r.rating, 0) / inWeek.length : 0
    return { count: inWeek.length, avg }
  })
  const maxCount = Math.max(1, ...weeks.map((w) => w.count))

  const total = reviews.length
  const avg90 = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0
  const last30 = reviews.filter((r) => r.createdAt.getTime() >= Date.now() - 30 * DAY).length

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">
        Analytics <span className="text-sm font-normal text-muted">· last 90 days</span>
      </h2>

      {/* 3 tiles don't fit at 320px — 2-up on phones, last one spans the row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <div className="rounded-2xl border bg-surface p-5">
          <MessageSquare size={18} className="text-brand" />
          <div className="mt-2 text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted">reviews (90d)</div>
        </div>
        <div className="rounded-2xl border bg-surface p-5">
          <TrendingUp size={18} className="text-brand" />
          <div className="mt-2 text-2xl font-bold">{last30}</div>
          <div className="text-xs text-muted">reviews (30d)</div>
        </div>
        <div className="rounded-2xl border bg-surface p-5">
          <Star size={18} className="text-brand" />
          <div className="mt-2 text-2xl font-bold">{avg90 ? avg90.toFixed(1) : '—'}</div>
          <div className="text-xs text-muted">avg rating (90d)</div>
        </div>
      </div>

      {/* weekly volume */}
      <div className="rounded-2xl border bg-surface p-6">
        <h3 className="font-semibold">Weekly review volume</h3>
        <div className="mt-4 flex h-40 items-end gap-2">
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand/80"
                style={{ height: `${(w.count / maxCount) * 100}%`, minHeight: w.count ? 4 : 0 }}
                title={`${w.count} reviews${w.avg ? `, avg ${w.avg.toFixed(1)}` : ''}`}
              />
              <span className="text-[10px] text-muted">{i === 0 ? '12w' : i === 11 ? 'now' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* distribution */}
      <div className="rounded-2xl border bg-surface p-6">
        <h3 className="font-semibold">Rating distribution</h3>
        <div className="mt-4 space-y-1.5">
          {dist.map((d) => {
            const pct = total ? (d.count / total) * 100 : 0
            return (
              <div key={d.star} className="flex items-center gap-2 text-sm">
                <span className="flex w-12 items-center gap-1">
                  {d.star} <Star size={12} className="fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/60">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted">{d.count}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t pt-4 text-sm text-muted">
          Overall <Stars value={avg90} size="sm" /> across {total} reviews
        </div>
      </div>
    </div>
  )
}
