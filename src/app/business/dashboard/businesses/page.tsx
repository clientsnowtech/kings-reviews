import Link from 'next/link'
import { Plus, ExternalLink, Pencil, MessageSquareText } from 'lucide-react'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/business'
import { Stars } from '@/components/stars'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  LIVE: 'bg-mint text-brand-strong',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}

export default async function BusinessesPage() {
  const session = await requireUser()

  const businesses = await db.business.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } } },
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">My businesses</h2>
        <Link
          href="/business/dashboard/businesses/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          <Plus size={16} /> Add business
        </Link>
      </div>

      {businesses.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">
          No businesses yet.
        </p>
      ) : (
        <div className="space-y-4">
          {businesses.map((b) => (
            <div key={b.id} className="rounded-xl border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/company/${b.slug}`} className="text-lg font-bold hover:text-brand">
                      {b.name}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        STATUS[b.status] ?? STATUS.PENDING
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {b.category.name} · {b.city}, {b.state}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-semibold">{Number(b.ratingAvg).toFixed(1)}</span>
                    <Stars value={Number(b.ratingAvg)} size="sm" />
                    <span className="text-xs text-muted">{b.ratingCount} reviews</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                  <Link
                    href={`/business/dashboard/reviews?b=${b.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 font-medium hover:bg-mint"
                  >
                    <MessageSquareText size={14} /> Reviews
                  </Link>
                  <Link
                    href={`/business/dashboard/businesses/${b.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 font-medium hover:bg-mint"
                  >
                    <Pencil size={14} /> Edit
                  </Link>
                  <Link
                    href={`/company/${b.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 font-medium hover:bg-mint"
                  >
                    <ExternalLink size={14} /> View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
