import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import type { Prisma, ReviewStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { Stars } from '@/components/stars'
import { Badge, ConfirmButton } from '@/components/admin-ui'
import { SubmitButton } from '@/components/submit-button'
import { Pagination } from '@/components/pagination'
import { setReviewStatus, deleteReview, bulkReviewStatus } from '@/lib/admin-actions'
import { colorFrom, initials, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PER_PAGE = 25
const STATUSES: (ReviewStatus | 'ALL')[] = ['ALL', 'PENDING', 'LIVE', 'REMOVED']

const NEXT_ACTIONS: Record<ReviewStatus, { status: ReviewStatus; label: string; cls: string }[]> = {
  LIVE: [{ status: 'REMOVED', label: 'Remove', cls: 'border text-danger hover:bg-red-50' }],
  PENDING: [
    { status: 'LIVE', label: 'Approve', cls: 'bg-brand text-white hover:bg-brand-strong' },
    { status: 'REMOVED', label: 'Remove', cls: 'border text-danger hover:bg-red-50' },
  ],
  REMOVED: [{ status: 'LIVE', label: 'Restore', cls: 'bg-brand text-white hover:bg-brand-strong' }],
}

export default async function AdminReviews({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageRaw } = await searchParams
  const filter = STATUSES.includes(status as ReviewStatus) ? (status as ReviewStatus) : 'ALL'
  const page = Math.max(1, Number(pageRaw) || 1)

  const where: Prisma.ReviewWhereInput = {}
  if (filter !== 'ALL') where.status = filter

  const [total, reviews] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { name: true, email: true } },
        business: { select: { name: true, slug: true } },
        reports: { where: { status: 'OPEN' }, select: { id: true } },
      },
    }),
  ])
  const pageCount = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <a
          href="/admin/export/reviews"
          className="rounded-lg border px-3 py-1.5 text-sm font-medium text-muted hover:bg-mint"
        >
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = filter === s
          const href = s === 'ALL' ? '/admin/reviews' : `/admin/reviews?status=${s}`
          return (
            <Link
              key={s}
              href={href}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                active ? 'bg-brand text-white' : 'border text-muted hover:bg-mint'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          )
        })}
      </div>

      {/* bulk action bar — checkboxes below associate via form="bulkRev" */}
      <form
        id="bulkRev"
        action={bulkReviewStatus}
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-surface p-2.5 text-sm"
      >
        <span className="px-1 text-muted">With selected:</span>
        <select name="bulkStatus" className="h-8 rounded-md border bg-background px-2 outline-none focus:border-brand">
          <option value="REMOVED">Remove</option>
          <option value="LIVE">Approve / Restore</option>
          <option value="PENDING">Mark pending</option>
        </select>
        <SubmitButton
          pendingLabel="Applying…"
          className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-strong"
        >
          Apply
        </SubmitButton>
      </form>

      {reviews.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">No reviews found.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input type="checkbox" name="ids" value={r.id} form="bulkRev" aria-label="Select review" />
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: colorFrom(r.user.email ?? r.id) }}
                >
                  {initials(r.user.name ?? r.user.email)}
                </span>
                <span className="text-sm font-medium">{r.user.name ?? r.user.email}</span>
                <span className="text-xs text-muted">on</span>
                <Link href={`/company/${r.business.slug}`} className="text-sm font-medium hover:text-brand">
                  {r.business.name}
                </Link>
                <span className="ml-auto flex items-center gap-2">
                  {r.reports.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-danger">
                      {r.reports.length} report{r.reports.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <Badge status={r.status} />
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Stars value={r.rating} size="sm" />
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm text-foreground/90">{r.body}</p>

              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                {NEXT_ACTIONS[r.status].map((a) => (
                  <form key={a.status} action={setReviewStatus}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={a.status} />
                    <SubmitButton
                      pendingLabel="Saving…"
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${a.cls}`}
                    >
                      {a.label}
                    </SubmitButton>
                  </form>
                ))}
                <form action={deleteReview} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmButton
                    message="Permanently delete this review? This cannot be undone."
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-danger"
                  >
                    <Trash2 size={13} /> Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        basePath="/admin/reviews"
        page={page}
        pageCount={pageCount}
        total={total}
        params={{ status: filter === 'ALL' ? undefined : filter }}
      />
    </div>
  )
}
