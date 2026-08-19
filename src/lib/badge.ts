/**
 * Embeddable trust badge — tiers, colours and SVG rendering.
 *
 * The markup here is served by /api/badge/[slug] as an image and inlined by
 * /embed/badge/[slug] inside an iframe, so it must stay fully self-contained:
 * no external fonts, no CSS variables, no classes.
 */

import {
  BRAND_COLORS,
  BRAND_NAME,
  brandMarkSvg,
  emblemDefsSvg,
  fieldGradientSvg,
} from './brand'

export type BadgeTier = 'rated' | 'silver' | 'gold' | 'diamond'
export type BadgeVariant = 'card' | 'square' | 'seal' | 'tile' | 'strip' | 'banner' | 'micro'
export type BadgeTheme = 'light' | 'dark'

export type TierDef = {
  key: BadgeTier
  label: string
  /** minimum review count to earn the tier */
  min: number
  /** minimum average rating to earn it — volume alone should not buy a top tier */
  minRating: number
  from: string
  to: string
  solid: string
  glyph: 'check' | 'star' | 'gem'
}

/**
 * Highest first — tierFor() picks the first tier a business fully clears.
 * Thresholds are tuned for Indian local businesses: a few hundred reviews is
 * already a strong signal, so the old 1k/5k/10k ladder left everyone at base.
 *
 * Colours climb out of the logo: green at base, then a cool grey, then the
 * logo's own gold, then near-black for Diamond — the only rung that outranks
 * gold without fighting it.
 */
export const TIERS: TierDef[] = [
  { key: 'diamond', label: 'Diamond', min: 2000, minRating: 4.5, from: '#3f6459', to: BRAND_COLORS.ink, solid: BRAND_COLORS.ink, glyph: 'gem' },
  { key: 'gold', label: 'Gold', min: 500, minRating: 4, from: BRAND_COLORS.goldLight, to: BRAND_COLORS.gold, solid: '#96701f', glyph: 'star' },
  { key: 'silver', label: 'Silver', min: 100, minRating: 0, from: '#c3d1cb', to: '#5f736c', solid: BRAND_COLORS.muted, glyph: 'star' },
  // base tier rides the logo's green. "Rated", not "Verified" — verification
  // is a separate signal and gets its own tick.
  { key: 'rated', label: 'Rated', min: 0, minRating: 0, from: BRAND_COLORS.greenLight, to: BRAND_COLORS.greenDark, solid: BRAND_COLORS.green, glyph: 'check' },
]

export function tierFor(reviewCount: number, ratingAvg: number): TierDef {
  return (
    TIERS.find((t) => reviewCount >= t.min && ratingAvg >= t.minRating) ?? TIERS[TIERS.length - 1]
  )
}

/** The next rung up the ladder, with whatever is still missing for it. */
export function nextTier(
  reviewCount: number,
  ratingAvg: number,
): { tier: TierDef; needed: number; ratingNeeded: number } | null {
  const ladder = [...TIERS].reverse()
  const current = tierFor(reviewCount, ratingAvg)
  const up = ladder[ladder.findIndex((t) => t.key === current.key) + 1]
  if (!up) return null
  return {
    tier: up,
    needed: Math.max(0, up.min - reviewCount),
    ratingNeeded: ratingAvg >= up.minRating ? 0 : up.minRating,
  }
}

export const BADGE_VARIANTS: BadgeVariant[] = [
  'card',
  'square',
  'seal',
  'tile',
  'strip',
  'banner',
  'micro',
]
export const BADGE_THEMES: BadgeTheme[] = ['light', 'dark']

/**
 * Nominal box per variant. `micro` is the exception — it shrink-wraps its
 * content, so this width is only a fallback; ask badgeSize() for the real one
 * whenever the business data is at hand.
 */
