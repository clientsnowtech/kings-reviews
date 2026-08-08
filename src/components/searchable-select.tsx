'use client'

import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Type-to-filter select (combobox). You can type to search, but the submitted
 * value must be one of `options` — arbitrary text reverts on blur.
 * The chosen value is submitted via a hidden input named `name`.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue = '',
  disabled,
  required,
  placeholder,
}: {
  name: string
  options: string[]
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [query, setQuery] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const choose = (o: string) => {
    setValue(o)
    setQuery(o)
    setOpen(false)
  }

  const commitOrRevert = () => {
    const match = options.find((o) => o.toLowerCase() === query.trim().toLowerCase())
    if (match) choose(match)
    else setQuery(value) // typed text isn't a valid option → revert to last selection
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        value={query}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        // suppress the browser's own autofill dropdown so only our list shows
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        onChange={(e) => {
          setQuery(e.target.value)
          setValue('')
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false)
            commitOrRevert()
          }, 120)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, filtered.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[active]) choose(filtered[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className="h-11 w-full rounded-lg border bg-background px-3 pr-9 outline-none focus:border-brand disabled:opacity-60"
      />
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />

      {open && !disabled && filtered.length > 0 && (
        <ul className="animate-fade-down absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-surface py-1 shadow-float">
          {filtered.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === active ? 'bg-mint text-brand-strong' : 'hover:bg-mint'
                }`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
