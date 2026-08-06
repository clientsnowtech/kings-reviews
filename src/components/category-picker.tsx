'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export type CategoryOption = { id: number; name: string }

/** Enough to scroll through; past this, typing narrows faster than scrolling. */
const MAX_VISIBLE = 50

/**
 * Searchable single-select for the ~4,000 Google Business Profile categories.
 *
 * A native <select> with that many options is unusable on a phone and slow to
 * render, so this keeps the full list in memory but only ever mounts the
 * matches. The chosen id travels in a hidden input under `name`.
 */
export function CategoryPicker({
  categories,
  defaultCategoryId,
  defaultExtraIds,
  error,
  name = 'categoryId',
  extraName,
}: {
  categories: CategoryOption[]
  defaultCategoryId?: number
  /** Ids already listed as secondary categories. */
  defaultExtraIds?: number[]
  error?: string
  name?: string
  /** Set to also offer secondary categories, posted under this field name. */
  extraName?: string
}) {
  const [selected, setSelected] = useState<CategoryOption | null>(
    () => categories.find((c) => c.id === defaultCategoryId) ?? null,
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories.slice(0, MAX_VISIBLE)
    // Names that start with the query are what people mean; the rest follow.
    const starts: CategoryOption[] = []
    const contains: CategoryOption[] = []
    for (const c of categories) {
      const lower = c.name.toLowerCase()
      if (lower.startsWith(q)) starts.push(c)
      else if (lower.includes(q)) contains.push(c)
      if (starts.length >= MAX_VISIBLE) break
    }
    return [...starts, ...contains].slice(0, MAX_VISIBLE)
  }, [categories, query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function choose(option: CategoryOption) {
    setSelected(option)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1 block text-sm font-medium">
        Category <span className="text-danger">*</span>
      </label>

      <input type="hidden" name={name} value={selected?.id ?? ''} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2 rounded-lg border bg-background px-3 text-left outline-none focus:border-brand"
      >
        <span className={`flex-1 truncate ${selected ? '' : 'text-muted'}`}>
          {selected ? selected.name : 'Search for a category'}
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-surface shadow-float">
          <div className="flex items-center gap-2 border-b px-3">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((i) => Math.min(i + 1, matches.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((i) => Math.max(i - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const pick = matches[active]
                  if (pick) choose(pick)
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              }}
              placeholder="Type to search…"
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto overscroll-contain py-1 text-sm">
            {matches.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                    i === active ? 'bg-mint' : ''
                  }`}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {selected?.id === c.id && <Check size={15} className="shrink-0 text-brand" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-3 text-muted">No category matches “{query}”.</li>
            )}
          </ul>

          {matches.length === MAX_VISIBLE && (
            <p className="border-t px-3 py-2 text-xs text-muted">
              Showing the first {MAX_VISIBLE} matches — keep typing to narrow them.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}

      {extraName && (
        <ExtraCategories
          categories={categories}
          name={extraName}
          defaultIds={defaultExtraIds}
          excludeId={selected?.id}
        />
      )}
    </div>
  )
}

/**
 * Secondary categories. A garage that also sells tyres should turn up under
 * both, so the listing carries as many as apply — the primary one above still
 * decides the breadcrumb and the badge.
 */
function ExtraCategories({
  categories,
  name,
  defaultIds,
  excludeId,
}: {
  categories: CategoryOption[]
  name: string
  defaultIds?: number[]
  excludeId?: number
}) {
  const [chosen, setChosen] = useState<CategoryOption[]>(() =>
    categories.filter((c) => defaultIds?.includes(c.id)),
  )
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const taken = new Set(chosen.map((c) => c.id))
    return categories
      .filter((c) => c.id !== excludeId && !taken.has(c.id) && c.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [categories, query, chosen, excludeId])

  return (
    <div className="mt-4">
      <label className="mb-1 block text-sm font-medium">
        Also listed under <span className="font-normal text-muted">(optional)</span>
      </label>

      {chosen
        .filter((c) => c.id !== excludeId)
        .map((c) => (
          <input key={c.id} type="hidden" name={name} value={c.id} />
        ))}

      {chosen.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chosen
            .filter((c) => c.id !== excludeId)
            .map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-sm text-brand"
              >
                {c.name}
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => setChosen((list) => list.filter((x) => x.id !== c.id))}
                  className="text-brand/70 hover:text-brand"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
        </div>
      )}

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search to add another category"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
        />
        {matches.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-surface py-1 text-sm shadow-float">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChosen((list) => [...list, c])
                    setQuery('')
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-mint"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