export const BADGE_SIZES: Record<BadgeVariant, { width: number; height: number }> = {
  card: { width: 220, height: 250 },
  square: { width: 180, height: 180 },
  seal: { width: 170, height: 170 },
  tile: { width: 132, height: 132 },
  strip: { width: 330, height: 84 },
  banner: { width: 400, height: 112 },
  micro: { width: 280, height: 34 },
}

export function parseVariant(v: string | null | undefined): BadgeVariant {
  return BADGE_VARIANTS.includes(v as BadgeVariant) ? (v as BadgeVariant) : 'card'
}

export function parseTheme(v: string | null | undefined): BadgeTheme {
  return BADGE_THEMES.includes(v as BadgeTheme) ? (v as BadgeTheme) : 'light'
}

type ThemeDef = { bg: string; border: string; fg: string; muted: string; empty: string }

const THEMES: Record<BadgeTheme, ThemeDef> = {
  light: {
    bg: '#ffffff',
    border: BRAND_COLORS.border,
    fg: BRAND_COLORS.ink,
    muted: BRAND_COLORS.muted,
    empty: BRAND_COLORS.starEmpty,
  },
  dark: { bg: BRAND_COLORS.ink, border: '#22362f', fg: '#ffffff', muted: '#9fb5ac', empty: '#33433c' },
}

/** Build credit, carried by every badge without touching the host page's markup. */
export const CREDIT_URL = 'https://www.clientsnow.in/'
export const CREDIT_NAME = 'ClientsNow'

// keep in step with --star in globals.css: a badge on someone's site and the
// stars on ours show the same rating, so they cannot be two different colours
const STAR_FILL = BRAND_COLORS.star
const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const STAR_PATH = 'M12 2l2.9 6.26 6.1.53-4.6 4.01 1.38 6.7L12 16.9 6.22 19.5 7.6 12.8 3 8.79l6.1-.53z'

export type BadgeInput = {
  name: string
  ratingAvg: number
  ratingCount: number
  /** admin-verified listing — drawn as a tick on the medal, never as a tier */
  verified: boolean
  variant: BadgeVariant
  theme: BadgeTheme
}

// ------------------------------------------------------------------ helpers

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/** The crest from logo.svg on its green field — the same mark as the favicon. */
function brandMark(x: number, y: number, size: number): string {
  return brandMarkSvg(x, y, size, 'kr')
}

/**
 * Mark + wordmark as one lockup, centred on `cx`. Centred rather than pinned
 * to a fixed x: "Kings Reviews" is a wider word than the badge was first laid
 * out for, and a hard-coded start leaves it off-centre in every variant.
 */
function lockup(cx: number, top: number, markSize: number, fontSize: number, fill: string): string {
  const gap = round(markSize * 0.34, 2)
  const total = markSize + gap + textWidth(BRAND_NAME, fontSize, true)
  const x = round(cx - total / 2, 2)
  return `${brandMark(x, top, markSize)}
    <text x="${round(x + markSize + gap, 2)}" y="${round(top + markSize / 2 + fontSize * 0.36, 2)}" font-size="${fontSize}" font-weight="700" fill="${fill}">${BRAND_NAME}</text>`
}

