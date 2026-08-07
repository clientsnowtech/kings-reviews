import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { Stars } from '@/components/stars'
import { autoPublishDate } from '@/lib/review-sla'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My reviews' }
export const dynamic = 'force-dynamic'

/** Nothing publishes on its own, so a reviewer needs to see where theirs is. */
const STATUS = {
  LIVE: { label: 'Published', cls: 'bg-mint text-brand-strong' },
  PENDING: { label: 'Awaiting approval', cls: 'bg-amber-100 text-amber-700' },
  REMOVED: { label: 'Not published', cls: 'bg-red-50 text-danger' },
} as const

export default async function MyReviewsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?next=/my/reviews')

  const reviews = await db.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { business: { select: { name: true, slug: true } } },
  })

  return (
    <div>
      {reviews.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">
          You haven’t written any reviews yet.{' '}
          <Link href="/" className="font-medium text-brand hover:underline">
            Find a business
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-surface p-5">
              <div className="flex items-center justify-between">
                <Link href={`/company/${r.business.slug}`} className="font-semibold hover:text-brand">
                  {r.business.name}
                </Link>
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Stars value={r.rating} size="sm" />
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    (STATUS[r.status] ?? STATUS.PENDING).cls
                  }`}
                >
                  {(STATUS[r.status] ?? STATUS.PENDING).label}
                </span>
              </div>
              <p className="mt-2 font-medium">{r.title}</p>
              <p className="mt-0.5 text-sm text-foreground/90">{r.body}</p>
              {r.status === 'REMOVED' && (
                <p className="mt-3 rounded-lg border border-danger/30 bg-red-50 p-3 text-sm text-danger">
                  <span className="font-medium">Not published:</span>{' '}
                  {r.rejectReason ?? 'No reason given.'} You can rewrite it and submit again.
                </p>
              )}
              {r.status === 'PENDING' && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Waiting for the business or our team. If nobody acts on it, it publishes by
                  itself on {formatDate(autoPublishDate(r.createdAt))}.
                </p>
              )}
              <Link
                href={`/company/${r.business.slug}`}
                className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
              >
                {r.status === 'REMOVED' ? 'Rewrite it' : 'Edit on business page'} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
