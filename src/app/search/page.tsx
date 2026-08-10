import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'
import { CategoryIcon } from '@/components/category-icon'
import { listCities } from '@/lib/cities'

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

  // A search for a city or a trade is not a search for one business, and the top
  // 60 by review count is the wrong answer to it — the city and category pages
  // are, so those are offered above the listings.
  const [businesses, categories, allCities] = await Promise.all([
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
    query
      ? db.category.findMany({
          where: { name: { contains: query } },
          orderBy: { sort: 'asc' },
          take: 6,
          select: { id: true, name: true, slug: true, icon: true },
        })
      : [],
    query ? listCities() : [],
  ])

  const needle = query.toLowerCase()
  const cities = allCities
    .filter((c) => c.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(needle) ? 0 : 1
      const bStarts = b.name.toLowerCase().startsWith(needle) ? 0 : 1
      return aStarts - bStarts || b.count - a.count
    })
    .slice(0, 6)

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

      {(categories.length > 0 || cities.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={`c${c.id}`}
              href={`/category/${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-4 py-1.5 text-sm transition hover:border-brand hover:text-brand"
            >
              <CategoryIcon name={c.icon} size={14} />
              {c.name}
            </Link>
          ))}
          {cities.map((c) => (
            <Link
              key={`l${c.slug}`}
              href={`/city/${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 px-4 py-1.5 text-sm text-brand hover:bg-brand/10"
            >
              <MapPin size={14} />
              {c.name}
              <span className="text-brand/70">{c.count.toLocaleString('en-IN')}</span>
            </Link>
          ))}
        </div>
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
