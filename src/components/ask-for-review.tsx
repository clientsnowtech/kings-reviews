'use client'

import { useState } from 'react'
import { Check, Copy, Download, Mail, MessageSquarePlus, QrCode } from 'lucide-react'
import { Modal } from './modal'

export type AskTarget = {
  name: string
  slug: string
  /** absolute link that opens the review box on the public page */
  url: string
  /** QR for that link, drawn on the server so no scan library ships to the browser */
  qrSvg: string
}

/** What an owner would otherwise write from scratch every single time. */
function inviteText(name: string, url: string): string {
  return `Hi! Thanks for choosing ${name}. Could you spare a minute to review us? It helps other people find us: ${url}`
}

function CopyButton({
  value,
  label = 'Copy',
  className = '',
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          /* clipboard blocked — the text is on screen to copy by hand */
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition ${className}`}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function AskForReview({
  businesses,
  className = '',
}: {
  businesses: AskTarget[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState(businesses[0]?.slug ?? '')
  const [showQr, setShowQr] = useState(false)

  const target = businesses.find((b) => b.slug === slug) ?? businesses[0]
  if (!target) return null

  const message = inviteText(target.name, target.url)

  function downloadQr(biz: AskTarget) {
    const blob = new Blob([biz.qrSvg], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `${biz.slug}-review-qr.svg`
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong'
        }
      >
        <MessageSquarePlus size={16} />
        Ask for review
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ask for a review">
        <div className="space-y-5">
          {businesses.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Business</label>
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
              >
                {businesses.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Your review link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={target.url}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none"
              />
              <CopyButton
                value={target.url}
                className="h-11 shrink-0 bg-brand px-4 text-sm text-white hover:bg-brand-strong"
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              It opens your page with the review box already open.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-brand hover:bg-mint"
            >
              <MessageSquarePlus size={15} />
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(
                `How did we do at ${target.name}?`,
              )}&body=${encodeURIComponent(message)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-brand hover:bg-mint"
            >
              <Mail size={15} />
              Email
            </a>
            <button
              type="button"
              onClick={() => setShowQr((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-brand hover:bg-mint"
            >
              <QrCode size={15} />
              {showQr ? 'Hide QR' : 'QR code'}
            </button>
          </div>

          {showQr && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-background p-4">
              <div
                className="h-36 w-36 shrink-0 rounded-lg bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: target.qrSvg }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm text-muted">
                  Print it for the counter, the receipt or the packaging — a phone camera opens the
                  review box.
                </p>
                <button
                  type="button"
                  onClick={() => downloadQr(target)}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-surface px-3 py-1.5 text-sm font-medium transition hover:border-brand hover:bg-mint"
                >
                  <Download size={15} />
                  Download QR
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Ready-made message</label>
            <textarea
              readOnly
              value={message}
              rows={3}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none rounded-lg border bg-background p-3 text-sm outline-none"
            />
            <CopyButton
              value={message}
              label="Copy message"
              className="mt-2 border px-3 py-1.5 text-sm hover:border-brand hover:bg-mint"
            />
          </div>

          {/* Owners ask this the moment they send the first one. */}
          <p className="rounded-lg bg-mint px-3 py-2 text-xs text-brand-strong">
            Ask everyone, not only the happy customers — buying or filtering reviews gets a listing
            suspended.
          </p>
        </div>
      </Modal>
    </>
  )
}
