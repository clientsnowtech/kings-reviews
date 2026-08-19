import type { Metadata } from 'next'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { db } from '@/lib/db'
import { requireOwner } from '@/lib/business'
import { stopActingAsOwner } from '@/lib/admin-actions'
import { BusinessSidebar } from '@/components/business-sidebar'
import { SubmitButton } from '@/components/submit-button'

export const metadata: Metadata = { title: 'Business panel · Kings Reviews' }
export const dynamic = 'force-dynamic'

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, ownerId, actingAs } = await requireOwner()

  // Whose panel this is — the admin's own email would be misleading here.
  const owner = actingAs
    ? await db.user.findUnique({ where: { id: actingAs }, select: { email: true, name: true } })
    : null

  const [unreplied, pendingReviews] = await Promise.all([
    db.review.count({
      where: {
        status: 'LIVE',
        reply: null,
        business: { ownerId },
      },
    }),
    // reviews this owner has to accept before they appear anywhere
    db.review.count({ where: { status: 'PENDING', business: { ownerId } } }),
  ])

  // reviews arrived since the owner last opened that business's reviews
  const newRows = await db.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*) AS c FROM Review r
    JOIN Business b ON r.businessId = b.id
    WHERE b.ownerId = ${ownerId}
      AND r.status IN ('LIVE', 'PENDING')
      AND (b.reviewsSeenAt IS NULL OR r.createdAt > b.reviewsSeenAt)
  `
  const newReviews = Number(newRows[0]?.c ?? 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {actingAs && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <span className="font-medium text-amber-900">
            Viewing as {owner?.name || owner?.email || 'this owner'} — anything you change is saved
            to their account.
          </span>
          <form action={stopActingAsOwner} className="ml-auto">
            <SubmitButton
              pendingLabel="Leaving…"
              className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Back to admin
            </SubmitButton>
          </form>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
          <Store size={18} />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight">Business panel</h1>
          <p className="text-xs text-muted">{owner?.email ?? session.user.email}</p>
        </div>
        <Link
          href="/"
          className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground"
        >
          ← Back to site
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[210px_1fr]">
        {/* min-w-0: without it this grid item sizes to the tab strip's full
            width and pushes the page past the viewport on phones. */}
        <aside className="min-w-0 md:sticky md:top-20 md:self-start">
          <BusinessSidebar
            unreplied={unreplied}
            newReviews={newReviews}
            pendingReviews={pendingReviews}
          />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
