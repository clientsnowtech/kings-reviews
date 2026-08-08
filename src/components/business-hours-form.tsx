'use client'

import { useState } from 'react'
import { Clock, Copy } from 'lucide-react'
import { setBusinessHours } from '@/lib/business-actions'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** How a round-the-clock day is stored — there is no separate column for it. */
const ALL_DAY = { open: '00:00', close: '23:59' }

type Hour = { day: number; openTime: string | null; closeTime: string | null; closed: boolean }

type Row = { closed: boolean; open: string; close: string; allDay: boolean }

export function BusinessHoursForm({
  businessId,
  hours,
}: {
  businessId: string
  hours: Hour[]
}) {
  const byDay = new Map(hours.map((h) => [h.day, h]))

  const [rows, setRows] = useState<Row[]>(() =>
    DAY_NAMES.map((_, day) => {
      const h = byDay.get(day)
      const open = h?.openTime ?? ''
      const close = h?.closeTime ?? ''
      return {
        closed: h?.closed ?? false,
        open,
        close,
        allDay: open === ALL_DAY.open && close === ALL_DAY.close,
      }
    }),
  )

  function update(day: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === day ? { ...r, ...patch } : r)))
  }

  /** Push one day's setup onto every other day — the common case is 7 identical rows. */
  function copyToAll(day: number) {
    setRows((prev) => prev.map(() => ({ ...prev[day] })))
  }

  return (
    <form action={setBusinessHours} className="rounded-2xl border bg-surface p-6">
      <input type="hidden" name="businessId" value={businessId} />
      <h3 className="flex items-center gap-2 font-semibold">
        <Clock size={17} className="text-brand" /> Business hours
      </h3>
      <p className="mt-1 text-sm text-muted">
        Set opening times so customers see “Open now”. Tick <strong>24 hrs</strong> for a
        round-the-clock day, or copy one day onto all seven.
      </p>

      <div className="mt-4 space-y-2">
        {DAY_NAMES.map((name, day) => {
          const row = rows[day]
          // The visible time inputs are unnamed: a disabled input submits
          // nothing, so the payload comes from the hidden pair below and reads
          // the same whether the row was typed in, set to 24 hrs, or closed.
          const submitOpen = row.closed ? '' : row.allDay ? ALL_DAY.open : row.open
          const submitClose = row.closed ? '' : row.allDay ? ALL_DAY.close : row.close

          return (
            <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5">
              <span className="w-24 text-sm font-medium">{name}</span>

              <label className="flex items-center gap-1.5 text-sm text-muted">
                <input
                  type="checkbox"
                  name={`closed_${day}`}
                  checked={row.closed}
                  onChange={(e) => update(day, { closed: e.target.checked, allDay: false })}
                />
                Closed
              </label>

              <label className="flex items-center gap-1.5 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={row.allDay}
                  onChange={(e) => update(day, { allDay: e.target.checked, closed: false })}
                />
                24 hrs
              </label>

              <input type="hidden" name={`open_${day}`} value={submitOpen} />
              <input type="hidden" name={`close_${day}`} value={submitClose} />

              <div className="ml-auto flex items-center gap-2 text-sm">
                {row.allDay ? (
                  <span className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand">
                    Open 24 hours
                  </span>
                ) : (
                  <>
                    <input
                      type="time"
                      aria-label={`${name} opening time`}
                      value={row.open}
                      disabled={row.closed}
                      onChange={(e) => update(day, { open: e.target.value })}
                      className="h-9 rounded-lg border bg-background px-2 outline-none focus:border-brand disabled:opacity-50"
                    />
                    <span className="text-muted">to</span>
                    <input
                      type="time"
                      aria-label={`${name} closing time`}
                      value={row.close}
                      disabled={row.closed}
                      onChange={(e) => update(day, { close: e.target.value })}
                      className="h-9 rounded-lg border bg-background px-2 outline-none focus:border-brand disabled:opacity-50"
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => copyToAll(day)}
                  title={`Copy ${name} to all days`}
                  aria-label={`Copy ${name} to all days`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs text-muted hover:border-brand hover:text-brand active:scale-95"
                >
                  <Copy size={14} /> Copy to all
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="submit"
        className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong active:scale-[0.98]"
      >
        Save hours
      </button>
    </form>
  )
}
