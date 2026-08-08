'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, Loader2, Mail, MessageSquarePlus, QrCode } from 'lucide-react'
import { emailReviewCard } from '@/lib/business-actions'
import { Modal } from './modal'

export type AskTarget = {
  /** needed to mail the card from the server, which checks ownership first */
  id: string
  name: string
  slug: string
  /** absolute link that opens the review box on the public page */
  url: string
  /** branded QR for that link, drawn on the server so no QR library ships to the browser */
  qrSvg: string
  /** the same code on a printable card — brand header, business name, one instruction */
  posterSvg: string
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

function save(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  a.click()
  URL.revokeObjectURL(href)
}

function downloadSvg(svg: string, fileName: string) {
  save(new Blob([svg], { type: 'image/svg+xml' }), fileName)
}

/**
 * Print shops, WhatsApp and mail clients all want a bitmap, and an SVG handed
 * to any of them comes out blank — so the card is rasterised here, above its
 * drawn size so it stays sharp on paper.
 */
async function rasterize(svg: string, scale = 2): Promise<Blob | null> {
    const [, w = '640', h = '900'] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? []
    const src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))

    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = src
      })

      const canvas = document.createElement('canvas')
      canvas.width = Number(w) * scale
      canvas.height = Number(h) * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      // a transparent PNG prints as a grey block on some printers
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(src)
  }
}

