import Link from 'next/link'
import { Star, MessageSquareReply, Building2, MailWarning } from 'lucide-react'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/business'
import { Stars } from '@/components/stars'
import { colorFrom, initials, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  LIVE: 'bg-mint text-brand-strong',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}

export default async function OverviewPage() {
  const { ownerId } = await requireOwner()

  const businesses = await db.business.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } } },
  })

  if (businesses.length === 0) {
    return (
      <div className="rounded-2xl border bg-surface p-10 text-center">
        <Building2 className="mx-auto text-muted" size={40} />
        <p className="mt-3 font-medium">You haven’t listed a business yet.</p>
        <p className="mt-1 text-sm text-muted">List your business so customers can find and review you.</p>
        <Link
          href="/business/dashboard/businesses/new"
          className="mt-5 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          List a business
        </Link>
      </div>
    )
  }

  const ids = businesses.map((b) => b.id)
  const totalReviews = businesses.reduce((s, b) => s + b.ratingCount, 0)
  const weighted = businesses.reduce((s, b) => s + Number(b.ratingAvg) * b.ratingCount, 0)
  const avg = totalReviews ? weighted / totalReviews : 0

  const unreplied = await db.review.count({
    where: { status: 'LIVE', reply: null, businessId: { in: ids } },
  })

  const recent = await db.review.findMany({
    where: { status: 'LIVE', businessId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: {
      user: { select: { name: true, email: true } },
      business: { select: { name: true } },
      reply: { select: { id: true } },
    },
  })

  const stats = [
    { label: 'Businesses', value: businesses.length, icon: Building2, accent: false },
    { label: 'Total reviews', value: totalReviews, icon: MessageSquareReply, accent: false },
    { label: 'Avg rating', value: avg ? avg.toFixed(1) : '—', icon: Star, accent: false },
    { label: 'Awaiting reply', value: unreplied, icon: MailWarning, accent: unreplied > 0 },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border bg-surface p-4 ${s.accent ? 'border-amber-300' : ''}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              <s.icon size={15} /> {s.label}
            </div>
            <div className={`mt-2 text-2xl font-bold ${s.accent ? 'text-amber-600' : ''}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Your businesses
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {businesses.map((b) => (
            <div key={b.id} className="rounded-xl border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/company/${b.slug}`} className="font-semibold hover:text-brand">
                    {b.name}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {b.category.name} · {b.city}, {b.state}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    STATUS[b.status] ?? STATUS.PENDING
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-lg font-bold">{Number(b.ratingAvg).toFixed(1)}</span>
                <Stars value={Number(b.ratingAvg)} size="sm" />
                <span className="text-xs text-muted">({b.ratingCount})</span>
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <Link
                  href={`/business/dashboard/reviews?b=${b.id}`}
                  className="rounded-md bg-background px-3 py-1.5 font-medium hover:bg-mint"
                >
                  Reviews
                </Link>
                <Link
                  href={`/business/dashboard/businesses/${b.id}/edit`}
                  className="rounded-md bg-background px-3 py-1.5 font-medium hover:bg-mint"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Recent reviews
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-xl border bg-surface p-6 text-sm text-muted">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((r) => (
              <div key={r.id} className="rounded-xl border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: colorFrom(r.user.email ?? r.id) }}
                  >
                    {initials(r.user.name ?? r.user.email)}
                  </span>
                  <span className="text-sm font-medium">{r.user.name ?? 'Anonymous'}</span>
                  <span className="text-xs text-muted">on {r.business.name}</span>
                  <span className="ml-auto text-xs text-muted">{formatDate(r.createdAt)}</span>
                </div>
                <div className="mt-1.5"><Stars value={r.rating} size="sm" /></div>
                <p className="mt-1 text-sm font-semibold">{r.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-foreground/90">{r.body}</p>
                {!r.reply && (
                  <Link
                    href={`/business/dashboard/reviews?b=${r.businessId}`}
                    className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
                  >
                    Reply →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
