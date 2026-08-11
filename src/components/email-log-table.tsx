'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Modal } from './modal'
import { Badge } from './admin-ui'

export type EmailLogRow = {
  id: number
  /** already formatted on the server — formatting again here rehydrates wrong */
  when: string
  to: string
  subject: string
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error: string | null
  /** the body as it was sent, minus any set-password token */
  html: string | null
}

/**
 * The log, with the mail itself one click away.
 *
 * A subject line tells you a notification happened; it does not tell you what
 * the person actually read. That mattered the day every mail here was being
 * skipped and the panel still looked busy.
 *
 * The body renders inside a sandboxed iframe. It is our own HTML today, but it
 * is HTML out of a database being drawn in an admin session — the one place
 * where "probably fine" is not a good enough reason to inline it.
 */
export function EmailLogTable({ rows }: { rows: EmailLogRow[] }) {
  const [open, setOpen] = useState<EmailLogRow | null>(null)

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">To</th>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{row.when}</td>
                <td className="px-4 py-2">{row.to}</td>
                <td className="px-4 py-2">
                  {row.html ? (
                    // a real button, so the row answers the keyboard and reads as
                    // something that opens rather than as text that happens to click
                    <button
                      type="button"
                      onClick={() => setOpen(row)}
                      className="inline-flex items-start gap-2 text-left font-medium text-brand hover:underline"
                    >
                      <Mail size={14} className="mt-0.5 shrink-0 opacity-60" />
                      {row.subject}
                    </button>
                  ) : (
                    <span title="Sent before the body was kept">{row.subject}</span>
                  )}
                  {row.error && (
                    <span className="mt-0.5 block text-xs text-danger">{row.error}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Badge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.subject ?? 'Email'}
        size="lg"
      >
        {open && (
          <div className="space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>To {open.to}</span>
              <span>·</span>
              <span>{open.when}</span>
              <Badge status={open.status} />
            </p>
            {open.status === 'SKIPPED' && (
              <p className="rounded-lg bg-mint px-3 py-2 text-xs">
                This one never left — it is what would have been sent.
              </p>
            )}
            <iframe
              // no allow-scripts: a preview has nothing to run, and the sandbox
              // is the whole reason this is safe to show at all
              sandbox=""
              srcDoc={open.html ?? ''}
              title={`Preview of ${open.subject}`}
              className="h-[65vh] w-full rounded-lg border bg-white"
            />
            <p className="text-xs text-muted">
              Set-password links are stripped from the stored copy, so the button in the preview is
              not a working key.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
