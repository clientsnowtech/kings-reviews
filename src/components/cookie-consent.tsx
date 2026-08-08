'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { Modal } from '@/components/modal'
import {
  CONSENT_CATEGORIES,
  CONSENT_OPEN_EVENT,
  DENY_ALL,
  GRANT_ALL,
  getConsentSnapshot,
  getServerConsentSnapshot,
  openCookieSettings,
  readConsent,
  subscribeConsent,
  writeConsent,
  type ConsentCategory,
  type ConsentChoices,
} from '@/lib/consent'

/**
 * The consent banner and its preferences dialog.
 *
 * Deliberately *not* a blocking overlay: the notice has to be readable before
 * you answer it, and trapping the page behind a dialog is the pattern that
 * pushes people into clicking "accept" to get rid of it. "Reject all" sits next
 * to "Accept all" with the same weight for the same reason — consent that is
 * cheaper to give than to refuse is not freely given.
 *
 * Nothing renders until the cookie has been read on the client. Reading it on
 * the server instead would make every route dynamic, which would cost this
 * directory its static pages.
 */
export function CookieConsent() {
  // `undefined` until hydration finishes, `null` once read and still unanswered.
  const record = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ConsentChoices>(DENY_ALL)

  // Re-opened from the footer, the privacy notice, or anywhere else later.
  useEffect(() => {
    const onOpen = () => {
      setDraft(readConsent() ?? DENY_ALL)
      setOpen(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  const save = useCallback((choices: ConsentChoices) => {
    writeConsent(choices)
    setOpen(false)
  }, [])

  const showBanner = record === null && !open

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Cookie consent"
          className="animate-fade-up fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4"
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-float sm:flex-row sm:items-center sm:gap-6 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-brand">
                <Cookie size={18} />
              </span>
              <p className="text-sm leading-relaxed text-muted">
                We use cookies that are needed to run the site, and — only if you allow them —
                cookies for preferences, analytics and marketing. You can change your mind at any
                time.{' '}
                <Link href="/privacy" className="font-medium text-brand hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>

            {/* Order matters on a phone: the two equal choices sit together, and
                "Customise" is the wide row underneath rather than a cramped third. */}
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => save(DENY_ALL)}
                  className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-background sm:flex-none"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={() => save(GRANT_ALL)}
                  className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong active:scale-[0.98] sm:flex-none"
                >
                  Accept all
                </button>
              </div>
              <button
                type="button"
                onClick={openCookieSettings}
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted underline-offset-4 hover:text-brand hover:underline"
              >
                Customise
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          // Closing without choosing is not consent. If nothing is stored yet the
          // banner simply comes back; a stored choice is left exactly as it was.
          setOpen(false)
        }}
        title="Cookie preferences"
      >
        <p className="text-sm leading-relaxed text-muted">
          Turn on only what you are comfortable with. Everything except strictly necessary cookies
          is off until you switch it on, and withdrawing later is one click from the footer.
        </p>

        <div className="mt-5 space-y-3">
          {CONSENT_CATEGORIES.map((category) => (
            <CategoryRow
              key={category.key}
              title={category.title}
              body={category.body}
              examples={category.examples}
              checked={category.required ? true : draft[category.key as ConsentCategory]}
              disabled={category.required}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, [category.key as ConsentCategory]: value }))
              }
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => save(draft)}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong active:scale-[0.98]"
          >
            Save my choices
          </button>
          <button
            type="button"
            onClick={() => save(GRANT_ALL)}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-background"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => save(DENY_ALL)}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-background"
          >
            Reject all
          </button>
        </div>

        {record?.at && (
          <p className="mt-4 text-xs text-muted">
            Your current choice was recorded on{' '}
            {new Date(record.at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        )}
      </Modal>
    </>
  )
}

function CategoryRow({
  title,
  body,
  examples,
  checked,
  disabled,
  onChange,
}: {
  title: string
  body: string
  examples: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-4 rounded-xl border p-4 ${
        disabled ? 'bg-background' : 'hover:border-brand'
      }`}
    >
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold">
          {title}
          {disabled && (
            <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-brand">
              Always on
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{body}</span>
        <span className="mt-1.5 block font-mono text-[11px] text-muted">{examples}</span>
      </div>

      {/* A real checkbox drawn as a switch — keyboard, screen readers and form
          semantics all keep working, only the paint is ours. */}
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-star-empty transition checked:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

/**
 * Withdrawal has to be as easy as consent, so this sits in the footer of every
 * page and in the privacy notice.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Cookie preferences
    </button>
  )
}
