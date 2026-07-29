import Link from 'next/link'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/business'
import { Stars } from '@/components/stars'
import { ReplyForm } from '@/components/reply-form'
import { colorFrom, initials, formatDate, cn } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; f?: string }>
}) {
  const session = await requireUser()
  const { b, f } = await searchParams

  const businesses = await db.business.findMany({
    where: { ownerId: session.user.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
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

  const activeBiz = b && ids.includes(b) ? b : null
  const where: Prisma.ReviewWhereInput = {
    status: 'LIVE',
    businessId: activeBiz ? activeBiz : { in: ids },
    ...(f === 'unreplied' ? { reply: null } : {}),
  }

  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      business: { select: { name: true } },
      reply: true,
    },
  })

  // mark this owner's reviews as seen so the "new" indicator clears
  await db.business.updateMany({
    where: { ownerId: session.user.id },
    data: { reviewsSeenAt: new Date() },
  })

  const mkHref = (params: { b?: string | null; f?: string | null }) => {
    const sp = new URLSearchParams()
    const nb = params.b === undefined ? activeBiz : params.b
    const nf = params.f === undefined ? f : params.f
    if (nb) sp.set('b', nb)
    if (nf) sp.set('f', nf)
    const s = sp.toString()
    return s ? `?${s}` : '/business/dashboard/reviews'
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
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Link href={mkHref({ f: null })} className={chip(f !== 'unreplied')}>
          All
        </Link>
        <Link href={mkHref({ f: 'unreplied' })} className={chip(f === 'unreplied')}>
          Needs reply
        </Link>
        <span className="ml-auto text-sm text-muted">{reviews.length} shown</span>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">No reviews here.</p>
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
                {!r.reply && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Needs reply
                  </span>
                )}
                <span className="ml-auto"><Stars value={r.rating} size="sm" /></span>
              </div>
              <p className="mt-2 text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm text-foreground/90">{r.body}</p>
              <ReplyForm reviewId={r.id} existing={r.reply?.body} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
