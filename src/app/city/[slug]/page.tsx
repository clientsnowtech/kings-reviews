import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { ChevronRight, MapPin } from 'lucide-react'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'
import { Pagination } from '@/components/pagination'
import { findCityBySlug } from '@/lib/cities'
import { cityJsonLd, cityMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const SORTS = {
  top: { label: 'Top rated', orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }] },
  reviewed: { label: 'Most reviewed', orderBy: [{ ratingCount: 'desc' }] },
  newest: { label: 'Newest', orderBy: [{ createdAt: 'desc' }] },
} as const

type SortKey = keyof typeof SORTS

const PER_PAGE = 24

type SP = { sort?: string; category?: string; page?: string }

/**
 * The trades actually practised in this city.
 *
 * The category table holds four thousand Google names and a city uses a few
 * hundred of them at most, so the chips come from the listings rather than from
 * the catalogue.
 */
const getCityCategories = cache(async (city: string) => {
  const rows = await db.business.groupBy({
    by: ['categoryId'],
    where: { status: 'LIVE', city },
    _count: { _all: true },
  })
  const top = rows.sort((a, b) => b._count._all - a._count._all).slice(0, 24)
  if (top.length === 0) return []

  const names = await db.category.findMany({
    where: { id: { in: top.map((r) => r.categoryId) } },
    select: { id: true, name: true, slug: true },
  })
  const byId = new Map(names.map((c) => [c.id, c]))

  return top
    .map((r) => ({ found: byId.get(r.categoryId), count: r._count._all }))
    .filter((r): r is { found: { id: number; name: string; slug: string }; count: number } =>
      Boolean(r.found),
    )
    .map((r) => ({ ...r.found, count: r.count }))
})

const getPickedCategory = cache((slug: string) =>
  db.category.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } }),
)

/**
 * Everything the head and the body both need, resolved once per request.
 *
 * generateMetadata and the page run separately, and without this the city
 * lookup, the category lookup and the count all happen twice.
 */
const resolve = cache(async (slug: string, category?: string) => {
  const city = await findCityBySlug(slug)
  if (!city) return null

  const picked = category ? await getPickedCategory(category) : null
  const where: Prisma.BusinessWhereInput = {
    status: 'LIVE',
    city: city.name,
    ...(picked
      ? { OR: [{ categoryId: picked.id }, { extraCategories: { some: { id: picked.id } } }] }
      : {}),
  }

  return { city, picked, where, count: await db.business.count({ where }) }
})

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SP>
}): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const found = await resolve(slug, sp.category)
  if (!found) return { title: 'City not found', robots: { index: false, follow: false } }

  return cityMetadata({
    name: found.city.name,
    slug: found.city.slug,
    count: found.count,
    states: found.city.states,
    category: found.picked?.name,
    // a re-sorted or paged list is the same listings again
    filteredView: (Boolean(sp.sort) && sp.sort !== 'top') || Number(sp.page) > 1,
  })
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SP>
}) {
  const { slug } = await params
  const sp = await searchParams
  const found = await resolve(slug, sp.category)
  if (!found) notFound()

  const { city, picked, where, count } = found
  const sortKey = (sp.sort && sp.sort in SORTS ? sp.sort : 'top') as SortKey
  const page = Math.max(1, Number(sp.page) || 1)

  const [businesses, categories] = await Promise.all([
    db.business.findMany({
      where,
      orderBy: [...SORTS[sortKey].orderBy] as Prisma.BusinessOrderByWithRelationInput[],
      include: { category: { select: { name: true, slug: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    getCityCategories(city.name),
  ])

  const region = city.states.length === 1 ? `${city.name}, ${city.states[0]}` : city.name
  // the sentence behind the meta description, visible rather than head-only
  const intro = `Looking for a ${picked ? picked.name.toLowerCase() : 'business'} in ${city.name}? ${
    count > 0
      ? `Compare ${count.toLocaleString('en-IN')} verified listing${
          count === 1 ? '' : 's'
        } in ${region}, with ratings, contact details and genuine customer reviews.`
      : 'Nothing is listed here yet — be the first to add a business.'
  }`

  const href = (patch: SP) => {
    const merged = { ...sp, ...patch }
    const p = new URLSearchParams()
    if (merged.category) p.set('category', merged.category)
    if (merged.sort && merged.sort !== 'top') p.set('sort', merged.sort)
    if (merged.page && merged.page !== '1') p.set('page', merged.page)
    const q = p.toString()
    return `/city/${city.slug}${q ? `?${q}` : ''}`
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            cityJsonLd({
              name: city.name,
              slug: city.slug,
              states: city.states,
              description: intro,
              businesses,
              category: picked?.name,
            }),
          ),
        }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted"
      >
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <ChevronRight size={13} />
        <Link href="/cities" className="hover:text-brand">
          Cities
        </Link>
        <ChevronRight size={13} />
        <span className="text-foreground/70">{city.name}</span>
        {picked && (
          <>
            <ChevronRight size={13} />
            <span className="text-foreground/70">{picked.name}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-brand/10 text-brand">
          <MapPin size={28} />
        </span>
        <div>
          <h1 className="text-3xl font-bold">
            {picked ? `${picked.name} in ${city.name}` : `Businesses in ${city.name}`}
          </h1>
          <p className="text-muted">
            {count.toLocaleString('en-IN')} {count === 1 ? 'listing' : 'listings'}
            {city.states.length === 1 ? ` · ${city.states[0]}` : ''}
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{intro}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        {Object.entries(SORTS).map(([key, s]) => (
          <Link
            key={key}
            href={href({ sort: key, page: '1' })}
            className={`rounded-full border px-4 py-1.5 ${
              sortKey === key
                ? 'border-brand bg-brand/10 font-medium text-brand'
                : 'bg-surface hover:border-brand'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 text-sm">
          <Link
            href={href({ category: undefined, page: '1' })}
            className={`rounded-full border px-4 py-1.5 ${
              !picked
                ? 'border-brand bg-brand/10 font-medium text-brand'
                : 'bg-surface hover:border-brand'
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={href({ category: c.slug, page: '1' })}
              className={`rounded-full border px-4 py-1.5 ${
                picked?.slug === c.slug
                  ? 'border-brand bg-brand/10 font-medium text-brand'
                  : 'bg-surface hover:border-brand'
              }`}
            >
              {c.name} <span className="text-muted">{c.count}</span>
            </Link>
          ))}
        </div>
      )}

      {businesses.length === 0 ? (
        <p className="mt-8 rounded-xl border bg-surface p-8 text-center text-muted">
          Nothing listed here yet.{' '}
          <Link href="/business/register" className="font-medium text-brand hover:underline">
            Add a business
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              basePath={`/city/${city.slug}`}
              page={page}
              pageCount={Math.ceil(count / PER_PAGE)}
              total={count}
              params={{ category: sp.category, sort: sortKey === 'top' ? undefined : sortKey }}
            />
          </div>
        </>
      )}
    </div>
  )
}
