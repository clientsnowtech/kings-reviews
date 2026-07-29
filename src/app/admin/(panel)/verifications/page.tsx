import Link from 'next/link'
import { ExternalLink, BadgeCheck } from 'lucide-react'
import { db } from '@/lib/db'
import { Stars } from '@/components/stars'
import { SubmitButton } from '@/components/submit-button'
import { approveVerification, rejectVerification } from '@/lib/admin-actions'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminVerifications() {
  const pending = await db.business.findMany({
    where: { verifyRequestedAt: { not: null }, verifiedAt: null },
    orderBy: { verifyRequestedAt: 'asc' },
    include: { category: { select: { name: true } }, owner: { select: { email: true } } },
  })

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Verification requests</h2>
      <p className="text-sm text-muted">Businesses that asked for a verified badge.</p>

      {pending.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">No pending requests.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((b) => (
            <div key={b.id} className="rounded-xl border bg-surface p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/company/${b.slug}`} className="font-semibold hover:text-brand">
                      {b.name}
                    </Link>
                    <Link href={`/company/${b.slug}`} className="text-muted hover:text-brand" title="Open public page">
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {b.category.name} · {b.city}, {b.state} · owner {b.owner.email} · requested{' '}
                    {b.verifyRequestedAt ? formatDate(b.verifyRequestedAt) : ''}
                  </p>
                </div>
                <div className="text-center text-sm">
                  <div className="font-bold">{Number(b.ratingAvg).toFixed(1)}</div>
                  <Stars value={Number(b.ratingAvg)} size="sm" />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                <form action={approveVerification}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton
                    pendingLabel="Verifying…"
                    className="gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-strong"
                  >
                    <BadgeCheck size={14} /> Approve & verify
                  </SubmitButton>
                </form>
                <form action={rejectVerification}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton
                    pendingLabel="Rejecting…"
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted hover:bg-red-50 hover:text-danger"
                  >
                    Reject request
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
