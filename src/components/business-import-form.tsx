'use client'

import { useActionState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Upload, Undo2 } from 'lucide-react'
import { adminImportBusinesses, undoBusinessImport, type ImportState } from '@/lib/admin-actions'

const initial: ImportState = {}

const OUTCOME = {
  created: { icon: CheckCircle2, cls: 'text-brand' },
  skipped: { icon: AlertTriangle, cls: 'text-amber-600' },
  error: { icon: XCircle, cls: 'text-danger' },
} as const

export function BusinessImportForm() {
  const [state, action, pending] = useActionState(adminImportBusinesses, initial)
  const [undoState, undo, undoing] = useActionState(undoBusinessImport, initial)
  const field = 'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand'

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4 rounded-2xl border bg-surface p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">CSV file</label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="w-full rounded-lg border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-mint file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <p className="mt-1 text-xs text-muted">
            No row limit. A very large sheet takes a few minutes — leave the tab open.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Status for rows with no status column</label>
          <select name="status" defaultValue="LIVE" className={field}>
            <option value="LIVE">Live</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="dryRun" defaultChecked className="mt-1" />
          <span>
            Validate only
            <span className="block text-xs text-muted">
              Checks every row and writes nothing. Untick to actually create the listings.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60"
        >
          <Upload size={15} />
          {pending ? 'Working…' : 'Upload'}
        </button>
      </form>

      {state.error && (
        <p className="rounded-xl border border-danger/30 bg-red-50 p-4 text-sm text-danger">{state.error}</p>
      )}

      {state.rows && (
        <div className="rounded-2xl border bg-surface">
          <div className="flex flex-wrap items-center gap-4 border-b p-4 text-sm">
            <span className="font-semibold">
              {state.dryRun ? 'Validation result' : 'Import result'}
            </span>
            <span className="text-brand">
              {state.created} {state.dryRun ? 'ready' : 'created'}
            </span>
            <span className="text-amber-600">{state.skipped} skipped</span>
            <span className="text-danger">{state.failed} failed</span>
            {state.dryRun && (
              <span className="ml-auto text-xs text-muted">
                Nothing was saved — untick “Validate only” and upload again.
              </span>
            )}

            {/* a wrong sheet is spotted after the upload, never before */}
            {state.importId && !undoState.undone && (
              <form action={undo} className="ml-auto">
                <input type="hidden" name="importId" value={state.importId} />
                <button
                  type="submit"
                  disabled={undoing}
                  onClick={(e) => {
                    if (!confirm(`Delete the ${state.created} listing(s) this import created?`)) {
                      e.preventDefault()
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-danger hover:text-danger disabled:cursor-wait disabled:opacity-60"
                >
                  <Undo2 size={14} />
                  {undoing ? 'Undoing…' : 'Undo this import'}
                </button>
              </form>
            )}

            {undoState.undone && (
              <span className="ml-auto text-xs text-danger">
                Undone — {undoState.created} listing(s) removed.
              </span>
            )}
            {undoState.error && <span className="ml-auto text-xs text-danger">{undoState.error}</span>}
          </div>

          {/* every problem row is listed; 5 000 green ticks would only be scrolled past */}
          {state.truncated && (
            <p className="border-b px-4 py-2 text-xs text-muted">
              Showing a sample — the counts above cover every row.
            </p>
          )}

          <ul className="divide-y text-sm">
            {state.rows.map((r) => {
              const { icon: Icon, cls } = OUTCOME[r.outcome]
              return (
                <li key={r.line} className="flex items-start gap-2.5 px-4 py-2.5">
                  <Icon size={15} className={`mt-0.5 shrink-0 ${cls}`} />
                  <span className="w-14 shrink-0 text-xs text-muted">Line {r.line}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{r.name}</span>
                    {r.message && <span className="block text-xs text-muted">{r.message}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