function glyph(kind: TierDef['glyph']): string {
  if (kind === 'check') {
    return `<path d="M5.5 12.6l4.3 4.3L18.6 7.8" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  if (kind === 'gem') {
    return `<path d="M12 2.6l7 5.1-7 13.7-7-13.7z" fill="#ffffff"/>
      <path d="M5 7.7h14M12 2.6v18.8" stroke="#ffffff" stroke-opacity="0.45" stroke-width="0.9"/>`
  }
  return `<path d="${STAR_PATH}" fill="#ffffff"/>`
}

const SPARKLE = 'M12 0l1.5 10.5L24 12l-10.5 1.5L12 24l-1.5-10.5L0 12l10.5-1.5z'

/** Green check disc — the verification mark, drawn from its own centre. */
function tickDisc(cx: number, cy: number, r: number): string {
  return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r + 1.4)}" fill="#ffffff"/>
    <circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${BRAND_COLORS.green}"/>
    <g transform="translate(${round(cx - r)} ${round(cy - r)}) scale(${round((r * 2) / 24, 4)})">
      <path d="M6 12.4l4 4 8-8.6" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`
}

/**
 * Gradient disc with the tier glyph centred inside it. Earned tiers get a
 * metallic sheen; Diamond also gets glints, but only when the disc is big
 * enough for them to read as sparkle rather than dirt.
 */
function medal(cx: number, cy: number, r: number, tier: TierDef, verified = false): string {
  const g = r * 1.15
  const shiny = tier.key !== 'rated'

  // verification tick rides the medal like a profile check — no text to measure
  const tick = verified ? tickDisc(cx + r * 0.72, cy + r * 0.72, r * 0.36) : ''

  const sparkles =
    tier.key === 'diamond' && r >= 18
      ? // kept on the dark half of the gradient — white glints vanish against the light side
        [
          { x: cx + r * 0.58, y: cy + r * 0.56, s: r * 0.38 },
          { x: cx - r * 0.52, y: cy + r * 0.62, s: r * 0.22 },
        ]
          .map(
            (p) =>
              `<g transform="translate(${round(p.x - p.s / 2)} ${round(p.y - p.s / 2)}) scale(${round(p.s / 24, 4)})"><path d="${SPARKLE}" fill="#ffffff" opacity="0.9"/></g>`,
          )
          .join('')
      : ''

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ti-tier)"/>
    ${shiny ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ti-sheen)"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ti-gloss)"/>
    <circle cx="${cx}" cy="${cy}" r="${round(r - 0.9)}" fill="none" stroke="#ffffff" stroke-opacity="0.4"/>
    <g transform="translate(${round(cx - g / 2)} ${round(cy - g / 2)}) scale(${round(g / 24, 4)})">${glyph(tier.glyph)}</g>
    ${sparkles}
    ${tick}`
}

/** Five stars with a partial fill clipped to the rating. */
function starRow(x: number, y: number, size: number, gap: number, value: number, theme: ThemeDef): string {
  const total = size * 5 + gap * 4
  const pct = Math.max(0, Math.min(1, value / 5))
  const s = round(size / 24, 4)
  const row = (color: string) =>
    [0, 1, 2, 3, 4]
      .map(
        (i) =>
          `<path d="${STAR_PATH}" fill="${color}" transform="translate(${round(x + i * (size + gap))} ${y}) scale(${s})"/>`,
      )
      .join('')
  return `<defs><clipPath id="ti-stars"><rect x="${x}" y="${y}" width="${round(total * pct)}" height="${size}"/></clipPath></defs>
    <g>${row(theme.empty)}</g>
    <g clip-path="url(#ti-stars)">${row(STAR_FILL)}</g>`
}

/**
 * Rough advance width for the system font stack. There is no text metric API
 * on the server, so anything that sizes itself to its content measures here.
 * Deliberately a touch generous — over-estimating adds a hair of padding,
 * under-estimating clips.
 */
function textWidth(s: string, fontSize: number, bold = false): number {
  const glyph = bold ? 0.63 : 0.59
  let w = 0
  for (const ch of s) w += fontSize * (/[.,()\s]/.test(ch) ? 0.33 : glyph)
  return w
}

/** Width a tier pill needs so the label never clips. */
function pillWidth(tier: TierDef, fontSize: number): number {
  return Math.round(tier.label.length * (fontSize * 0.72) + fontSize * 2)
}

/** Tier name pill, drawn from its left edge. */
function pill(left: number, y: number, height: number, tier: TierDef, fontSize: number): string {
  const label = tier.label.toUpperCase()
  const width = pillWidth(tier, fontSize)
  const gloss =
    tier.key === 'rated'
      ? ''
      : `<rect x="${left}" y="${y}" width="${width}" height="${round(height / 2)}" rx="${height / 2}" fill="#ffffff" opacity="0.22"/>`
  return `<rect x="${left}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${tier.solid}"/>
    ${gloss}
    <text x="${round(left + width / 2)}" y="${round(y + height / 2 + fontSize * 0.36)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" letter-spacing="0.8" fill="#ffffff">${esc(label)}</text>`
}

function frame(w: number, h: number, radius: number, theme: ThemeDef): string {
  return `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${radius}" fill="${theme.bg}" stroke="${theme.border}"/>`
}

