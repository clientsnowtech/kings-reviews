import Link from 'next/link'
import { ExternalLink, Trash2, Search, Pencil, BadgeCheck, Award, LogIn } from 'lucide-react'
import type { Prisma, BusinessStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { Stars } from '@/components/stars'
import { Badge } from '@/components/admin-ui'
import { SubmitButton } from '@/components/submit-button'
import { Pagination } from '@/components/pagination'
import {
  setBusinessStatus,
  deleteBusiness,
  bulkBusinessStatus,
  setBadgeEnabled,
  actAsOwner,
} from '@/lib/admin-actions'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PER_PAGE = 25
const STATUSES: (BusinessStatus | 'ALL')[] = ['ALL', 'PENDING', 'LIVE', 'SUSPENDED', 'REJECTED']

const NEXT_ACTIONS: Record<BusinessStatus, { status: BusinessStatus; label: string; cls: string }[]> = {
  PENDING: [
    { status: 'LIVE', label: 'Approve', cls: 'bg-brand text-white hover:bg-brand-strong' },
    { status: 'REJECTED', label: 'Reject', cls: 'border text-danger hover:bg-red-50' },
  ],
  LIVE: [{ status: 'SUSPENDED', label: 'Suspend', cls: 'border text-danger hover:bg-red-50' }],
  SUSPENDED: [{ status: 'LIVE', label: 'Reinstate', cls: 'bg-brand text-white hover:bg-brand-strong' }],
  REJECTED: [{ status: 'LIVE', label: 'Approve', cls: 'bg-brand text-white hover:bg-brand-strong' }],
}

export default async function AdminBusinesses({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status, q, page: pageRaw } = await searchParams
  const filter = STATUSES.includes(status as BusinessStatus) ? (status as BusinessStatus) : 'ALL'
  const page = Math.max(1, Number(pageRaw) || 1)

  const where: Prisma.BusinessWhereInput = {}
  if (filter !== 'ALL') where.status = filter
  if (q) where.OR = [{ name: { contains: q } }, { city: { contains: q } }, { email: { contains: q } }]

  const [total, businesses] = await Promise.all([
    db.business.count({ where }),
    db.business.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: { select: { name: true } }, owner: { select: { email: true } } },
    }),
  ])
  const pageCount = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Businesses</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/businesses/new"
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-strong"
          >
            Add business
          </Link>
          <Link
            href="/admin/businesses/import"
            className="rounded-lg border px-3 py-1.5 text-sm font-medium text-muted hover:bg-mint"
          >
            Import CSV
          </Link>
          <a
            href="/admin/export/businesses"
            className="rounded-lg border px-3 py-1.5 text-sm font-medium text-muted hover:bg-mint"
          >
            Export CSV
          </a>
          <form className="relative">
            {filter !== 'ALL' && <input type="hidden" name="status" value={filter} />}
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, city, email…"
              className="h-9 w-64 rounded-full border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </form>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = filter === s
          const params = new URLSearchParams()
          if (s !== 'ALL') params.set('status', s)
          if (q) params.set('q', q)
          const href = `/admin/businesses${params.toString() ? `?${params}` : ''}`
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

      {/* bulk action bar — checkboxes below associate via form="bulkBiz" */}
      <form
        id="bulkBiz"
        action={bulkBusinessStatus}
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-surface p-2.5 text-sm"
      >
        <span className="px-1 text-muted">With selected:</span>
        <select name="bulkStatus" className="h-8 rounded-md border bg-background px-2 outline-none focus:border-brand">
          <option value="LIVE">Approve (Live)</option>
          <option value="SUSPENDED">Suspend</option>
          <option value="REJECTED">Reject</option>
          <option value="PENDING">Mark pending</option>
        </select>
        <SubmitButton
          pendingLabel="Applying…"
          className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-strong"
        >
          Apply
        </SubmitButton>
      </form>

      {businesses.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">No businesses found.</p>
      ) : (
        <div className="space-y-3">
          {businesses.map((b) => (
            <div key={b.id} className="rounded-xl border bg-surface p-4">
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  name="ids"
                  value={b.id}
                  form="bulkBiz"
                  className="mt-1"
                  aria-label={`Select ${b.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/company/${b.slug}`} className="font-semibold hover:text-brand">
                      {b.name}
                    </Link>
                    <Badge status={b.status} />
                    {b.verifiedAt && <BadgeCheck size={15} className="text-brand" aria-label="Verified" />}
                    <Link href={`/company/${b.slug}`} className="text-muted hover:text-brand" title="Open public page">
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {b.category.name} · {b.city}, {b.state} · owner {b.owner.email} · {formatDate(b.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-center text-sm">
                  <div>
                    <div className="font-bold">{Number(b.ratingAvg).toFixed(1)}</div>
                    <Stars value={Number(b.ratingAvg)} size="sm" />
                  </div>
                  <div className="text-muted">{b.ratingCount} rev</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                {NEXT_ACTIONS[b.status].map((a) => (
                  <form key={a.status} action={setBusinessStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value={a.status} />
                    <SubmitButton
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${a.cls}`}
                      pendingLabel="Saving…"
                    >
                      {a.label}
                    </SubmitButton>
                  </form>
                ))}
                <Link
                  href={`/admin/businesses/${b.id}/edit`}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted hover:bg-mint"
                >
                  <Pencil size={13} /> Edit
                </Link>
                <form action={actAsOwner}>
                  <input type="hidden" name="businessId" value={b.id} />
                  <SubmitButton
                    title="Open this business's own dashboard as its owner"
                    pendingLabel="Opening…"
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted hover:bg-mint"
                  >
                    <LogIn size={13} /> Open dashboard
                  </SubmitButton>
                </form>
                <form action={setBadgeEnabled}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="enabled" value={b.badgeEnabled ? '0' : '1'} />
                  <SubmitButton
                    title={
                      b.badgeEnabled
                        ? 'Stop serving this listing’s embeddable badge'
                        : 'Serve the embeddable badge again'
                    }
                    pendingLabel="Saving…"
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      b.badgeEnabled ? 'text-muted hover:text-danger' : 'text-brand hover:bg-mint'
                    }`}
                  >
                    <Award size={13} /> {b.badgeEnabled ? 'Revoke badge' : 'Restore badge'}
                  </SubmitButton>
                </form>
                <form action={deleteBusiness} className="ml-auto">
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton
                    confirmMessage={`Delete "${b.name}" and all its reviews? This cannot be undone.`}
                    pendingLabel="Deleting…"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-danger"
                  >
                    <Trash2 size={13} /> Delete
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        basePath="/admin/businesses"
        page={page}
        pageCount={pageCount}
        total={total}
        params={{ status: filter === 'ALL' ? undefined : filter, q }}
      />
    </div>
  )
}
