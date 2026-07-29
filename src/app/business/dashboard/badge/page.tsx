import Link from 'next/link'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/business'
import { badgeViewStats } from '@/lib/badge-server'
import { BadgeStudio } from '@/components/badge-studio'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

export default async function BadgePage() {
  const session = await requireUser('/business/dashboard/badge')

  const rows = await db.business.findMany({
    where: { ownerId: session.user.id },
    orderBy: [{ status: 'asc' }, { ratingCount: 'desc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      ratingAvg: true,
      ratingCount: true,
      verifiedAt: true,
      badgeEnabled: true,
    },
  })

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-8 text-center text-muted">
        List a business to get your badge.{' '}
        <Link
          href="/business/dashboard/businesses/new"
          className="font-medium text-brand hover:underline"
        >
          List one
        </Link>
      </p>
    )
  }

  // where the badge is actually being displayed, last 30 days
  const stats = await badgeViewStats(rows.map((r) => r.id))

  const businesses = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    ratingAvg: Number(r.ratingAvg),
    ratingCount: r.ratingCount,
    verified: r.verifiedAt !== null,
    badgeEnabled: r.badgeEnabled,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Trust badge</h2>
        <p className="mt-1 text-sm text-muted">
          Show your rating on your own website. Pick a style, copy the code, paste it anywhere.
        </p>
      </div>

      <BadgeStudio businesses={businesses} appUrl={APP_URL} stats={stats} />
    </div>
  )
}
