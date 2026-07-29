import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Building2, LayoutGrid, Sparkles, Star } from 'lucide-react'
import { db } from '@/lib/db'
import { CategoryIcon } from '@/components/category-icon'
import { CategoryExplorer, type ExplorerGroup } from '@/components/category-explorer'

export const metadata: Metadata = {
  title: 'All categories',
  description: 'Browse every business category on TrustIndex and read verified customer reviews.',
}
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const [parents, counts] = await Promise.all([
    db.category.findMany({
      where: { parentId: null },
      orderBy: { sort: 'asc' },
      include: { children: { orderBy: { name: 'asc' } } },
    }),
    db.business.groupBy({
      by: ['categoryId'],
      where: { status: 'LIVE' },
      _count: { _all: true },
    }),
  ])

  const countOf = new Map(counts.map((c) => [c.categoryId, c._count._all]))

  // a parent's number includes everything filed under its sub-categories —
  // /category/[slug] aggregates the same way, so the two pages agree
  const groups: ExplorerGroup[] = parents.map((p) => {
    const children = p.children.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      count: countOf.get(c.id) ?? 0,
    }))
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      icon: p.icon,
      count: (countOf.get(p.id) ?? 0) + children.reduce((n, c) => n + c.count, 0),
      children,
    }
  })

  const totalSubs = groups.reduce((n, g) => n + g.children.length, 0)
  const totalBiz = counts.reduce((n, c) => n + c._count._all, 0)
  const popular = [...groups].sort((a, b) => b.count - a.count).slice(0, 6)

  return (
    <div>
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

          <dl className="mt-8 flex flex-wrap gap-3">
            <Stat icon={<LayoutGrid size={16} />} value={groups.length} label="main categories" />
            <Stat icon={<Star size={16} />} value={totalSubs} label="sub-categories" />
            <Stat icon={<Building2 size={16} />} value={totalBiz} label="live businesses" />
          </dl>

          {popular.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted">Popular:</span>
              {popular.map((g) => (
                <Link
                  key={g.id}
                  href={`/category/${g.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-white/80 px-3.5 py-1.5 text-sm font-medium shadow-soft transition hover:border-brand hover:text-brand"
                >
                  <CategoryIcon name={g.icon} size={14} />
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ ALL CATEGORIES ============ */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        {groups.length === 0 ? (
          <p className="rounded-2xl border bg-surface p-12 text-center text-muted shadow-soft">
            No categories have been set up yet.
          </p>
        ) : (
          <CategoryExplorer groups={groups} />
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
    <div className="flex items-center gap-2.5 rounded-2xl border bg-white/80 px-4 py-3 shadow-soft">
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
