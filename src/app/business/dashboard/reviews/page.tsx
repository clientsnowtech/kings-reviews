import Link from 'next/link'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/business'
import { moderateReview } from '@/lib/business-actions'
import { Stars } from '@/components/stars'
import { AskForReview } from '@/components/ask-for-review'
import { askTargets } from '@/lib/review-link'
import { ReplyForm } from '@/components/reply-form'
import { SubmitButton } from '@/components/submit-button'
import { publishOverdueReviews, autoPublishDate, AUTO_PUBLISH_DAYS } from '@/lib/review-sla'
import { colorFrom, initials, formatDate, cn } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** Owners see what is waiting on them and what is already published. Rejected
 *  reviews stay with the admins — an owner should not be able to re-open their
 *  own rejection. */
const TABS = [
  { key: 'pending', label: 'Awaiting approval', status: 'PENDING' as const },
  { key: 'live', label: 'Published', status: 'LIVE' as const },
]

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; f?: string; s?: string }>
}) {
  const { ownerId } = await requireOwner()
  const { b, f, s } = await searchParams

  const businesses = await db.business.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, status: true },
  })
  const ids = businesses.map((x) => x.id)

  if (ids.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-8 text-center text-muted">
        List a business first to receive reviews.{' '}
        <Link href="/business/dashboard/businesses/new" className="font-medium text-brand hover:underline">
          List one
        </Link>
      </p>
    )
  }

  // the approval deadline applies whether or not the owner opens this page
  await Promise.all(ids.map((id) => publishOverdueReviews(id)))

  // an unapproved listing has no public page yet, so there is nothing to share
  const targets = await askTargets(businesses.filter((x) => x.status === 'LIVE'))

  const tab = TABS.find((t) => t.key === s) ?? TABS[1]
  const pending = tab.status === 'PENDING'
  const activeBiz = b && ids.includes(b) ? b : null
  const where: Prisma.ReviewWhereInput = {
    status: tab.status,
    businessId: activeBiz ? activeBiz : { in: ids },
    // an unapproved review cannot be replied to yet, so that filter only
    // means anything on the published tab
    ...(f === 'unreplied' && !pending ? { reply: null } : {}),
  }

  const [reviews, pendingCount] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        business: { select: { name: true } },
        reply: true,
      },
    }),
    db.review.count({ where: { status: 'PENDING', businessId: { in: ids } } }),
  ])

  // mark this owner's reviews as seen so the "new" indicator clears
  await db.business.updateMany({
    where: { ownerId },
    data: { reviewsSeenAt: new Date() },
  })

  const mkHref = (params: { b?: string | null; f?: string | null; s?: string | null }) => {
    const sp = new URLSearchParams()
    const nb = params.b === undefined ? activeBiz : params.b
    const nf = params.f === undefined ? f : params.f
    const ns = params.s === undefined ? s : params.s
    if (nb) sp.set('b', nb)
    if (nf) sp.set('f', nf)
    if (ns) sp.set('s', ns)
    const q = sp.toString()
    return q ? `?${q}` : '/business/dashboard/reviews'
  }

  const chip = (active: boolean) =>
    cn(
      'rounded-full px-3 py-1.5 text-sm font-medium transition',
      active ? 'bg-brand text-white' : 'bg-surface text-muted hover:bg-mint hover:text-foreground',
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={mkHref({ b: null })} className={chip(!activeBiz)}>
          All businesses
        </Link>
        {businesses.map((x) => (
          <Link key={x.id} href={mkHref({ b: x.id })} className={chip(activeBiz === x.id)}>
            {x.name}
          </Link>
        ))}
        {/* An empty tab is exactly when an owner needs this most. */}
        <AskForReview businesses={targets} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong" />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={mkHref({ s: t.key === 'live' ? null : t.key, f: null })}
            className={chip(tab.key === t.key)}
          >
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-star px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
        {!pending && (
          <Link
            href={mkHref({ f: f === 'unreplied' ? null : 'unreplied' })}
            className={chip(f === 'unreplied')}
          >
            Needs reply
          </Link>
        )}
        <span className="ml-auto text-sm text-muted">{reviews.length} shown</span>
      </div>

      {pending && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          New reviews stay hidden until you approve them, and they only count towards your rating
          once published. Leave one for {AUTO_PUBLISH_DAYS} days and it publishes on its own — a
          review is not yours to bury. Rejections need a reason and are logged for our team.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">
          {pending ? 'Nothing waiting on you.' : 'No reviews here.'}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: colorFrom(r.user.email ?? r.id) }}
                >
                  {initials(r.user.name ?? r.user.email)}
                </span>
                <span className="text-sm font-medium">{r.user.name ?? 'Anonymous'}</span>
                {!activeBiz && <span className="text-xs text-muted">on {r.business.name}</span>}
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                {pending ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Awaiting approval
                  </span>
                ) : (
                  !r.reply && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Needs reply
                    </span>
                  )
                )}
                <span className="ml-auto"><Stars value={r.rating} size="sm" /></span>
              </div>
              <p className="mt-2 text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm text-foreground/90">{r.body}</p>

              {pending ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted">
                    Publishes on its own on {formatDate(autoPublishDate(r.createdAt))} if you do
                    nothing.
                  </p>
                  <div className="flex flex-wrap items-start gap-2">
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="LIVE" />
                      <SubmitButton
                        pendingLabel="Publishing…"
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
                      >
                        Approve &amp; publish
                      </SubmitButton>
                    </form>
                    <form action={moderateReview} className="flex flex-wrap items-start gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="REMOVED" />
                      <input
                        name="reason"
                        required
                        maxLength={500}
                        placeholder="Why? The reviewer sees this."
                        className="h-9 w-64 rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
                      />
                      <SubmitButton
                        pendingLabel="Rejecting…"
                        confirmMessage="Reject this review? The reviewer sees your reason and our team is notified."
                        className="rounded-lg border px-4 py-2 text-sm font-medium text-danger hover:bg-red-50"
                      >
                        Reject
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ) : (
                <ReplyForm reviewId={r.id} existing={r.reply?.body} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
