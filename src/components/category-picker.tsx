'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search, Star, X } from 'lucide-react'

export type CategoryOption = { id: number; name: string }

/** Enough to scroll through; past this, typing narrows faster than scrolling. */
const MAX_VISIBLE = 50

/**
 * Searchable picker for the ~4,000 Google Business Profile categories.
 *
 * A native <select> with that many options is unusable on a phone and slow to
 * render, so this keeps the full list in memory but only ever mounts the
 * matches. Primary and secondary categories share one box: the first chip is
 * the primary one — it decides the breadcrumb and the badge — and posts under
 * `name`, while the rest post under `extraName`.
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
  /** Set to accept more than one category, posted under this field name. */
  extraName?: string
}) {
  const multi = Boolean(extraName)

  const [chosen, setChosen] = useState<CategoryOption[]>(() => {
    const primary = categories.find((c) => c.id === defaultCategoryId)
    const extras = defaultExtraIds?.length
      ? categories.filter((c) => c.id !== defaultCategoryId && defaultExtraIds.includes(c.id))
      : []
    return primary ? [primary, ...extras] : extras
  })
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const taken = new Set(chosen.map((c) => c.id))
    const free = categories.filter((c) => !taken.has(c.id))
    if (!q) return free.slice(0, MAX_VISIBLE)

    // Names that start with the query are what people mean; the rest follow.
    const starts: CategoryOption[] = []
    const contains: CategoryOption[] = []
    for (const c of free) {
      const lower = c.name.toLowerCase()
      if (lower.startsWith(q)) starts.push(c)
      else if (lower.includes(q)) contains.push(c)
      if (starts.length >= MAX_VISIBLE) break
    }
    return [...starts, ...contains].slice(0, MAX_VISIBLE)
  }, [categories, query, chosen])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function add(option: CategoryOption) {
    setChosen((list) => (multi ? [...list, option] : [option]))
    setQuery('')
    if (!multi) setOpen(false)
  }

  function remove(id: number) {
    setChosen((list) => list.filter((c) => c.id !== id))
  }

  /** Promote a secondary category — the primary one is simply the first. */
  function promote(id: number) {
    setChosen((list) => {
      const pick = list.find((c) => c.id === id)
      return pick ? [pick, ...list.filter((c) => c.id !== id)] : list
    })
  }

  const [primary, ...extras] = chosen

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1 block text-sm font-medium">
        {multi ? 'Categories' : 'Category'} <span className="text-danger">*</span>
        {multi && (
          <span className="ml-1 font-normal text-muted">
            — add as many as apply, the first is the main one
          </span>
        )}
      </label>

      <input type="hidden" name={name} value={primary?.id ?? ''} />
      {multi &&
        extras.map((c) => <input key={c.id} type="hidden" name={extraName} value={c.id} />)}

      <div
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-background p-1.5 focus-within:border-brand"
      >
        {chosen.map((c, i) => (
          <span
            key={c.id}
            className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-2 text-sm ${
              i === 0 ? 'bg-brand text-white' : 'bg-mint text-brand'
            }`}
          >
            {i === 0 && <Star size={12} fill="currentColor" aria-label="Main category" />}
            {i > 0 && multi ? (
              <button
                type="button"
                title="Make this the main category"
                onClick={(e) => {
                  e.stopPropagation()
                  promote(c.id)
                }}
                className="hover:underline"
              >
                {c.name}
              </button>
            ) : (
              c.name
            )}
            <button
              type="button"
              aria-label={`Remove ${c.name}`}
              onClick={(e) => {
                e.stopPropagation()
                remove(c.id)
              }}
              className={
                i === 0 ? 'text-white/80 hover:text-white' : 'text-brand/70 hover:text-brand'
              }
            >
              <X size={13} />
            </button>
          </span>
        ))}

        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((i) => Math.min(i + 1, matches.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const pick = matches[active]
              if (pick) add(pick)
            } else if (e.key === 'Escape') {
              setOpen(false)
            } else if (e.key === 'Backspace' && !query && chosen.length) {
              remove(chosen[chosen.length - 1].id)
            }
          }}
          placeholder={chosen.length ? 'Add another category' : 'Search for a category'}
          className="h-8 min-w-40 flex-1 bg-transparent px-1.5 text-sm outline-none"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-surface shadow-float">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted">
            <Search size={14} className="shrink-0" />
            {query ? `Matches for “${query}”` : 'Type to search'}
          </div>

          <ul className="max-h-64 overflow-y-auto overscroll-contain py-1 text-sm">
            {matches.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => add(c)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                    i === active ? 'bg-mint' : ''
                  }`}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {i === active && <Check size={15} className="shrink-0 text-brand" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-3 text-muted">
                {query ? `No category matches “${query}”.` : 'Every category is already added.'}
              </li>
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
    </div>
  )
}
