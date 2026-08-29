'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BadgeCheck, Check, Copy, ExternalLink, Globe, Info } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'
import { requestVerification } from '@/lib/business-actions'
import {
  BADGE_SIZES,
  CREDIT_NAME,
  badgeSize,
  CREDIT_URL,
  TIERS,
  formatCount,
  nextTier,
  tierFor,
  type BadgeTheme,
  type BadgeVariant,
} from '@/lib/badge'
import { BRAND_COLORS, BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export type StudioBusiness = {
  id: string
  name: string
  slug: string
  status: string
  ratingAvg: number
  ratingCount: number
  verified: boolean
  verifyRequested: boolean
  verifyReady: boolean
  verifyMissing: { label: string; anchor: string }[]
  badgeEnabled: boolean
}

export type BadgeStats = Record<
  string,
  { total: number; domains: { domain: string; views: number }[] }
>

const VARIANTS: { key: BadgeVariant; label: string; hint: string }[] = [
  { key: 'card', label: 'Card', hint: 'Sidebar / footer' },
  { key: 'square', label: 'Square', hint: 'Compact sidebar' },
  { key: 'seal', label: 'Seal', hint: 'Round, about pages' },
  { key: 'tile', label: 'Tile', hint: 'Smallest square' },
  { key: 'strip', label: 'Strip', hint: 'Header / hero' },
  { key: 'banner', label: 'Banner', hint: 'Full-width footer' },
  { key: 'micro', label: 'Micro', hint: 'Inline, product pages' },
]

const THEMES: { key: BadgeTheme; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
]

function CopyBox({ label, code, note }: { label: string; code: string; note?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="rounded-xl border bg-surface">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2.5">
        <span className="text-sm font-semibold">{label}</span>
        {note && <span className="text-xs text-muted">{note}</span>}
        <button
          type="button"
          onClick={copy}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
            copied ? 'bg-brand text-white' : 'border text-muted hover:border-brand hover:text-brand',
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[11.5px] leading-relaxed text-foreground/80">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * The verification step, offered on the page where its absence is felt. Sending
 * the owner to the edit form to find the same button is a click nobody makes.
 */
function VerifyPrompt({ b, compact }: { b: StudioBusiness; compact?: boolean }) {
  const editHref = `/business/dashboard/businesses/${b.id}/edit`

  if (b.verifyRequested) {
    return (
      <p className={cn('text-muted', compact ? 'text-sm' : 'max-w-[260px] text-center text-sm')}>
        Verification is under review. The badge unlocks as soon as it is approved.
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', compact ? '' : 'max-w-[280px] text-center')}>
      <p className="text-sm text-muted">
        Verify this business first — the badge unlocks once verification is approved.
      </p>
      {b.verifyReady ? (
        <form action={requestVerification} className={compact ? '' : 'flex justify-center'}>
          <input type="hidden" name="businessId" value={b.id} />
          <SubmitButton
            pendingLabel="Requesting…"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
          >
            <BadgeCheck size={15} /> Verify now
          </SubmitButton>
        </form>
      ) : (
        <div className="space-y-1.5">
          <p className="text-sm">
            {b.verifyMissing.length} task{b.verifyMissing.length === 1 ? '' : 's'} left before you
            can ask:
          </p>
          <ul className={cn('space-y-1 text-sm', compact ? '' : 'inline-block text-left')}>
            {b.verifyMissing.map((m) => (
              <li key={m.label}>
                <Link
                  href={`${editHref}#${m.anchor}`}
                  className="font-medium text-brand hover:underline"
                >
                  {m.label} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function BadgeStudio({
  businesses,
  appUrl,
  stats,
}: {
  businesses: StudioBusiness[]
  appUrl: string
  stats: BadgeStats
}) {
  const [id, setId] = useState(businesses[0].id)
  const [variant, setVariant] = useState<BadgeVariant>('card')
  const [theme, setTheme] = useState<BadgeTheme>('light')

  const b = businesses.find((x) => x.id === id) ?? businesses[0]
  // the badge is earned, not granted: an approved listing still has to clear
  // verification before any embed code or preview is handed out
  const live = b.status === 'LIVE' && b.badgeEnabled && b.verified
  const revoked = b.status === 'LIVE' && !b.badgeEnabled
  const unverified = b.status === 'LIVE' && b.badgeEnabled && !b.verified
  const seen = stats[b.id]
  const tier = tierFor(b.ratingCount, b.ratingAvg)
  const up = nextTier(b.ratingCount, b.ratingAvg)
  // micro shrink-wraps its content, so the snippet dimensions have to come
  // from the same measurer the renderer uses, not from the nominal box
  const size = badgeSize({
    name: b.name,
    ratingAvg: b.ratingAvg,
    ratingCount: b.ratingCount,
    verified: b.verified,
    variant,
    theme,
  })

  const qs = `variant=${variant}&theme=${theme}`
  const previewSrc = `/api/badge/${b.slug}?${qs}`
  const imgUrl = `${appUrl}/api/badge/${b.slug}?${qs}`
  const profileUrl = `${appUrl}/company/${b.slug}`

  const snippets = useMemo(() => {
    const alt = `${b.name} reviews on ${BRAND_NAME}`
    const q = qs.replace(/&/g, '&amp;')
    const credit = `<!-- ${BRAND_NAME} badge · built by ${CREDIT_NAME} — ${CREDIT_URL} -->`
    // visible, crawlable build credit — a hidden link would be discounted by search engines
    const creditLink = `  <a href="${CREDIT_URL}" target="_blank" rel="noopener"
     style="display:block;margin-top:6px;font:400 11px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${BRAND_COLORS.muted};text-decoration:none">Powered by ${CREDIT_NAME}</a>`
    const open = `<div style="display:inline-block;max-width:100%;text-align:center">`
    // the width/height attrs reserve the box so the host page never shifts as
    // the badge loads; the CSS lets it shrink when the slot is narrower
    const fluid = `max-width:100%;height:auto`
    // an iframe is not a replaced image: height:auto alone collapses it to the
    // 150px default, so the ratio has to be spelled out
    const fluidFrame = `max-width:100%;aspect-ratio:${size.width}/${size.height};height:auto`

    return {
      html: `${credit}
${open}
  <a href="${profileUrl}?utm_source=badge&amp;utm_medium=referral" target="_blank" rel="noopener">
    <img src="${appUrl}/api/badge/${b.slug}?${q}"
         width="${size.width}" height="${size.height}"
         style="${fluid}"
         alt="${alt}" loading="lazy" />
  </a>
${creditLink}
</div>`,
      iframe: `${credit}
${open}
  <iframe src="${appUrl}/embed/badge/${b.slug}?${q}"
          width="${size.width}" height="${size.height}"
          title="${alt}" loading="lazy" scrolling="no"
          style="border:0;overflow:hidden;${fluidFrame}"></iframe>
${creditLink}
</div>`,
      url: imgUrl,
    }
  }, [appUrl, b.name, b.slug, imgUrl, profileUrl, qs, size.height, size.width])

  return (
    <div className="space-y-6">
      {/* business picker */}
      {businesses.length > 1 && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Business</span>
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {businesses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.status === 'LIVE' ? '' : ` (${x.status.toLowerCase()})`}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* tier status */}
      <div className="rounded-2xl border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${tier.from}, ${tier.to})` }}
          >
            <TierGlyph glyph={tier.glyph} />
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {tier.label} badge
              {b.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  <BadgeCheck size={12} /> Verified
                </span>
              )}
            </div>
            <div className="text-xs text-muted">
              {formatCount(b.ratingCount)} reviews · {b.ratingAvg.toFixed(1)} average
            </div>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            View profile <ExternalLink size={12} />
          </a>
        </div>

        {up ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>
                {up.needed > 0
                  ? `${formatCount(up.needed)} more reviews`
                  : 'Review count already there'}
                {up.ratingNeeded > 0 && ` · hold ${up.ratingNeeded.toFixed(1)}★+`} to{' '}
                <span className="font-semibold text-foreground">{up.tier.label}</span>
              </span>
              <span>{formatCount(up.tier.min)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (b.ratingCount / up.tier.min) * 100)}%`,
                  background: `linear-gradient(90deg, ${up.tier.from}, ${up.tier.to})`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">Top tier reached. Nothing above Diamond.</p>
        )}
      </div>

      {/* style controls + preview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium">Layout</span>
            <div className="flex flex-col gap-1.5">
              {VARIANTS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVariant(v.key)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition',
                    variant === v.key
                      ? 'border-brand bg-mint font-semibold'
                      : 'text-muted hover:border-brand hover:text-foreground',
                  )}
                >
                  <span>{v.label}</span>
                  <span className="text-xs font-normal text-muted">{v.hint}</span>
                  <span className="ml-auto text-[11px] text-muted">
                    {v.key === 'micro' ? 'auto' : BADGE_SIZES[v.key].width}×
                    {BADGE_SIZES[v.key].height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium">Theme</span>
            <div className="flex gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm transition',
                    theme === t.key
                      ? 'border-brand bg-mint font-semibold'
                      : 'text-muted hover:border-brand hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'grid min-h-[240px] place-items-center rounded-2xl border p-4',
            theme === 'dark' ? 'bg-foreground' : 'bg-background',
          )}
        >
          {live ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              width={size.width}
              height={size.height}
              alt={`${b.name} badge preview`}
            />
          ) : unverified ? (
            <VerifyPrompt b={b} />
          ) : (
            <p className="max-w-[240px] text-center text-sm text-muted">
              {revoked
                ? 'Badge revoked by an admin. Contact support to restore it.'
                : 'Badge goes live once this listing is approved.'}
            </p>
          )}
        </div>
      </div>

      {/* embed code */}
      {live ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold">Add it to your website</h3>
          <CopyBox label="HTML" note="recommended — works everywhere" code={snippets.html} />
          <CopyBox
            label="iframe"
            note="hover effect, opens profile in a new tab"
            code={snippets.iframe}
          />
          <CopyBox label="Image URL" note="for page builders & email footers" code={snippets.url} />
          <p className="flex items-start gap-2 rounded-xl border bg-mint/50 px-4 py-3 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            The badge reads live from {BRAND_NAME} — rating, review count and tier update on their
            own, no need to re-paste the code. Paste the snippet as-is: the profile link and the
            “Powered by {CREDIT_NAME}” credit are part of the licence, and badges that strip them
            may be revoked.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-surface px-4 py-3 text-sm text-muted">
          {revoked ? (
            'This badge has been revoked, so the embed code is hidden. Badges are revoked when the profile link or the build credit is stripped from the snippet.'
          ) : unverified ? (
            <div className="space-y-2">
              <p>Only verified businesses can put the badge on their website.</p>
              <VerifyPrompt b={b} compact />
            </div>
          ) : (
            'Embed code appears here after an admin approves the listing.'
          )}
        </div>
      )}

      {/* where the badge is being served */}
      {live && (
        <div className="rounded-2xl border bg-surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Globe size={14} className="text-brand" /> Badge views
            <span className="font-normal text-muted">· last 30 days</span>
          </h3>
          {seen && seen.total > 0 ? (
            <>
              <div className="mt-2 text-2xl font-bold">{formatCount(seen.total)}</div>
              <ul className="mt-3 space-y-1.5">
                {seen.domains.map((d) => (
                  <li key={d.domain} className="flex items-center gap-2 text-sm">
                    <span className="truncate">{d.domain}</span>
                    <span className="ml-auto text-xs text-muted">{formatCount(d.views)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No views yet. They start counting once the badge is live on your site.
            </p>
          )}
        </div>
      )}

      {/* tier ladder */}
      <div className="rounded-2xl border bg-surface p-5">
        <h3 className="text-sm font-bold">Badge tiers</h3>
        <ul className="mt-3 space-y-2">
          {[...TIERS].reverse().map((t) => (
            <li key={t.key} className="flex items-center gap-3 text-sm">
              <span
                className="h-6 w-6 shrink-0 rounded-full"
                style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
              />
              <span className={cn('font-medium', t.key === tier.key && 'text-brand')}>
                {t.label}
              </span>
              <span className="ml-auto text-xs text-muted">
                {t.min === 0
                  ? 'every live listing'
                  : `${formatCount(t.min)}+ reviews${t.minRating > 0 ? ` · ${t.minRating.toFixed(1)}★+` : ''}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TierGlyph({ glyph }: { glyph: 'check' | 'star' | 'gem' }) {
  if (glyph === 'check') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5.5 12.6l4.3 4.3L18.6 7.8"
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (glyph === 'gem') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.6l7 5.1-7 13.7-7-13.7z" fill="#fff" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M12 2l2.9 6.26 6.1.53-4.6 4.01 1.38 6.7L12 16.9 6.22 19.5 7.6 12.8 3 8.79l6.1-.53z" />
    </svg>
  )
}
