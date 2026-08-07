'use client'

import { useActionState } from 'react'
import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react'
import {
  startTwoFactor,
  cancelTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
  type AccountState,
} from '@/lib/account-actions'
import { SubmitButton } from './submit-button'

const initial: AccountState = {}

/** One input serves both a 6-digit app code and a backup code. */
function CodeInput({ error, label = 'Code from your app' }: { error?: string; label?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        placeholder="123456"
        required
        className="h-11 w-44 rounded-lg border bg-background px-3 tracking-[0.3em] outline-none focus:border-brand"
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

function BackupCodes({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">Save these backup codes somewhere safe</p>
      <p className="mt-0.5 text-xs text-amber-800">
        Each one logs you in once if you lose your phone. This is the only time they are shown.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
        {codes.map((c) => (
          <li key={c} className="rounded bg-white px-2 py-1 text-center">
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}
        className="mt-3 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
      >
        Copy all
      </button>
    </div>
  )
}

export function TwoFactorPanel({
  enabled,
  enabledAt,
  pendingSecret,
  qrSvg,
  backupLeft,
}: {
  enabled: boolean
  enabledAt: string | null
  /** set only while a setup is half-finished */
  pendingSecret: string | null
  qrSvg: string | null
  backupLeft: number
}) {
  const [confirmState, confirmAction] = useActionState(confirmTwoFactor, initial)
  const [disableState, disableAction] = useActionState(disableTwoFactor, initial)
  const [codesState, codesAction] = useActionState(regenerateBackupCodes, initial)

  // Right after either action, the fresh codes are the only thing that matters.
  const freshCodes = confirmState.backupCodes ?? codesState.backupCodes

  return (
    <section className="space-y-4 rounded-xl border bg-surface p-6">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
            enabled ? 'bg-mint text-brand' : 'bg-background text-muted'
          }`}
        >
          {enabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Two-factor authentication</h2>
          <p className="text-sm text-muted">
            {enabled
              ? `On since ${enabledAt}. Logging in asks for a code from your authenticator app.`
              : 'Add a second step at login with Google Authenticator, Authy, 1Password or any TOTP app.'}
          </p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            enabled ? 'bg-mint text-brand-strong' : 'bg-background text-muted'
          }`}
        >
          {enabled ? 'On' : 'Off'}
        </span>
      </div>

      {freshCodes && <BackupCodes codes={freshCodes} />}

      {/* ---------------------------------------------------------------- off */}
      {!enabled && !pendingSecret && (
        <form action={startTwoFactor}>
          <SubmitButton
            pendingLabel="Preparing…"
            className="h-11 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-strong"
          >
            Set up two-factor
          </SubmitButton>
        </form>
      )}

      {/* ---------------------------------------------------------- setting up */}
      {!enabled && pendingSecret && (
        <div className="space-y-4 rounded-lg border bg-background p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Open your authenticator app and scan this square.</li>
            <li>Type the 6-digit code it shows to finish.</li>
          </ol>

          <div className="flex flex-wrap items-center gap-5">
            {qrSvg && (
              <div
                className="h-40 w-40 rounded-lg bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted">Can’t scan? Enter this key by hand:</p>
              <code className="mt-1 block break-all rounded bg-surface px-2 py-1 font-mono text-sm">
                {pendingSecret}
              </code>
            </div>
          </div>

          <form action={confirmAction} className="space-y-3">
            <CodeInput error={confirmState.fieldErrors?.code} />
            {confirmState.error && <p className="text-sm text-danger">{confirmState.error}</p>}
            <SubmitButton
              pendingLabel="Checking…"
              className="h-11 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-strong"
            >
              Turn on
            </SubmitButton>
          </form>

          <form action={cancelTwoFactor}>
            <SubmitButton className="text-sm text-muted underline hover:text-foreground">
              Cancel setup
            </SubmitButton>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------------------- on */}
      {enabled && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm">
            <KeyRound size={16} className="text-muted" />
            <span>
              <strong>{backupLeft}</strong> backup code{backupLeft === 1 ? '' : 's'} left
            </span>
            <form action={codesAction} className="ml-auto flex items-center gap-2">
              <input
                name="code"
                placeholder="app code"
                required
                className="h-9 w-28 rounded-lg border bg-surface px-2 text-sm outline-none focus:border-brand"
              />
              <SubmitButton
                pendingLabel="Working…"
                confirmMessage="New codes make the old ones stop working. Continue?"
                className="h-9 rounded-lg border px-3 text-sm font-medium hover:bg-mint"
              >
                New codes
              </SubmitButton>
            </form>
          </div>
          {codesState.fieldErrors?.code && (
            <p className="text-sm text-danger">{codesState.fieldErrors.code}</p>
          )}
          {codesState.error && <p className="text-sm text-danger">{codesState.error}</p>}

          <form action={disableAction} className="space-y-3 border-t pt-4">
            <p className="text-sm text-muted">
              Turning this off needs one live code, so a borrowed session cannot do it alone.
            </p>
            <CodeInput error={disableState.fieldErrors?.code} label="App code or backup code" />
            {disableState.error && <p className="text-sm text-danger">{disableState.error}</p>}
            <SubmitButton
              pendingLabel="Turning off…"
              confirmMessage="Turn off two-factor authentication?"
              className="h-11 rounded-lg border border-danger/40 px-5 font-medium text-danger hover:bg-red-50"
            >
              Turn off two-factor
            </SubmitButton>
          </form>
        </div>
      )}
    </section>
  )
}
