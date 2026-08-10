'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, MapPin, Search, Star, X } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
import { colorFrom, initials } from '@/lib/utils'

type Hit = {
  id: string // Business ids are cuids; Category ids are ints
  name: string
  slug: string
  city: string
  logo: string | null
  ratingAvg: number
  ratingCount: number
  category: string | null
}

type CatHit = { id: number; name: string; slug: string; icon: string | null }

type CityHit = { name: string; slug: string; count: number; state: string | null }

const MIN_CHARS = 2
const DEBOUNCE_MS = 200

/**
 * Navbar typeahead. Debounced fetch against /api/search with the previous
 * request aborted, so a fast typist never sees an older response land last.
 * Still a real <form> — Enter with nothing highlighted goes to /search.
 *
 * One box, three kinds of answer: the business, the trade it is in, and the
 * town it is in. Each group links where that kind of answer lives.
 */
export function NavSearch({
  className = '',
  size = 'md',
}: {
  className?: string
  /** 'lg' is the hero bar: taller, on white, with a visible Search button. */
  size?: 'md' | 'lg'
}) {
  const router = useRouter()
  const listId = useId()
  const lg = size === 'lg'

  const [q, setQ] = useState('')
  // results carry the term they answered, so a stale payload can never paint
  const [data, setData] = useState<{
    term: string
    biz: Hit[]
    cats: CatHit[]
    cities: CityHit[]
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const term = q.trim()
  const ready = term.length >= MIN_CHARS
  const fresh = data?.term === term
  const biz = fresh ? data.biz : []
  const cats = fresh ? data.cats : []
  const cities = fresh ? data.cities : []
  const loading = ready && !fresh

  // flat option list drives keyboard nav: businesses → categories → cities → all
  const options: { key: string; href: string }[] = [
    ...biz.map((b) => ({ key: `b${b.id}`, href: `/company/${b.slug}` })),
    ...cats.map((c) => ({ key: `c${c.id}`, href: `/category/${c.slug}` })),
    ...cities.map((c) => ({ key: `l${c.slug}`, href: `/city/${c.slug}` })),
    ...(ready ? [{ key: 'all', href: `/search?q=${encodeURIComponent(term)}` }] : []),
  ]

  useEffect(() => {
    if (!ready) return

    const ctrl = new AbortController()

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        })
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as {
          businesses: Hit[]
          categories: CatHit[]
          cities: CityHit[]
        }
        setData({
          term,
          biz: json.businesses ?? [],
          cats: json.categories ?? [],
          cities: json.cities ?? [],
        })
      } catch {
        // offline or throttled — settle on "nothing" instead of spinning forever
        if (!ctrl.signal.aborted) setData({ term, biz: [], cats: [], cities: [] })
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [term, ready])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // once the query has been answered by a page, the box has said its piece —
  // leaving the term behind only makes the next search a delete job first
  function go(href: string) {
    setOpen(false)
    setQ('')
    setData(null)
    setActive(-1)
    inputRef.current?.blur()
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || options.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      go(options[active].href)
    }
  }

  const showPanel = open && ready
  const empty = !loading && biz.length === 0 && cats.length === 0 && cities.length === 0

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (term) go(`/search?q=${encodeURIComponent(term)}`)
        }}
      >
        <Search
          size={lg ? 20 : 18}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${
            lg ? 'left-4' : 'left-3'
          }`}
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(-1) // the list under the highlight is about to change
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          name="q"
          type="text"
          autoComplete="off"
          placeholder="Search company, category or city…"
          aria-label="Search businesses, categories and cities"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${options[active]?.key}` : undefined}
          className={
            lg
              ? 'h-14 w-full rounded-full border bg-white pl-12 pr-40 text-base shadow-soft outline-none focus:border-brand'
              : 'h-10 w-full rounded-full border bg-background pl-10 pr-10 text-sm outline-none focus:border-brand'
          }
        />
        {loading ? (
          <Loader2
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 animate-spin text-muted ${
              lg ? 'right-32' : 'right-3.5'
            }`}
          />
        ) : (
          q && (
            <button
              type="button"
              onClick={() => {
                setQ('')
                setActive(-1)
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
              className={`absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-mint hover:text-foreground ${
                lg ? 'right-[7.5rem]' : 'right-2'
              }`}
            >
              <X size={15} />
            </button>
          )
        )}
        {lg && (
          <button className="absolute right-2 top-2 h-10 rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand-strong">
            Search
          </button>
        )}
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className={`animate-fade-down absolute left-0 right-0 z-50 overflow-hidden rounded-2xl border bg-white text-left shadow-float ${
            lg ? 'top-16' : 'top-12'
          }`}
        >
          {empty ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Nothing matched “{term}”.
            </p>
          ) : (
            <>
              {biz.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Businesses
                  </p>
                  {biz.map((b, i) => (
                    <Row
                      key={b.id}
                      id={`${listId}-b${b.id}`}
                      href={`/company/${b.slug}`}
                      activeRow={active === i}
                      onHover={() => setActive(i)}
                      onPick={go}
                    >
                      {b.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.logo}
                          alt=""
                          width={36}
                          height={36}
                          loading="lazy"
                          decoding="async"
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                          style={{ background: colorFrom(b.slug) }}
                        >
                          {initials(b.name)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{b.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {[b.category, b.city].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                        <Star size={13} className="text-star" fill="var(--star)" />
                        {b.ratingAvg.toFixed(1)}
                        <span className="font-normal text-muted">({b.ratingCount})</span>
                      </span>
                    </Row>
                  ))}
                </>
              )}

              {cats.length > 0 && (
                <>
                  <p className="border-t px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Categories
                  </p>
                  {cats.map((c, i) => (
                    <Row
                      key={c.id}
                      id={`${listId}-c${c.id}`}
                      href={`/category/${c.slug}`}
                      activeRow={active === biz.length + i}
                      onHover={() => setActive(biz.length + i)}
                      onPick={go}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-brand">
                        <CategoryIcon name={c.icon} size={17} />
                      </span>
                      <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    </Row>
                  ))}
                </>
              )}

              {cities.length > 0 && (
                <>
                  <p className="border-t px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Locations
                  </p>
                  {cities.map((c, i) => (
                    <Row
                      key={c.slug}
                      id={`${listId}-l${c.slug}`}
                      href={`/city/${c.slug}`}
                      activeRow={active === biz.length + cats.length + i}
                      onHover={() => setActive(biz.length + cats.length + i)}
                      onPick={go}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-brand">
                        <MapPin size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        {c.state && (
                          <span className="block truncate text-xs text-muted">{c.state}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {c.count.toLocaleString('en-IN')}
                      </span>
                    </Row>
                  ))}
                </>
              )}
            </>
          )}

          <Link
            id={`${listId}-all`}
            role="option"
            aria-selected={active === options.length - 1}
            href={`/search?q=${encodeURIComponent(term)}`}
            onClick={(e) => {
              e.preventDefault()
              go(`/search?q=${encodeURIComponent(term)}`)
            }}
            onMouseEnter={() => setActive(options.length - 1)}
            className={`block border-t px-4 py-3 text-sm font-semibold text-brand ${
              active === options.length - 1 ? 'bg-mint' : 'hover:bg-mint'
            }`}
          >
            See all results for “{term}” →
          </Link>
        </div>
      )}
    </div>
  )
}

function Row({
  id,
  href,
  activeRow,
  onHover,
  onPick,
  children,
}: {
  id: string
  href: string
  activeRow: boolean
  onHover: () => void
  onPick: (href: string) => void
  children: React.ReactNode
}) {
  return (
    <Link
      id={id}
      role="option"
      aria-selected={activeRow}
      href={href}
      onMouseEnter={onHover}
      onClick={(e) => {
        e.preventDefault()
        onPick(href)
      }}
      className={`flex items-center gap-3 px-4 py-2.5 ${activeRow ? 'bg-mint' : 'hover:bg-mint'}`}
    >
      {children}
    </Link>
  )
}
