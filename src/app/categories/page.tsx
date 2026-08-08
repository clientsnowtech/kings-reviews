import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Building2, LayoutGrid, Sparkles } from 'lucide-react'
import { db } from '@/lib/db'
import { colorFrom } from '@/lib/utils'
import { CategoryIcon } from '@/components/category-icon'
import { Pagination } from '@/components/pagination'
import { CategorySearch } from '@/components/category-search'
import { clampDescription, SITE_NAME, SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/**
 * Paged and searched views of the same list are near-duplicates. Page 1 is the
 * canonical entry; deeper pages keep their own canonical (so their listings stay
 * discoverable) while `?q=` result pages are followed but never indexed.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}): Promise<Metadata> {
  const { q, page: pageParam } = await searchParams
  const query = (q ?? '').trim()
  const page = Math.max(1, Number(pageParam) || 1)

  const title = query
    ? `Business categories matching “${query}”`
    : page > 1
      ? `All business categories — page ${page}`
      : 'All business categories in India'

  const description = clampDescription(
    `Browse every business category on ${SITE_NAME} — restaurants, hotels, clinics, repairs, ` +
      'salons and thousands more. Compare listings by verified customer reviews and ratings.',
  )

  const canonical = page > 1 ? `/categories?page=${page}` : '/categories'

  return {
    title,
    description,
    keywords: [
      'business categories',
      'business directory India',
      'company reviews by category',
      'top rated businesses India',
      'local business listings',
    ],
    alternates: { canonical },
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: canonical,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

/** The full list runs to ~4,000 names, so a page only ever shows a slice. */
const PER_PAGE = 48

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page: pageParam } = await searchParams
  const query = (q ?? '').trim()
  const page = Math.max(1, Number(pageParam) || 1)

  // Only categories someone has actually listed under: the directory carries
  // Google's full ~4,000, and browsing thousands of empty ones is no browsing.
  const live = { some: { status: 'LIVE' as const } }
  const listed = { OR: [{ businesses: live }, { extraFor: live }] }
  const where = query ? { ...listed, name: { contains: query } } : listed

  const [categories, matching, total, businesses] = await Promise.all([
    db.category.findMany({
      where,
      orderBy: [{ listingCount: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, name: true, slug: true, icon: true },
    }),
    db.category.count({ where }),
    db.category.count({ where: listed }),
    // Tallied here rather than with groupBy: a listing counts under every
    // category it is filed in, and groupBy only sees the primary one.
    db.business.findMany({
      where: { status: 'LIVE' },
      select: { categoryId: true, extraCategories: { select: { id: true } } },
    }),
  ])

  const countOf = new Map<number, number>()
  for (const b of businesses) {
    for (const id of [b.categoryId, ...b.extraCategories.map((c) => c.id)]) {
      countOf.set(id, (countOf.get(id) ?? 0) + 1)
    }
  }
  const totalBiz = businesses.length
  const pageCount = Math.max(1, Math.ceil(matching / PER_PAGE))

  // Lets search engines pick up the category links as a list rather than
  // guessing at a wall of anchors, and gives the breadcrumb a machine-readable
  // twin of the one rendered below.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Categories', item: `${SITE_URL}/categories` },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Business categories',
        numberOfItems: categories.length,
        itemListElement: categories.map((c, i) => ({
          '@type': 'ListItem',
          position: (page - 1) * PER_PAGE + i + 1,
          url: `${SITE_URL}/category/${c.slug}`,
          name: c.name,
        })),
      },
    ],
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============ HEADER ============ */}
      <section className="hero-wash border-b">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="px-1.5">/</span>
            <span className="font-medium text-foreground">Categories</span>
          </nav>

          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white/70 px-3 py-1 text-xs font-semibold text-brand shadow-soft">
            <Sparkles size={14} /> {totalBiz.toLocaleString('en-IN')} businesses reviewed
          </span>

          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Browse every <span className="text-brand">category</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Find and review businesses by what they actually do — from restaurants to repairs.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <dl className="flex h-12 shrink-0 items-center gap-4 rounded-2xl border bg-white/80 px-4 shadow-soft">
              <Stat icon={<LayoutGrid size={16} />} value={total} label="categories" />
              <span aria-hidden className="h-6 w-px bg-border" />
              <Stat icon={<Building2 size={16} />} value={totalBiz} label="live businesses" />
            </dl>

            {/* Debounced client search — the URL stays shareable either way. */}
            <CategorySearch defaultValue={query} />
          </div>
        </div>
      </section>

      {/* ============ ALL CATEGORIES ============ */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="mb-5 text-sm text-muted">
          {query
            ? `${matching.toLocaleString('en-IN')} matching “${query}”`
            : `${total.toLocaleString('en-IN')} categories`}
          {pageCount > 1 && ` — page ${page} of ${pageCount}`}
        </p>

        {categories.length === 0 ? (
          <p className="rounded-2xl border bg-surface p-12 text-center text-muted shadow-soft">
            {page > 1
              ? 'Nothing on this page — try an earlier one.'
              : query
                ? `No listed category matches “${query}”.`
                : 'No businesses have been listed yet — categories appear here once they do.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="group block overflow-hidden rounded-2xl border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div
                    className="relative h-28 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${colorFrom(c.slug)}, var(--brand-strong))` }}
                  >
                    <CategoryIcon
                      name={c.icon}
                      category={c.name}
                      size={96}
                      className="absolute -bottom-4 -right-3 text-white/20 transition duration-500 group-hover:scale-110"
                    />
                    <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-brand shadow-soft">
                      <CategoryIcon name={c.icon} category={c.name} size={18} />
                    </span>
                    <span className="absolute bottom-2 left-3 pr-12 font-semibold text-white drop-shadow">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted">{countOf.get(c.id) ?? 0} listings</span>
                    <ArrowRight size={15} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 && (
          <div className="mt-8">
            <Pagination
              basePath="/categories"
              page={page}
              pageCount={pageCount}
              total={matching}
              params={{ q: query || undefined }}
            />
          </div>
        )}
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand p-10 text-white sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Category missing?</h2>
              <p className="mt-2 max-w-md text-white/85">
                List your business free — we will file it under the right category and you start collecting reviews.
              </p>
            </div>
            <Link
              href="/business/register"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-brand transition hover:scale-105"
            >
              List your business <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-brand">{icon}</span>
      <div>
        <dt className="sr-only">{label}</dt>
        <dd>
          <span className="text-lg font-extrabold leading-none">{value.toLocaleString('en-IN')}</span>{' '}
          <span className="text-xs text-muted">{label}</span>
        </dd>
      </div>
    </div>
  )
}
