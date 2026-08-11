import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { mailSettingsView, BREVO_HOST, BREVO_PORT } from '@/lib/mail-settings'
import {
  saveCommunicationSettings,
  sendTestEmail,
  clearEmailLog,
} from '@/lib/communication-actions'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/admin-ui'
import { EmailLogTable } from '@/components/email-log-table'

export const dynamic = 'force-dynamic'

const field =
  'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand'
const label = 'block text-xs font-medium text-muted'

function when(date: Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; test?: string; error?: string }>
}) {
  await requireAdmin()
  const { saved, test, error } = await searchParams

  const [settings, log, counts] = await Promise.all([
    mailSettingsView(),
    db.emailLog.findMany({ orderBy: { id: 'desc' }, take: 50 }),
    db.emailLog.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const tally = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<
    string,
    number | undefined
  >

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Communication</h1>
        <p className="mt-1 text-sm text-muted">
          The SMTP account every notification goes out through — review alerts, listing
          decisions, claim invitations and the QR card. Saved here, these beat the server&apos;s
          environment variables and take effect without a deploy.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg bg-mint px-4 py-2.5 text-sm text-brand-strong">
          Settings saved. Send yourself a test below to be sure they work.
        </p>
      )}
      {test && (
        <p className="rounded-lg bg-mint px-4 py-2.5 text-sm text-brand-strong">
          Test email sent to {test}. If it does not arrive, check the spam folder and the sender
          you verified with Brevo.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-danger">{error}</p>}

      {/* ------------------------------------------------------ settings */}
      <form
        action={saveCommunicationSettings}
        className="space-y-4 rounded-xl border bg-surface p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">SMTP account</h2>
          {settings.saved ? (
            <Badge status={settings.enabled ? 'SENT' : 'SKIPPED'} />
          ) : (
            <span className="text-xs text-muted">
              not saved yet — the environment variables are what send mail right now
            </span>
          )}
          {settings.updatedAt && (
            <span className="ml-auto text-xs text-muted">updated {when(settings.updatedAt)}</span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="host">
              Host
            </label>
            <input
              id="host"
              name="host"
              required
              defaultValue={settings.host || BREVO_HOST}
              className={field}
            />
            <p className="mt-1 text-[11px] text-muted">Brevo: {BREVO_HOST}</p>
          </div>
          <div>
            <label className={label} htmlFor="port">
              Port
            </label>
            <input
              id="port"
              name="port"
              type="number"
              min={1}
              max={65535}
              required
              defaultValue={settings.port || BREVO_PORT}
              className={field}
            />
            <p className="mt-1 text-[11px] text-muted">
              587 for STARTTLS, 465 for TLS. Brevo takes either.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="username">
              Login
            </label>
            <input
              id="username"
              name="username"
              autoComplete="off"
              defaultValue={settings.username}
              className={field}
            />
            <p className="mt-1 text-[11px] text-muted">
              Brevo shows this under SMTP &amp; API → SMTP — usually 9xxxxx001@smtp-brevo.com, not
              your account email.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="password">
              SMTP key
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={settings.hasPassword ? 'Stored — type to replace' : 'xsmtpsib-…'}
              className={field}
            />
            <p className="mt-1 text-[11px] text-muted">
              Stored encrypted and never shown again. Leave it empty to keep the current one.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="fromName">
              From name
            </label>
            <input
              id="fromName"
              name="fromName"
              defaultValue={settings.fromName}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="fromEmail">
              From address
            </label>
            <input
              id="fromEmail"
              name="fromEmail"
              type="email"
              required
              defaultValue={settings.fromEmail}
              className={field}
            />
            <p className="mt-1 text-[11px] text-muted">
              Must be a sender or domain you verified inside Brevo, or it rejects the message.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          Send email
          <span className="text-xs text-muted">
            — off keeps the settings but logs every notification as skipped
          </span>
        </label>

        <SubmitButton
          pendingLabel="Saving…"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Save settings
        </SubmitButton>
      </form>

      {/* ---------------------------------------------------------- test */}
      <form
        action={sendTestEmail}
        className="flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-4"
      >
        <div className="min-w-[16rem] flex-1">
          <label className={label} htmlFor="to">
            Send a test email
          </label>
          <input
            id="to"
            name="to"
            type="email"
            required
            placeholder="you@example.com"
            className={field}
          />
        </div>
        <SubmitButton
          pendingLabel="Sending…"
          className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-background"
        >
          Send test
        </SubmitButton>
      </form>

      {/* ----------------------------------------------------------- log */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold">Recent emails</h2>
          <span className="text-xs text-muted">
            {tally.SENT ?? 0} sent · {tally.FAILED ?? 0} failed · {tally.SKIPPED ?? 0} skipped
            {log.length > 0 && ' · last 50 shown'}
          </span>
          {log.length > 0 && (
            <form action={clearEmailLog} className="ml-auto">
              <SubmitButton
                pendingLabel="Clearing…"
                confirmMessage="Delete the whole email log?"
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50"
              >
                Clear log
              </SubmitButton>
            </form>
          )}
        </div>

        {log.length === 0 ? (
          <p className="rounded-xl border bg-surface p-8 text-center text-muted">
            Nothing sent yet. Every notification the site sends lands here — including the ones
            that failed, which is the only place a failure is visible.
          </p>
        ) : (
          // `when` is formatted here rather than in the client component: the
          // server and the browser sit in different time zones often enough that
          // formatting the same instant twice is a hydration mismatch waiting.
          <EmailLogTable
            rows={log.map((row) => ({
              id: row.id,
              when: when(row.createdAt),
              to: row.to,
              subject: row.subject,
              status: row.status,
              error: row.error,
              html: row.html,
            }))}
          />
        )}
      </div>
    </div>
  )
}
