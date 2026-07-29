'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, X } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'

export type ExplorerChild = {
  id: number
  name: string
  slug: string
  icon: string | null
  count: number
}

export type ExplorerGroup = ExplorerChild & { children: ExplorerChild[] }

/** How many sub-category chips a card shows before collapsing into "+N more". */
const CHIP_LIMIT = 8

export function CategoryExplorer({ groups }: { groups: ExplorerGroup[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  // a parent match keeps all its children; otherwise only the matching children survive
  const filtered = useMemo(() => {
    if (!q) return groups
    return groups
      .map((g) => {
        if (g.name.toLowerCase().includes(q)) return g
        const children = g.children.filter((c) => c.name.toLowerCase().includes(q))
        return children.length ? { ...g, children } : null
      })
      .filter((g): g is ExplorerGroup => g !== null)
  }, [groups, q])

  const shown = filtered.reduce((n, g) => n + 1 + g.children.length, 0)

  return (
    <div>
      {/* filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Filter categories…"
            aria-label="Filter categories"
            className="h-12 w-full rounded-full border bg-surface pl-11 pr-10 text-sm shadow-soft outline-none focus:border-brand"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-mint hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <p role="status" aria-live="polite" className="text-sm text-muted">
          {q ? `${shown} matching ${shown === 1 ? 'category' : 'categories'}` : `${groups.length} main categories`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-surface p-12 text-center shadow-soft">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mint text-brand">
            <Search size={22} />
          </span>
          <p className="mt-4 font-semibold">No category matches “{query}”</p>
          <p className="mt-1 text-sm text-muted">Try a shorter word, or search businesses by name instead.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full border bg-surface px-5 py-2 text-sm font-medium hover:border-brand hover:text-brand"
            >
              Clear filter
            </button>
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              Search “{query}”
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <GroupCard key={g.id} group={g} expanded={Boolean(q)} />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group, expanded }: { group: ExplorerGroup; expanded: boolean }) {
  const chips = expanded ? group.children : group.children.slice(0, CHIP_LIMIT)
  const hidden = group.children.length - chips.length

  return (
    <section className="group flex flex-col rounded-2xl border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-float">
      <Link href={`/category/${group.slug}`} className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-brand transition group-hover:bg-brand group-hover:text-white">
          <CategoryIcon name={group.icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold group-hover:text-brand">{group.name}</span>
          <span className="block text-xs text-muted">
            {group.count.toLocaleString('en-IN')} {group.count === 1 ? 'business' : 'businesses'}
            {group.children.length > 0 && ` · ${group.children.length} sub-categories`}
          </span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </Link>

      {group.children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-4">
          {chips.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:bg-mint hover:text-brand"
            >
              {c.name}
              {c.count > 0 && <span className="text-[11px] text-muted">{c.count}</span>}
            </Link>
          ))}
          {hidden > 0 && (
            <Link
              href={`/category/${group.slug}`}
              className="inline-flex items-center rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand"
            >
              +{hidden} more
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
