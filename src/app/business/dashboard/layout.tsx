import type { Metadata } from 'next'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/business'
import { BusinessSidebar } from '@/components/business-sidebar'

export const metadata: Metadata = { title: 'Business panel · TrustIndex' }
export const dynamic = 'force-dynamic'

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireUser()

  const unreplied = await db.review.count({
    where: {
      status: 'LIVE',
      reply: null,
      business: { ownerId: session.user.id },
    },
  })

  // reviews arrived since the owner last opened that business's reviews
  const newRows = await db.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*) AS c FROM Review r
    JOIN Business b ON r.businessId = b.id
    WHERE b.ownerId = ${session.user.id}
      AND r.status = 'LIVE'
      AND (b.reviewsSeenAt IS NULL OR r.createdAt > b.reviewsSeenAt)
  `
  const newReviews = Number(newRows[0]?.c ?? 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
          <Store size={18} />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight">Business panel</h1>
          <p className="text-xs text-muted">{session.user.email}</p>
        </div>
        <Link
          href="/"
          className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground"
        >
          ← Back to site
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[210px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <BusinessSidebar unreplied={unreplied} newReviews={newReviews} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
