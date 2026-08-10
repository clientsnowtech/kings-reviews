import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'
import { findCityBySlug } from '@/lib/cities'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { q } = await searchParams
  return { title: q ? `Search: ${q}` : 'Search' }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const query = q.trim()

  // A search for a city is a search for a place, and the top 60 by review count
  // is the wrong answer to it — the city's own page is, so it is offered.
  const [businesses, city] = await Promise.all([
    query
      ? db.business.findMany({
          where: {
            status: 'LIVE',
            OR: [
              { name: { contains: query } },
              { city: { contains: query } },
              { description: { contains: query } },
              { category: { name: { contains: query } } },
            ],
          },
          orderBy: [{ ratingCount: 'desc' }, { ratingAvg: 'desc' }],
          include: { category: { select: { name: true, slug: true } } },
          take: 60,
        })
      : [],
    query ? findCityBySlug(slugify(query)) : null,
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">
        {query ? (
          <>
            Results for <span className="text-brand">“{query}”</span>
          </>
        ) : (
          'Search businesses'
        )}
      </h1>
      <p className="mt-1 text-muted">
        {query ? `${businesses.length} found` : 'Type a company, category or city above.'}
      </p>

      {city && (
        <Link
          href={`/city/${city.slug}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 px-4 py-1.5 text-sm text-brand hover:bg-brand/10"
        >
          <MapPin size={14} />
          All {city.count.toLocaleString('en-IN')} businesses in {city.name}
        </Link>
      )}

      {query && businesses.length === 0 ? (
        <p className="mt-8 rounded-xl border bg-surface p-8 text-center text-muted">
          Nothing matched.{' '}
          <Link href="/business/register" className="font-medium text-brand hover:underline">
            List a business
          </Link>
          .
        </p>
      ) : (
        <div className="stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  )
}
