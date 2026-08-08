import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { ChevronRight } from 'lucide-react'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'
import { CategoryIcon } from '@/components/category-icon'
import { categoryJsonLd, categoryMetadata, humanList } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const SORTS = {
  top: { label: 'Top rated', orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }] },
  reviewed: { label: 'Most reviewed', orderBy: [{ ratingCount: 'desc' }] },
  newest: { label: 'Newest', orderBy: [{ createdAt: 'desc' }] },
} as const

type SortKey = keyof typeof SORTS

/** A business can be filed under several trades; this page is any of them. */
function listedIn(categoryId: number): Prisma.BusinessWhereInput {
  return {
    OR: [{ categoryId }, { extraCategories: { some: { id: categoryId } } }],
    status: 'LIVE',
  }
}

// generateMetadata and the page body both need the category and its numbers.
// react cache() de-duplicates them within a request, so the head costs no extra
// round trip.
const getCategory = cache((slug: string) => db.category.findUnique({ where: { slug } }))

const getStats = cache(async (categoryId: number, city?: string) => {
  const where = { ...listedIn(categoryId), ...(city ? { city } : {}) }
  const [agg, cities] = await Promise.all([
    db.business.aggregate({
      where,
      _count: { _all: true },
      _sum: { ratingCount: true },
      _avg: { ratingAvg: true },
    }),
    db.business.findMany({
      where: listedIn(categoryId),
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    }),
  ])

  return {
    count: agg._count._all,
    reviewCount: agg._sum.ratingCount ?? 0,
    averageRating: agg._avg.ratingAvg ? Number(agg._avg.ratingAvg) : 0,
    cities: cities.map((c) => c.city),
  }
})

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; city?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { sort, city } = await searchParams

  const category = await getCategory(slug)
  if (!category) return { title: 'Category not found', robots: { index: false, follow: false } }

  const stats = await getStats(category.id, city)

  return categoryMetadata({
    name: category.name,
    slug: category.slug,
    count: stats.count,
    cities: stats.cities,
    city,
    // any sort other than the default renders the same listings in a new order
    filteredView: Boolean(sort) && sort !== 'top',
    reviewCount: stats.reviewCount,
    averageRating: stats.averageRating,
  })
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; city?: string }>
}) {
  const { slug } = await params
  const { sort = 'top', city } = await searchParams

  const category = await getCategory(slug)
  if (!category) notFound()

  const sortKey = (sort in SORTS ? sort : 'top') as SortKey

  const where: Prisma.BusinessWhereInput = {
    ...listedIn(category.id),
    ...(city ? { city } : {}),
  }

  const [businesses, stats] = await Promise.all([
    db.business.findMany({
      where,
      orderBy: [...SORTS[sortKey].orderBy] as Prisma.BusinessOrderByWithRelationInput[],
      include: { category: { select: { name: true, slug: true } } },
      take: 60,
    }),
    getStats(category.id, city),
  ])

  // The same sentence the crawler reads in <meta name="description"> — visible
  // copy backing the tag, rather than a keyword living only in the head.
  const intro = `Looking for the best ${category.name.toLowerCase()}${city ? ` in ${city}` : ' in India'}? ${
    stats.count > 0
      ? `Compare ${stats.count} listing${stats.count === 1 ? '' : 's'}${
          stats.reviewCount > 0
            ? ` backed by ${stats.reviewCount.toLocaleString('en-IN')} genuine customer review${
                stats.reviewCount === 1 ? '' : 's'
              }`
            : ''
        }${!city && stats.cities.length > 1 ? ` across ${humanList(stats.cities)}` : ''}.`
      : 'No listings here yet — be the first to add one.'
  }`

  const jsonLd = categoryJsonLd({
    name: category.name,
    slug: category.slug,
    description: intro,
    businesses,
    city,
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted">
        <Link href="/" className="hover:text-brand">Home</Link>
        <ChevronRight size={13} />
        <Link href="/categories" className="hover:text-brand">Categories</Link>
        <ChevronRight size={13} />
        <span className="text-foreground/70">{category.name}</span>
        {city && (
          <>
            <ChevronRight size={13} />
            <span className="text-foreground/70">{city}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-brand/10 text-brand">
          <CategoryIcon name={category.icon} category={category.name} size={28} />
        </span>
        <div>
          <h1 className="text-3xl font-bold">
            {city ? `${category.name} in ${city}` : category.name}
          </h1>
          <p className="text-muted">{businesses.length} businesses{city ? ` in ${city}` : ''}</p>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{intro}</p>

      {/* filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        {Object.entries(SORTS).map(([key, s]) => (
          <Link
            key={key}
            href={`/category/${slug}?sort=${key}${city ? `&city=${encodeURIComponent(city)}` : ''}`}
            className={`rounded-full border px-4 py-1.5 ${
              sortKey === key ? 'border-brand bg-brand/10 font-medium text-brand' : 'bg-surface hover:border-brand'
            }`}
          >
            {s.label}
          </Link>
        ))}

        {stats.cities.length > 1 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              href={`/category/${slug}?sort=${sortKey}`}
              className={`rounded-full border px-3 py-1.5 ${!city ? 'border-brand bg-brand/10 text-brand' : 'bg-surface hover:border-brand'}`}
            >
              All cities
            </Link>
            {stats.cities.map((c) => (
              <Link
                key={c}
                href={`/category/${slug}?sort=${sortKey}&city=${encodeURIComponent(c)}`}
                className={`rounded-full border px-3 py-1.5 ${city === c ? 'border-brand bg-brand/10 text-brand' : 'bg-surface hover:border-brand'}`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}
      </div>

      {businesses.length === 0 ? (
        <p className="mt-8 rounded-xl border bg-surface p-8 text-center text-muted">
          No businesses listed here yet.{' '}
          <Link href="/business/register" className="font-medium text-brand hover:underline">
            Add one
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
