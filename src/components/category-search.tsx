'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, X } from 'lucide-react'

const DEBOUNCE_MS = 300

/**
 * Types straight into the URL. `router.replace` re-fetches the server component
 * over the wire, so the grid swaps in without a reload — and the plain form
 * action still submits normally when JavaScript is off.
 */
export function CategorySearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [pending, startTransition] = useTransition()
  // Only chase the URL once the user has actually typed; otherwise a back
  // button or a paginated link would fight the box for control.
  const typed = useRef(false)

  useEffect(() => {
    if (!typed.current) setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (!typed.current) return
    const term = value.trim()
    if (term === defaultValue) return

    const t = setTimeout(() => {
      // A new search always starts over at page one.
      const href = term ? `/categories?q=${encodeURIComponent(term)}` : '/categories'
      startTransition(() => router.replace(href, { scroll: false }))
    }, DEBOUNCE_MS)

    return () => clearTimeout(t)
  }, [value, defaultValue, router])

  return (
    <form
      role="search"
      action="/categories"
      onSubmit={(e) => e.preventDefault()} // results are already live
      className="flex min-w-[17rem] flex-1 items-center gap-3"
    >
      <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl border bg-white px-4 shadow-soft">
        {pending ? (
          <Loader2 size={17} className="shrink-0 animate-spin text-brand" />
        ) : (
          <Search size={17} className="shrink-0 text-muted" />
        )}
        <input
          name="q"
          value={value}
          onChange={(e) => {
            typed.current = true
            setValue(e.target.value)
          }}
          type="text"
          autoComplete="off"
          aria-label="Search categories"
          placeholder="Search categories, e.g. plumber"
          className="h-full w-full bg-transparent text-sm outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              typed.current = true
              setValue('')
            }}
            aria-label="Clear search"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-mint hover:text-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>
      <button className="h-12 shrink-0 rounded-2xl bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-strong">
        Search
      </button>
    </form>
  )
}