// ------------------------------------------------------------------ variants

function cardBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { width: w, height: h } = BADGE_SIZES.card
  return `${frame(w, h, 18, theme)}
    ${lockup(110, 14, 26, 13, theme.fg)}
    ${medal(110, 78, 28, tier, d.verified)}
    <text x="110" y="128" text-anchor="middle" font-size="13" font-weight="600" fill="${theme.fg}">${esc(clip(d.name, 24))}</text>
    ${starRow(50, 140, 20, 5, avg, theme)}
    <text x="110" y="188" text-anchor="middle" font-size="30" font-weight="700" fill="${theme.fg}">${avg.toFixed(1)}</text>
    <text x="110" y="207" text-anchor="middle" font-size="11.5" fill="${theme.muted}">${formatCount(d.ratingCount)} reviews</text>
    ${pill(Math.round(110 - pillWidth(tier, 10) / 2), 218, 22, tier, 10)}`
}

/** Square card — the compact cousin of `card`, for tight sidebars. */
function squareBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { width: w, height: h } = BADGE_SIZES.square
  const cx = w / 2
  return `${frame(w, h, 20, theme)}
    ${lockup(90, 10, 22, 11, theme.fg)}
    ${medal(cx, 62, 22, tier, d.verified)}
    <text x="${cx}" y="108" text-anchor="middle" font-size="26" font-weight="700" fill="${theme.fg}">${avg.toFixed(1)}</text>
    ${starRow(cx - 41, 116, 14, 3, avg, theme)}
    <text x="${cx}" y="146" text-anchor="middle" font-size="10.5" fill="${theme.muted}">${formatCount(d.ratingCount)} reviews</text>
    ${pill(Math.round(cx - pillWidth(tier, 9.5) / 2), 152, 20, tier, 9.5)}`
}

/**
 * Round seal. No medal — the tier rides the ring instead, so the disc does not
 * fight the circular frame it sits in. Crown and wordmark stack at the top,
 * where a circle has the most usable width.
 */
function sealBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { width: w } = BADGE_SIZES.seal
  const c = w / 2
  return `<circle cx="${c}" cy="${c}" r="${c - 0.5}" fill="${theme.bg}" stroke="${theme.border}"/>
    <circle cx="${c}" cy="${c}" r="${c - 8}" fill="none" stroke="url(#ti-tier)" stroke-width="3"/>
    ${brandMark(c - 15, 22, 30)}
    <text x="${c}" y="64" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing="1.4" fill="${theme.muted}">${BRAND_NAME.toUpperCase()}</text>
    <text x="${c}" y="92" text-anchor="middle" font-size="34" font-weight="700" fill="${theme.fg}">${avg.toFixed(1)}</text>
    ${starRow(c - 38.5, 100, 13, 3, avg, theme)}
    <text x="${c}" y="126" text-anchor="middle" font-size="10.5" fill="${theme.muted}">${formatCount(d.ratingCount)} reviews</text>
    ${pill(Math.round(c - pillWidth(tier, 9) / 2), 132, 19, tier, 9)}
    ${d.verified ? tickDisc(c + 54.4, c - 54.4, 10) : ''}`
}

/**
 * Smallest square. Crown on top, then the rating; the tier reads off a
 * coloured footer band, which doubles as the wordmark strip.
 */
function tileBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { width: w, height: h } = BADGE_SIZES.tile
  const cx = w / 2
  return `${frame(w, h, 16, theme)}
    <defs><clipPath id="ti-band"><rect width="${w}" height="${h}" rx="16"/></clipPath></defs>
    ${brandMark(cx - 12, 8, 24)}
    ${starRow(cx - 38.5, 38, 13, 3, avg, theme)}
    <text x="${cx}" y="76" text-anchor="middle" font-size="26" font-weight="700" fill="${theme.fg}">${avg.toFixed(1)}</text>
    <text x="${cx}" y="90" text-anchor="middle" font-size="9.5" fill="${theme.muted}">${formatCount(d.ratingCount)} reviews</text>
    <g clip-path="url(#ti-band)">
      <rect x="0" y="96" width="${w}" height="${h - 96}" fill="url(#ti-tier)"/>
      <rect x="0" y="96" width="${w}" height="${round((h - 96) / 2)}" fill="#ffffff" opacity="0.14"/>
    </g>
    <text x="${cx}" y="112" text-anchor="middle" font-size="10.5" font-weight="700" fill="#ffffff">${BRAND_NAME}</text>
    <text x="${cx}" y="124" text-anchor="middle" font-size="7.5" letter-spacing="1.2" fill="#ffffff" opacity="0.85">${esc(tier.label.toUpperCase())}</text>
    ${d.verified ? tickDisc(w - 18, 22, 8) : ''}`
}

function stripBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { width: w, height: h } = BADGE_SIZES.strip
  return `${frame(w, h, 16, theme)}
    ${medal(44, 42, 23, tier, d.verified)}
    ${starRow(80, 22, 18, 4, avg, theme)}
    <text x="196" y="37" font-size="17" font-weight="700" fill="${theme.fg}">${avg.toFixed(1)}</text>
    <text x="80" y="60" font-size="11.5" fill="${theme.muted}">${formatCount(d.ratingCount)} reviews on ${BRAND_NAME}</text>
    ${pill(w - 14 - pillWidth(tier, 9.5), 12, 20, tier, 9.5)}
    ${brandMark(w - 42, h - 38, 28)}`
}

/** Full-width footer bar — the strip with room for the business name. */
function bannerBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { width: w, height: h } = BADGE_SIZES.banner
  return `${frame(w, h, 18, theme)}
    ${medal(56, 56, 28, tier, d.verified)}
    <text x="100" y="40" font-size="15" font-weight="700" fill="${theme.fg}">${esc(clip(d.name, 22))}</text>
    ${starRow(100, 52, 18, 4, avg, theme)}
    <text x="216" y="67" font-size="17" font-weight="700" fill="${theme.fg}">${avg.toFixed(1)}</text>
    <text x="100" y="90" font-size="11" fill="${theme.muted}">${formatCount(d.ratingCount)} reviews on ${BRAND_NAME}</text>
    ${pill(w - 16 - pillWidth(tier, 10), 14, 22, tier, 10)}
    ${brandMark(w - 48, h - 46, 32)}`
}

/**
 * `micro` packs its row left to right and ends where the pill ends — a fixed
 * box would have to be wide enough for a six-figure review count, leaving a
 * hole in the middle of every badge that has fewer.
 */
function microLayout(d: BadgeInput, tier: TierDef, avg: number) {
  const starW = 14 * 5 + 3 * 4
  const starX = 34
  const avgText = avg.toFixed(1)
  const countText = `(${formatCount(d.ratingCount)})`
  const avgX = starX + starW + 6
  const countX = avgX + textWidth(avgText, 12, true) + 5
  const pillW = pillWidth(tier, 8.5)
  const pillX = countX + textWidth(countText, 11) + 10
  return {
    starX,
    avgX: round(avgX, 1),
    avgText,
    countX: round(countX, 1),
    countText,
    pillX: round(pillX, 1),
    pillW,
    width: Math.round(pillX + pillW + 12),
  }
}

