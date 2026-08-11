import Link from 'next/link'
import { HardDriveDownload, ExternalLink } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { backupView, recentRuns, humanSize } from '@/lib/backup'
import { folderUrl, FOLDER_NAME } from '@/lib/drive'
import { runBackupNow, disconnectDriveAction, saveKeep } from '@/lib/backup-actions'
import { SubmitButton } from '@/components/submit-button'
import { Badge } from '@/components/admin-ui'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  await requireAdmin()
  const { connected: justConnected, error } = await searchParams
  const [view, runs] = await Promise.all([backupView(), recentRuns()])

  const last = runs.find((r) => r.status === 'OK')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Backups</h1>
        <p className="mt-1 text-sm text-muted">
          The whole database, dumped every Sunday at 3am and copied to Google Drive. The listings
          could be scraped again; the reviews and the owner accounts could not.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {justConnected && !error && (
        <p className="rounded-xl border border-brand/30 bg-mint px-4 py-3 text-sm text-brand-strong">
          Google Drive connected. The next backup will be copied there.
        </p>
      )}

      <div className="rounded-xl border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto min-w-0">
            <p className="font-semibold">Google Drive</p>
            {view.connected ? (
              <p className="mt-0.5 text-sm text-muted">
                Connected as <strong>{view.driveEmail ?? 'a Google account'}</strong>, uploading to
                the <strong>{FOLDER_NAME}</strong> folder
                {view.connectedAt && ` since ${formatDate(view.connectedAt)}`}.{' '}
                {view.driveFolderId && (
                  <Link
                    href={folderUrl(view.driveFolderId)}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-brand hover:underline"
                  >
                    Open folder <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted">
                Not connected — backups are kept on this server only, which is no help at all on the
                day the server is the thing that fails.
              </p>
            )}
          </div>

          {view.connected ? (
            <form action={disconnectDriveAction}>
              <SubmitButton
                pendingLabel="Disconnecting…"
                confirmMessage="Disconnect Drive? Backups already uploaded stay in the account; new ones will not be copied."
                className="rounded-lg border px-4 py-2 text-sm font-medium text-muted hover:bg-mint"
              >
                Disconnect
              </SubmitButton>
            </form>
          ) : (
            <Link
              href="/admin/backups/connect"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Connect Google Drive
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-4">
        <form action={saveKeep} className="flex items-end gap-2">
          <label className="text-sm">
            <span className="block font-semibold">Keep</span>
            <input
              type="number"
              name="keep"
              min={1}
              max={52}
              defaultValue={view.keep}
              className="mt-1 w-24 rounded-lg border px-3 py-2"
            />
          </label>
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-mint"
          >
            Save
          </SubmitButton>
          <span className="pb-2 text-sm text-muted">
            newest backups, here and on Drive. Older ones are deleted — this account filled its disk
            once already.
          </span>
        </form>

        <form action={runBackupNow} className="ml-auto">
          <SubmitButton
            pendingLabel="Starting…"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
          >
            <HardDriveDownload className="h-4 w-4" /> Back up now
          </SubmitButton>
        </form>
      </div>

      {last && (
        <p className="text-sm text-muted">
          Last good backup: <strong>{formatDate(last.startedAt)}</strong> · {humanSize(last.bytes)}
          {last.driveFileId ? ' · on Drive' : ' · on this server only'}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b bg-mint/40 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Started</th>
              <th className="px-4 py-3 font-semibold">File</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Drive</th>
              <th className="px-4 py-3 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No backup has run yet. Press <strong>Back up now</strong> to make the first one.
                </td>
              </tr>
            )}
            {runs.map((run) => (
              <tr key={run.id} className="border-b align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{formatDate(run.startedAt)}</td>
                <td className="px-4 py-3 font-mono text-xs">{run.fileName}</td>
                <td className="whitespace-nowrap px-4 py-3">{humanSize(run.bytes)}</td>
                <td className="px-4 py-3">
                  {run.driveFileId ? (
                    <Link
                      href={`https://drive.google.com/file/d/${run.driveFileId}/view`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge status={run.status} />
                  {run.error && <p className="mt-1 max-w-md text-xs text-red-600">{run.error}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        A run started here carries on in its own process, so this page can be left. Refresh to see it
        land — a dump of this size takes a few minutes.
      </p>
    </div>
  )
}
