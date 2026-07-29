import { Clock } from 'lucide-react'
import { setBusinessHours } from '@/lib/business-actions'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type Hour = { day: number; openTime: string | null; closeTime: string | null; closed: boolean }

export function BusinessHoursForm({
  businessId,
  hours,
}: {
  businessId: string
  hours: Hour[]
}) {
  const byDay = new Map(hours.map((h) => [h.day, h]))

  return (
    <form action={setBusinessHours} className="rounded-2xl border bg-surface p-6">
      <input type="hidden" name="businessId" value={businessId} />
      <h3 className="flex items-center gap-2 font-semibold">
        <Clock size={17} className="text-brand" /> Business hours
      </h3>
      <p className="mt-1 text-sm text-muted">Set opening times so customers see “Open now”.</p>

      <div className="mt-4 space-y-2">
        {DAY_NAMES.map((name, day) => {
          const h = byDay.get(day)
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5">
              <span className="w-24 text-sm font-medium">{name}</span>
              <label className="flex items-center gap-1.5 text-sm text-muted">
                <input type="checkbox" name={`closed_${day}`} defaultChecked={h?.closed ?? false} />
                Closed
              </label>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <input
                  type="time"
                  name={`open_${day}`}
                  defaultValue={h?.openTime ?? ''}
                  className="h-9 rounded-lg border bg-background px-2 outline-none focus:border-brand"
                />
                <span className="text-muted">to</span>
                <input
                  type="time"
                  name={`close_${day}`}
                  defaultValue={h?.closeTime ?? ''}
                  className="h-9 rounded-lg border bg-background px-2 outline-none focus:border-brand"
                />
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="submit"
        className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Save hours
      </button>
    </form>
  )
}
