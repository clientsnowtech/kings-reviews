import Link from 'next/link'
import { Search, SlidersHorizontal, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'
import { SearchableSelect } from '@/components/searchable-select'
import { cityNames, findCityBySlug, stateNames } from '@/lib/cities'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'All businesses — browse verified companies',
  description: 'Browse and filter every business listed on TrustIndex by category, city and rating.',
}

const SORTS = {
  top: { label: 'Top rated', orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }] },
  reviewed: { label: 'Most reviewed', orderBy: [{ ratingCount: 'desc' }] },
  newest: { label: 'Newest', orderBy: [{ createdAt: 'desc' }] },
} as const

const PER_PAGE = 24

type SP = {
  q?: string
  category?: string
  state?: string
  city?: string
  sort?: string
  page?: string
}

function qs(base: SP, patch: Partial<SP>) {
  const merged = { ...base, ...patch }
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (v && k !== 'page') p.set(k, v)
  }
  if (merged.page && merged.page !== '1') p.set('page', merged.page)
  const s = p.toString()
  return `/businesses${s ? `?${s}` : ''}`
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const query = (sp.q ?? '').trim()
  const sortKey = (sp.sort && sp.sort in SORTS ? sp.sort : 'top') as keyof typeof SORTS
  const page = Math.max(1, Number(sp.page) || 1)

  // Only categories that actually have listings are worth offering as filters —
  // the full list is ~4,000 names, nearly all of them empty.
  const filterCategories = await db.category.findMany({
    where: {
      OR: [
        { businesses: { some: { status: 'LIVE' } } },
        { extraFor: { some: { status: 'LIVE' } } },
      ],
    },
    orderBy: [{ listingCount: 'desc' }, { name: 'asc' }],
    take: 40,
    select: { id: true, name: true, slug: true },
  })

  let pickedCategoryId: number | undefined
  if (sp.category) {
    const picked = await db.category.findUnique({
      where: { slug: sp.category },
      select: { id: true },
    })
    pickedCategoryId = picked?.id
  }

  const where: Prisma.BusinessWhereInput = {
    status: 'LIVE',
    // A listing can sit in several categories, so match either side.
    ...(pickedCategoryId
      ? {
          AND: [
            {
              OR: [
                { categoryId: pickedCategoryId },
                { extraCategories: { some: { id: pickedCategoryId } } },
              ],
            },
          ],
        }
      : {}),
    ...(sp.state ? { state: sp.state } : {}),
    ...(sp.city ? { city: sp.city } : {}),
    // "plumber ahmedabad" is one string to the person typing it, so the city is
    // matched too rather than turning the whole query into nothing.
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { city: { contains: query } },
            { description: { contains: query } },
            { category: { name: { contains: query } } },
          ],
        }
      : {}),
  }

  const [total, businesses, cities, states, searchedCity] = await Promise.all([
    db.business.count({ where }),
    db.business.findMany({
      where,
      orderBy: [...SORTS[sortKey].orderBy] as Prisma.BusinessOrderByWithRelationInput[],
      include: { category: { select: { name: true, slug: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    // Cities are narrowed to the chosen state — a flat list of every city in
    // the country is unusable, and half of it cannot match anyway.
    cityNames(sp.state),
    stateNames(),
    // typed a city name into the search box? offer the page built for it
    query ? findCityBySlug(slugify(query)) : null,
  ])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">All businesses</h1>
        <p className="mt-1 text-muted">
          {total.toLocaleString()} verified {total === 1 ? 'listing' : 'listings'}
          {sp.city ? ` in ${sp.city}` : sp.state ? ` in ${sp.state}` : ''}
          {sp.city && sp.state ? `, ${sp.state}` : ''}
          {query ? ` matching “${query}”` : ''}
        </p>
      </div>

      {/* search */}
      <form action="/businesses" className="relative mt-6">
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        {sp.state && <input type="hidden" name="state" value={sp.state} />}
        {sp.city && <input type="hidden" name="city" value={sp.city} />}
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, category or keyword…"
          className="h-12 w-full rounded-full border bg-surface pl-11 pr-4 outline-none focus:border-brand"
        />
      </form>

      {/* The search box takes a city name as readily as a trade, and the city
          has a page of its own — say so instead of leaving it as a text match. */}
      {searchedCity && !sp.city && (
        <Link
          href={`/city/${searchedCity.slug}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 px-4 py-1.5 text-sm text-brand hover:bg-brand/10"
        >
          <MapPin size={14} />
          All {searchedCity.count.toLocaleString('en-IN')} businesses in {searchedCity.name}
        </Link>
      )}

      {/* category chips */}
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link
          href={qs(sp, { category: undefined, page: '1' })}
          className={`rounded-full border px-4 py-1.5 ${!sp.category ? 'border-brand bg-brand/10 font-medium text-brand' : 'bg-surface hover:border-brand'}`}
        >
          All
        </Link>
        {filterCategories.map((p) => (
          <Link
            key={p.id}
            href={qs(sp, { category: p.slug, page: '1' })}
            className={`rounded-full border px-4 py-1.5 ${sp.category === p.slug ? 'border-brand bg-brand/10 font-medium text-brand' : 'bg-surface hover:border-brand'}`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {/* sort + city */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <SlidersHorizontal size={15} /> Sort
        </span>
        {Object.entries(SORTS).map(([key, s]) => (
          <Link
            key={key}
            href={qs(sp, { sort: key, page: '1' })}
            className={`rounded-full border px-3 py-1.5 ${sortKey === key ? 'border-brand bg-brand/10 font-medium text-brand' : 'bg-surface hover:border-brand'}`}
          >
            {s.label}
          </Link>
        ))}

      </div>

      {/* Location filter. India has hundreds of cities in the directory, so
          both fields type-to-filter rather than making anyone scroll a list.
          Plain GET, so it works before any JavaScript arrives. */}
      {(states.length > 1 || cities.length > 1) && (
        <form
          action="/businesses"
          className="mt-4 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          {query && <input type="hidden" name="q" value={query} />}
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <input type="hidden" name="sort" value={sortKey} />

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={14} /> State
            </label>
            <SearchableSelect
              name="state"
              options={states}
              defaultValue={sp.state ?? ''}
              placeholder="All states"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">City</label>
            <SearchableSelect
              name="city"
              options={cities}
              defaultValue={sp.city ?? ''}
              placeholder={sp.state ? `All cities in ${sp.state}` : 'All cities'}
            />
          </div>

          <div className="flex gap-2">
            <button className="h-11 rounded-lg bg-brand px-6 text-sm font-medium text-white transition hover:bg-brand-strong">
              Apply
            </button>
            {(sp.state || sp.city) && (
              <Link
                href={qs(sp, { state: undefined, city: undefined, page: '1' })}
                className="inline-flex h-11 items-center rounded-lg border px-4 text-sm text-muted transition hover:border-brand hover:text-brand"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      )}

      {/* results */}
      {businesses.length === 0 ? (
        <p className="mt-10 rounded-xl border bg-surface p-10 text-center text-muted">
          No businesses match your filters.{' '}
          <Link href="/businesses" className="font-medium text-brand hover:underline">
            Clear all
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

      {/* pagination */}
      {pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm">
          <Link
            href={qs(sp, { page: String(page - 1) })}
            aria-disabled={page <= 1}
            className={`rounded-full border px-4 py-2 ${page <= 1 ? 'pointer-events-none opacity-40' : 'bg-surface hover:border-brand'}`}
          >
            Prev
          </Link>
          <span className="px-2 text-muted">
            Page {page} of {pages}
          </span>
          <Link
            href={qs(sp, { page: String(page + 1) })}
            aria-disabled={page >= pages}
            className={`rounded-full border px-4 py-2 ${page >= pages ? 'pointer-events-none opacity-40' : 'bg-surface hover:border-brand'}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  )
}
