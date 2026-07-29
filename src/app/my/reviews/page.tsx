import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { Stars } from '@/components/stars'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My reviews' }
export const dynamic = 'force-dynamic'

export default async function MyReviewsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?next=/my/reviews')

  const reviews = await db.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { business: { select: { name: true, slug: true } } },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">My reviews</h1>

      {reviews.length === 0 ? (
        <p className="mt-8 rounded-xl border bg-surface p-8 text-center text-muted">
          You haven’t written any reviews yet.{' '}
          <Link href="/" className="font-medium text-brand hover:underline">
            Find a business
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-surface p-5">
              <div className="flex items-center justify-between">
                <Link href={`/company/${r.business.slug}`} className="font-semibold hover:text-brand">
                  {r.business.name}
                </Link>
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <div className="mt-1.5"><Stars value={r.rating} size="sm" /></div>
              <p className="mt-2 font-medium">{r.title}</p>
              <p className="mt-0.5 text-sm text-foreground/90">{r.body}</p>
              <Link
                href={`/company/${r.business.slug}`}
                className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
              >
                Edit on business page →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