async function downloadPng(svg: string, fileName: string, scale = 2) {
  const blob = await rasterize(svg, scale)
  // rasterising failed (old browser) — the vector is still worth having
  if (blob) save(blob, fileName)
  else downloadSvg(svg, fileName.replace(/\.png$/, '.svg'))
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Put the card on the clipboard, carrying the message alongside it.
 *
 * One clipboard entry can hold several representations. WhatsApp takes the
 * image on the first paste and opens its media preview; the caption box then
 * takes the text on the second — which is what makes the card and the message
 * arrive as a single chat bubble instead of two.
 */
async function copyCard(blob: Blob, text: string): Promise<'both' | 'image' | 'none'> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
    return 'both'
  } catch {
    // some browsers refuse a multi-type entry — the image alone still helps
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return 'image'
  } catch {
    // Firefox and every non-secure context land here
    return 'none'
  }
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
  const [card, setCard] = useState<{ slug: string; file: File } | null>(null)
  const [note, setNote] = useState('')
  /** which button is drawing a bitmap right now — rasterising is not instant */
  const [busy, setBusy] = useState<
    'cardPng' | 'cardSvg' | 'qrPng' | 'whatsapp' | 'email' | 'mailCard' | null
  >(null)

  const target = businesses.find((b) => b.slug === slug) ?? businesses[0]

  // Rasterised as soon as the dialog opens, not on the click: iOS only honours
  // navigator.share() when it runs straight off the tap, and drawing the card
  // first would spend that permission.
  useEffect(() => {
    if (!open || !target || card?.slug === target.slug) return
    let cancelled = false

    rasterize(target.posterSvg, 2).then((blob) => {
      if (cancelled || !blob) return
      const file = new File([blob], `${target.slug}-review-card.png`, { type: 'image/png' })
      setCard({ slug: target.slug, file })
    })

    return () => {
      cancelled = true
    }
  }, [open, target, card?.slug])

  if (!target) return null

  const message = inviteText(target.name, target.url)
  const ready = card?.slug === target.slug ? card.file : null

  /** The card bitmap, drawn now if the background pass has not landed yet. */
  async function cardFile(): Promise<File | null> {
    if (ready) return ready
    const blob = await rasterize(target.posterSvg, 2)
    if (!blob) return null
    const file = new File([blob], `${target.slug}-review-card.png`, { type: 'image/png' })
    setCard({ slug: target.slug, file })
    return file
  }

  /** Runs an action with its button spinning, so a slow draw never looks dead. */
  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>) {
    setBusy(kind)
    try {
      await action()
    } finally {
      setBusy(null)
    }
  }

  /**
   * Send the invite with the card attached.
   *
   * `wa.me` and `mailto:` carry text only — neither can take a file, so the
   * share sheet is tried first (it hands WhatsApp or the mail app the real
   * PNG). Where that does not exist the card goes to the clipboard, or to
   * disk, and the note says which — an owner who is told nothing assumes the
   * image was sent when it was not.
   */
  async function shareCard(channel: 'whatsapp' | 'email') {
    const mail = `mailto:?subject=${encodeURIComponent(
      `How did we do at ${target.name}?`,
    )}&body=${encodeURIComponent(message)}`

    // The file goes alone on purpose. Handed `text` as well, WhatsApp posts it
    // as its own message and the card follows as a second one — the share sheet
    // has no way to say "this text is the caption". So only the card is shared
    // and the message waits on the clipboard for the caption box.
    const payload = ready ? { files: [ready], title: target.name } : null
    if (payload && navigator.canShare?.(payload)) {
      const copied = await copyText(message)
      try {
        await navigator.share(payload)
        setNote(
          copied
            ? 'Card sent. Paste in the caption box before sending — the message is copied.'
            : 'Card sent. Add the message in the caption box — copying it failed.',
        )
        return
      } catch {
        // the sheet was dismissed — nothing to report
        return
      }
    }

    const file = await cardFile()

    if (channel === 'email') {
      // a mail is one message either way — the body carries the text, the card
      // is attached by hand because mailto: cannot take a file
      if (file) {
        const copied = await copyCard(file, message)
        setNote(
          copied === 'none'
            ? 'Card downloaded — attach it to the mail.'
            : 'Card copied — paste it into the mail body.',
        )
        if (copied === 'none') save(file, file.name)
      }
      window.open(mail, '_self', 'noopener')
      return
    }

    // WhatsApp on the desktop cannot be handed both at once, and prefilling the
    // link with text would post the message on its own — the card would then
    // follow as a second bubble. So the chat opens empty and both sit on the
    // clipboard: paste the card, paste again in the caption, send once.
    const copied = file ? await copyCard(file, message) : 'none'
    if (copied === 'both') {
      setNote('Card + message copied. Paste in the chat, then paste again in the caption box — one message.')
    } else if (copied === 'image') {
      setNote('Card copied. Paste it in the chat, then use “Copy message” for the caption.')
    } else {
      if (file) save(file, file.name)
      setNote('Card downloaded. Attach it, then use “Copy message” for the caption.')
    }

    window.open('https://wa.me/', '_blank', 'noopener')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNote('')
          setOpen(true)
        }}
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong'
        }
      >
        <MessageSquarePlus size={16} />
        Ask for review
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ask for a review" size="lg">
        {/* two columns so the whole thing fits on screen — nothing here is worth
            a scrollbar, and the card is the part owners came to see */}
        <div className="grid gap-5 sm:grid-cols-[1fr_13rem]">
          <div className="min-w-0 space-y-4">
          {businesses.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Business</label>
              <select
                value={slug}
                onChange={(e) => {
                  // the card belongs to the old business — say nothing about it
                  setNote('')
                  setSlug(e.target.value)
                }}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
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
                className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none"
              />
              <CopyButton
                value={target.url}
                className="h-10 shrink-0 bg-brand px-3.5 text-sm text-white hover:bg-brand-strong"
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              It opens your page with the review box already open.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('whatsapp', () => shareCard('whatsapp'))}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:bg-mint disabled:cursor-wait disabled:opacity-60"
              >
                {busy === 'whatsapp' ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <MessageSquarePlus size={15} />
                )}
                WhatsApp
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run('email', () => shareCard('email'))}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:bg-mint disabled:cursor-wait disabled:opacity-60"
              >
                {busy === 'email' ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <Mail size={15} />
                )}
                Email
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {note ||
                'The card is sent as an image and the message is copied for its caption — paste it there so both go as one message.'}
            </p>
          </div>

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

          <aside className="space-y-2">
              {/* the card as it prints — a bare code gives an owner nothing to judge */}
              <div
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition [&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${
                  ready ? '' : 'animate-pulse'
                }`}
                dangerouslySetInnerHTML={{ __html: target.posterSvg }}
              />
              <div className="space-y-2">
                <div className="grid gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run('cardPng', async () => {
                        // the background pass usually has this ready already
                        const file = await cardFile()
                        if (file) save(file, file.name)
                        else downloadSvg(target.posterSvg, `${target.slug}-review-card.svg`)
                      })
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy === 'cardPng' ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden />
                    ) : (
                      <Download size={15} />
                    )}
                    {busy === 'cardPng' ? 'Preparing…' : 'Download card'}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => downloadSvg(target.posterSvg, `${target.slug}-review-card.svg`)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border bg-surface px-2 py-1.5 text-xs font-medium transition hover:border-brand hover:bg-mint disabled:opacity-60"
                  >
                    <Download size={14} />
                    SVG
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run('qrPng', () =>
                        downloadPng(target.qrSvg, `${target.slug}-review-qr.png`, 4),
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border bg-surface px-2 py-1.5 text-xs font-medium transition hover:border-brand hover:bg-mint disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy === 'qrPng' ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                    ) : (
                      <QrCode size={14} />
                    )}
                    {busy === 'qrPng' ? 'Wait…' : 'Code only'}
                  </button>
                  </div>
                  {/* the one path that really does send the card as a file */}
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run('mailCard', async () => {
                        const file = await cardFile()
                        if (!file) {
                          setNote('The card could not be drawn — try the SVG.')
                          return
                        }
                        const body = new FormData()
                        body.set('businessId', target.id)
                        body.set('card', file)
                        const res = await emailReviewCard(body)
                        setNote(
                          res.error ?? `Card mailed to ${res.to} — attached, ready to print.`,
                        )
                      })
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border bg-surface px-2 py-1.5 text-xs font-medium transition hover:border-brand hover:bg-mint disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy === 'mailCard' ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                    ) : (
                      <Mail size={14} />
                    )}
                    {busy === 'mailCard' ? 'Sending…' : 'Mail the card to me'}
                  </button>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-muted">
                  {!ready && (
                    <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-brand" aria-hidden />
                  )}
                  {ready
                    ? 'Print at 3 cm or bigger — never stretch it.'
                    : 'Building the print file…'}
                </p>
              </div>
          </aside>
        </div>
      </Modal>
    </>
  )
}
