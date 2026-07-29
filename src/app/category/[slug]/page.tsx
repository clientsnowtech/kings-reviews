import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { BusinessCard } from '@/components/business-card'
import { CategoryIcon } from '@/components/category-icon'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const c = await db.category.findUnique({ where: { slug } })
  return c ? { title: `${c.name} — best reviewed businesses` } : { title: 'Category' }
}

const SORTS = {
  top: { label: 'Top rated', orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }] },
  reviewed: { label: 'Most reviewed', orderBy: [{ ratingCount: 'desc' }] },
  newest: { label: 'Newest', orderBy: [{ createdAt: 'desc' }] },
} as const

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; city?: string }>
}) {
  const { slug } = await params
  const { sort = 'top', city } = await searchParams

  const category = await db.category.findUnique({
    where: { slug },
    include: { children: { orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } } },
  })
  if (!category) notFound()

  const sortKey = (sort in SORTS ? sort : 'top') as keyof typeof SORTS

  // a parent category aggregates all of its sub-categories' businesses
  const catIds = [category.id, ...category.children.map((c) => c.id)]

  const where: Prisma.BusinessWhereInput = {
    categoryId: { in: catIds },
    status: 'LIVE',
    ...(city ? { city } : {}),
  }

  const [businesses, cities] = await Promise.all([
    db.business.findMany({
      where,
      orderBy: [...SORTS[sortKey].orderBy] as Prisma.BusinessOrderByWithRelationInput[],
      include: { category: { select: { name: true, slug: true } } },
      take: 60,
    }),
    db.business.findMany({
      where: { categoryId: { in: catIds }, status: 'LIVE' },
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    }),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-brand/10 text-brand">
          <CategoryIcon name={category.icon} size={28} />
        </span>
        <div>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted">{businesses.length} businesses{city ? ` in ${city}` : ''}</p>
        </div>
      </div>

      {/* sub-categories */}
      {category.children.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {category.children.map((sc) => (
            <Link
              key={sc.id}
              href={`/category/${sc.slug}`}
              className="rounded-full border bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
            >
              {sc.name}
            </Link>
          ))}
        </div>
      )}

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

        {cities.length > 1 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              href={`/category/${slug}?sort=${sortKey}`}
              className={`rounded-full border px-3 py-1.5 ${!city ? 'border-brand bg-brand/10 text-brand' : 'bg-surface hover:border-brand'}`}
            >
              All cities
            </Link>
            {cities.map((c) => (
              <Link
                key={c.city}
                href={`/category/${slug}?sort=${sortKey}&city=${encodeURIComponent(c.city)}`}
                className={`rounded-full border px-3 py-1.5 ${city === c.city ? 'border-brand bg-brand/10 text-brand' : 'bg-surface hover:border-brand'}`}
              >
                {c.city}
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
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  )
}
