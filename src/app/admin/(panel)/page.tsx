import Link from 'next/link'
import {
  Building2,
  MessageSquareText,
  Users,
  Flag,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { db } from '@/lib/db'
import { Stars } from '@/components/stars'
import { Badge } from '@/components/admin-ui'
import { formatDate, daysAgo } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const weekAgo = daysAgo(7)
  const [
    users,
    businesses,
    pendingBiz,
    reviews,
    pendingReviews,
    openReports,
    pendingVerify,
    weekUsers,
    weekBiz,
    weekReviews,
    recentBiz,
    recentReviews,
  ] = await Promise.all([
    db.user.count(),
    db.business.count(),
    db.business.count({ where: { status: 'PENDING' } }),
    db.review.count(),
    db.review.count({ where: { status: 'PENDING' } }),
    db.reviewReport.count({ where: { status: 'OPEN' } }),
    db.business.count({ where: { verifyRequestedAt: { not: null }, verifiedAt: null } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.business.count({ where: { createdAt: { gte: weekAgo } } }),
    db.review.count({ where: { createdAt: { gte: weekAgo } } }),
    db.business.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { category: { select: { name: true } } },
    }),
    db.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true, email: true } },
        business: { select: { name: true, slug: true } },
      },
    }),
  ])

  const stats = [
    { label: 'Users', value: users, week: weekUsers, icon: Users, href: '/admin/users' },
    { label: 'Businesses', value: businesses, week: weekBiz, icon: Building2, href: '/admin/businesses' },
    { label: 'Reviews', value: reviews, week: weekReviews, icon: MessageSquareText, href: '/admin/reviews' },
    { label: 'Open reports', value: openReports, week: 0, icon: Flag, href: '/admin/reports' },
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Overview</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border bg-surface p-5 transition hover:border-brand"
          >
            <s.icon size={20} className="text-brand" />
            <div className="mt-3 text-3xl font-bold">{s.value}</div>
            <div className="flex items-center gap-1.5 text-sm text-muted">
              {s.label}
              {s.week > 0 && <span className="font-medium text-brand">+{s.week} this week</span>}
            </div>
          </Link>
        ))}
      </div>

      {(pendingBiz > 0 || pendingReviews > 0 || openReports > 0 || pendingVerify > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingVerify > 0 && (
            <Link
              href="/admin/verifications"
              className="inline-flex items-center gap-2 rounded-lg border border-brand/40 bg-mint px-4 py-2 text-sm font-medium text-brand-strong"
            >
              <Clock size={15} /> {pendingVerify} verification request{pendingVerify > 1 ? 's' : ''}
            </Link>
          )}
          {pendingBiz > 0 && (
            <Link
              href="/admin/businesses?status=PENDING"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
            >
              <Clock size={15} /> {pendingBiz} businesses awaiting review
            </Link>
          )}
          {pendingReviews > 0 && (
            <Link
              href="/admin/reviews?status=PENDING"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
            >
              <Clock size={15} /> {pendingReviews} reviews awaiting moderation
            </Link>
          )}
          {openReports > 0 && (
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-danger"
            >
              <Flag size={15} /> {openReports} open reports
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Latest businesses</h3>
            <Link href="/admin/businesses" className="text-sm text-brand hover:underline">
              View all <ArrowRight size={13} className="inline" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentBiz.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
            {recentBiz.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="truncate text-xs text-muted">
                    {b.category.name} · {b.city} · {formatDate(b.createdAt)}
                  </p>
                </div>
                <Badge status={b.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Latest reviews</h3>
            <Link href="/admin/reviews" className="text-sm text-brand hover:underline">
              View all <ArrowRight size={13} className="inline" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentReviews.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
            {recentReviews.map((r) => (
              <div key={r.id} className="flex items-start gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted">
                    {r.business.name} · {r.user.name ?? r.user.email}
                  </p>
                </div>
                <Stars value={r.rating} size="sm" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
