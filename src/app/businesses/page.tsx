import Link from 'next/link'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'

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

  // parent categories drive the category filter; picking a parent includes its children
  const parents = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sort: 'asc' },
    select: { id: true, name: true, slug: true, children: { select: { id: true } } },
  })

  let catIds: number[] | undefined
  if (sp.category) {
    const parent = parents.find((p) => p.slug === sp.category)
    if (parent) catIds = [parent.id, ...parent.children.map((c) => c.id)]
  }

  const where: Prisma.BusinessWhereInput = {
    status: 'LIVE',
    ...(catIds ? { categoryId: { in: catIds } } : {}),
    ...(sp.city ? { city: sp.city } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
            { category: { name: { contains: query } } },
          ],
        }
      : {}),
  }

  const [total, businesses, cityRows] = await Promise.all([
    db.business.count({ where }),
    db.business.findMany({
      where,
      orderBy: [...SORTS[sortKey].orderBy] as Prisma.BusinessOrderByWithRelationInput[],
      include: { category: { select: { name: true, slug: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.business.findMany({
      where: { status: 'LIVE' },
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    }),
  ])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const cities = cityRows.map((c) => c.city)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">All businesses</h1>
        <p className="mt-1 text-muted">
          {total.toLocaleString()} verified {total === 1 ? 'listing' : 'listings'}
          {sp.city ? ` in ${sp.city}` : ''}
          {query ? ` matching “${query}”` : ''}
        </p>
      </div>

      {/* search */}
      <form action="/businesses" className="relative mt-6">
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
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

      {/* category chips */}
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link
          href={qs(sp, { category: undefined, page: '1' })}
          className={`rounded-full border px-4 py-1.5 ${!sp.category ? 'border-brand bg-brand/10 font-medium text-brand' : 'bg-surface hover:border-brand'}`}
        >
          All
        </Link>
        {parents.map((p) => (
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

        {cities.length > 1 && (
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="city" className="text-muted">
              City
            </label>
            {/* progressive-enhancement dropdown: submits via GET, resets page */}
            <form action="/businesses" className="contents">
              {query && <input type="hidden" name="q" value={query} />}
              {sp.category && <input type="hidden" name="category" value={sp.category} />}
              <input type="hidden" name="sort" value={sortKey} />
              <select
                id="city"
                name="city"
                defaultValue={sp.city ?? ''}
                className="h-9 rounded-full border bg-surface px-3 outline-none focus:border-brand"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="rounded-full border bg-surface px-3 py-1.5 hover:border-brand">Go</button>
            </form>
          </div>
        )}
      </div>

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
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
