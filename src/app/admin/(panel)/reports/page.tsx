import Link from 'next/link'
import { Stars } from '@/components/stars'
import type { Prisma, ReportStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { Badge, ConfirmButton } from '@/components/admin-ui'
import { SubmitButton } from '@/components/submit-button'
import { setReportStatus, resolveReportRemoveReview } from '@/lib/admin-actions'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUSES: (ReportStatus | 'ALL')[] = ['OPEN', 'RESOLVED', 'DISMISSED', 'ALL']

export default async function AdminReports({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filter: ReportStatus | 'ALL' = STATUSES.includes(status as ReportStatus)
    ? (status as ReportStatus | 'ALL')
    : 'OPEN'

  const where: Prisma.ReviewReportWhereInput = {}
  if (filter !== 'ALL') where.status = filter

  const reports = await db.reviewReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      review: {
        include: {
          user: { select: { name: true, email: true } },
          business: { select: { name: true, slug: true } },
        },
      },
    },
  })

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Reported reviews</h2>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = filter === s
          const href = s === 'OPEN' ? '/admin/reports' : `/admin/reports?status=${s}`
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

      {reports.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">
          Nothing here. {filter === 'OPEN' && 'No open reports 🎉'}
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div key={rep.id} className="rounded-xl border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-danger">
                  {rep.reason}
                </span>
                <span className="text-xs text-muted">
                  reported by {rep.user.name ?? rep.user.email} · {formatDate(rep.createdAt)}
                </span>
                <span className="ml-auto">
                  <Badge status={rep.status} />
                </span>
              </div>
              {rep.detail && <p className="mt-2 text-sm text-foreground/90">“{rep.detail}”</p>}

              <div className="mt-3 rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={rep.review.rating} size="sm" />
                  <span className="text-sm font-medium">{rep.review.title}</span>
                  <Badge status={rep.review.status} />
                </div>
                <p className="mt-1 text-sm text-foreground/90">{rep.review.body}</p>
                <p className="mt-1 text-xs text-muted">
                  by {rep.review.user.name ?? rep.review.user.email} on{' '}
                  <Link href={`/company/${rep.review.business.slug}`} className="hover:text-brand">
                    {rep.review.business.name}
                  </Link>
                </p>
              </div>

              {rep.status === 'OPEN' && (
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                  <form action={resolveReportRemoveReview}>
                    <input type="hidden" name="id" value={rep.id} />
                    <ConfirmButton
                      message="Remove this review and resolve the report?"
                      className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Remove review & resolve
                    </ConfirmButton>
                  </form>
                  <form action={setReportStatus}>
                    <input type="hidden" name="id" value={rep.id} />
                    <input type="hidden" name="status" value="DISMISSED" />
                    <SubmitButton
                      pendingLabel="Dismissing…"
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted hover:bg-background"
                    >
                      Dismiss (keep review)
                    </SubmitButton>
                  </form>
                  <form action={setReportStatus}>
                    <input type="hidden" name="id" value={rep.id} />
                    <input type="hidden" name="status" value="RESOLVED" />
                    <SubmitButton
                      pendingLabel="Saving…"
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted hover:bg-background"
                    >
                      Mark resolved
                    </SubmitButton>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