function microBody(d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number): string {
  const { height: h } = BADGE_SIZES.micro
  const m = microLayout(d, tier, avg)
  // the crown takes the left slot instead of a medal — at 34px tall the tier
  // reads from its pill, and a second disc would just be noise
  return `${frame(m.width, h, 17, theme)}
    ${brandMark(6, 6, 22)}
    ${starRow(m.starX, 10, 14, 3, avg, theme)}
    <text x="${m.avgX}" y="21.5" font-size="12" font-weight="700" fill="${theme.fg}">${m.avgText}</text>
    <text x="${m.countX}" y="21.5" font-size="11" fill="${theme.muted}">${esc(m.countText)}</text>
    ${pill(m.pillX, 8, 18, tier, 8.5)}`
}

// ------------------------------------------------------------------ render

export function badgeAltText(
  d: Pick<BadgeInput, 'name' | 'ratingAvg' | 'ratingCount'> & { verified?: boolean },
): string {
  const avg = Math.max(0, Math.min(5, d.ratingAvg))
  return `${d.name} — ${avg.toFixed(1)} out of 5 from ${formatCount(d.ratingCount)} reviews on ${BRAND_NAME}${d.verified ? ', verified business' : ''}`
}

/** Short stable id suffix, so two inlined badges never share gradient/clip ids. */
function uid(d: BadgeInput): string {
  const seed = `${d.name}|${d.variant}|${d.theme}|${d.ratingCount}|${d.ratingAvg}`
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/**
 * Real rendered box for one badge. Every variant but `micro` is a fixed size;
 * `micro` sizes itself to its content, so embed snippets must ask here rather
 * than reading BADGE_SIZES directly.
 */
export function badgeSize(d: BadgeInput): { width: number; height: number } {
  const box = BADGE_SIZES[d.variant]
  if (d.variant !== 'micro') return box
  const avg = Math.max(0, Math.min(5, d.ratingAvg))
  const { width } = microLayout(d, tierFor(d.ratingCount, d.ratingAvg), avg)
  return { width, height: box.height }
}

export function renderBadgeSvg(d: BadgeInput): string {
  const tier = tierFor(d.ratingCount, d.ratingAvg)
  const theme = THEMES[d.theme]
  const { width, height } = badgeSize(d)
  const avg = Math.max(0, Math.min(5, d.ratingAvg))
  const label = `${badgeAltText(d)} · ${tier.label} badge`

  const bodies: Record<
    BadgeVariant,
    (d: BadgeInput, tier: TierDef, theme: ThemeDef, avg: number) => string
  > = {
    card: cardBody,
    square: squareBody,
    seal: sealBody,
    tile: tileBody,
    strip: stripBody,
    banner: bannerBody,
    micro: microBody,
  }
  const body = bodies[d.variant](d, tier, theme, avg)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}" font-family="${FONT}">
  <title>${esc(label)}</title>
  <desc>Badge by ${CREDIT_NAME} — ${CREDIT_URL}</desc>
  <metadata>${CREDIT_URL}</metadata>
  <defs>
    ${fieldGradientSvg('kr')}
    ${emblemDefsSvg('kr')}
    <linearGradient id="ti-tier" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tier.from}"/><stop offset="1" stop-color="${tier.to}"/>
    </linearGradient>
    <linearGradient id="ti-gloss" x1="0.15" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ti-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0.28" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.44" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${body}
</svg>`

  // namespace the ids — inlined badges on the same page must not fight
  return svg.replace(
    /ti-(tier|stars|gloss|sheen|band)|kr-(field|gloss|goldH|goldV|goldR)/g,
    (m) => `${m}-${uid(d)}`,
  )
}

/** Placeholder shown when a slug does not resolve to a live business. */
export function notFoundSvg(theme: BadgeTheme = 'light'): string {
  const t = THEMES[theme]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="264" height="34" viewBox="0 0 264 34" role="img" aria-label="Business not listed on ${BRAND_NAME}" font-family="${FONT}">
  ${frame(264, 34, 17, t)}
  <text x="132" y="21.5" text-anchor="middle" font-size="11.5" fill="${t.muted}">Business not listed on ${BRAND_NAME}</text>
</svg>`
}
