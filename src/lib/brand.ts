/**
 * One place for the brand: the name people read, the colours off logo.svg, and
 * the emblem lifted straight out of that same file.
 *
 * The full lockup ships as /logo.svg and is used wherever there is room for it.
 * What lives here is the emblem alone — the winged crest without the wordmark —
 * because three surfaces need it drawn as raw SVG with no React, no CSS
 * variables and no external file: the embeddable badge, the printed review QR
 * card, and the OG images. The path data is verbatim from logo.svg, so the
 * mark on a customer's website is the artwork we were given, not a redraw.
 */

export const BRAND_NAME = 'Kings Reviews'
/** Wordmark halves: dark word + green word, as set in logo.svg. */
export const BRAND_WORD_ONE = 'Kings'
export const BRAND_WORD_TWO = 'Reviews'
export const BRAND_SHORT = 'Kings'
/** The line set under the wordmark in logo.svg. */
export const BRAND_TAGLINE = 'Reviews that build trust'

export const BRAND_DOMAIN = 'kingsreviews.com'
export const BRAND_URL = `https://www.${BRAND_DOMAIN}`
export const BRAND_EMAIL = `hello@${BRAND_DOMAIN}`

/** Sampled from logo.svg — the same values live as tokens in globals.css. */
export const BRAND_COLORS = {
  green: '#0c785d',
  greenDark: '#0c624e',
  greenLight: '#209273',
  gold: '#b6862d',
  goldMid: '#d5af33',
  goldLight: '#f1d574',
  ink: '#0b1f19',
  muted: '#5b6f67',
  border: '#e4ece8',
  mint: '#e8f4ef',
  cream: '#fdfaf0',
  star: '#d5af33',
  starEmpty: '#dde2de',
} as const

/** Tight box around the crest in logo.svg's own coordinate space. */
export const EMBLEM_VIEWBOX = { x: 14, y: 6, width: 242, height: 234 } as const

export type EmblemPaint = 'goldH' | 'goldV' | 'goldR' | 'white'

/**
 * The crest, part by part: two ground sweeps, two wings, the centre gem, and
 * the five stars. `paint` names which of the three gold gradients the original
 * used — logo.svg gives every element its own gradient with hand-placed
 * coordinates, which collapses to these three once the shapes are drawn at any
 * size other than 770px wide.
 */
export const EMBLEM_PARTS: { d: string; paint: EmblemPaint }[] = [
  {
    paint: 'goldH',
    d: 'M52.71,238.31c0,.23.22.39.44.32,3.76-1.25,31.7-9.91,84.09-9.91s76.81,8.54,80.37,9.88c.22.08.45-.08.45-.32v-7.37c0-.15-.09-.28-.24-.32-3.01-.9-34.64-9.99-80.94-9.99s-80.78,9.61-83.94,10.52c-.15.04-.24.17-.24.32,0,1.08,0,5.43,0,6.87Z',
  },
  {
    paint: 'goldH',
    d: 'M52.71,222.77c0,.23.22.39.44.32,3.76-1.25,31.7-9.91,84.09-9.91s76.81,8.54,80.37,9.88c.22.08.45-.08.45-.32v-7.37c0-.15-.09-.28-.24-.32-3.01-.9-34.64-9.99-80.94-9.99s-80.78,9.61-83.94,10.52c-.15.04-.24.17-.24.32,0,1.08,0,5.43,0,6.87Z',
  },
  {
    paint: 'goldH',
    d: 'M128.72,121.53l5.74,14.9c.09.22.09.46,0,.68-1.64,4.1-17.94,44.45-33.16,62.33-.15.18-.36.29-.59.32l-22.88,3.32c-.98.14-1.5-1.13-.68-1.7,4.41-3.06,11.99-9.07,17.86-17.6.29-.43.18-1.02-.24-1.31l-50.74-35.52c-.77-.54-1.77.26-1.41,1.13l22.77,56.04c.21.51-.06,1.08-.58,1.25l-11.26,3.71c-.47.16-.99-.09-1.17-.55L15.66,114.86c-.34-.88.67-1.66,1.43-1.1l82.43,60.52c.45.33,1.08.21,1.36-.27,2.51-4.24,13.6-23.44,26.09-52.51.33-.78,1.44-.76,1.75.03Z',
  },
  {
    paint: 'goldH',
    d: 'M142.78,121.53l-5.74,14.9c-.09.22-.09.46,0,.68,1.64,4.1,17.94,44.45,33.16,62.33.15.18.36.29.59.32l22.88,3.32c.98.14,1.5-1.13.68-1.7-4.41-3.06-11.99-9.07-17.86-17.6-.29-.43-.18-1.02.24-1.31l50.74-35.52c.77-.54,1.77.26,1.41,1.13l-22.77,56.04c-.21.51.06,1.08.58,1.25l11.26,3.71c.47.16.99-.09,1.17-.55l36.72-93.67c.34-.88-.67-1.66-1.43-1.1l-82.43,60.52c-.45.33-1.08.21-1.36-.27-2.51-4.24-13.6-23.44-26.09-52.51-.33-.78-1.44-.76-1.75.03Z',
  },
  {
    paint: 'goldR',
    d: 'M119.08,83.42l14.55-26.25c.77-1.4,2.78-1.39,3.55.01l14.34,26.24c.3.56.33,1.22.07,1.8l-14.45,32.25c-.72,1.6-2.98,1.6-3.7,0l-14.44-32.24c-.26-.58-.23-1.25.08-1.81Z',
  },
  {
    paint: 'white',
    d: 'M128.02,83.92l6.51-11.75c.35-.64,1.27-.63,1.62,0l6.42,11.75c.14.25.15.56.03.82l-6.47,14.44c-.33.73-1.36.73-1.69,0l-6.47-14.44c-.12-.27-.11-.57.04-.83Z',
  },
  {
    paint: 'goldV',
    d: 'M77.21,30.78l3.6,10.35c.05.14.19.24.34.25l10.96.23c.35,0,.49.45.21.66l-8.73,6.62c-.12.09-.17.25-.13.4l3.18,10.49c.1.33-.27.61-.56.41l-9-6.26c-.13-.09-.29-.09-.42,0l-9,6.26c-.29.2-.66-.07-.56-.41l3.18-10.49c.04-.15,0-.31-.13-.4l-8.73-6.62c-.28-.21-.13-.65.21-.66l10.96-.23c.15,0,.29-.1.34-.25l3.6-10.35c.11-.33.58-.33.69,0Z',
  },
  {
    paint: 'goldV',
    d: 'M32.5,60.47l3.6,10.35c.05.14.19.24.34.25l10.96.23c.35,0,.49.45.21.66l-8.73,6.62c-.12.09-.17.25-.13.4l3.18,10.49c.1.33-.27.61-.56.41l-9-6.26c-.13-.09-.29-.09-.42,0l-9,6.26c-.29.2-.66-.07-.56-.41l3.18-10.49c.04-.15,0-.31-.13-.4l-8.73-6.62c-.28-.21-.13-.65.21-.66l10.96-.23c.15,0,.29-.1.34-.25l3.6-10.35c.11-.33.58-.33.69,0Z',
  },
  {
    paint: 'goldV',
    d: 'M134.93,10.07l3.6,10.35c.05.14.19.24.34.25l10.96.23c.35,0,.49.45.21.66l-8.73,6.62c-.12.09-.17.25-.13.4l3.18,10.49c.1.33-.27.61-.56.41l-9-6.26c-.13-.09-.29-.09-.42,0l-9,6.26c-.29.2-.66-.07-.56-.41l3.18-10.49c.04-.15,0-.31-.13-.4l-8.73-6.62c-.28-.21-.13-.65.21-.66l10.96-.23c.15,0,.29-.1.34-.25l3.6-10.35c.11-.33.58-.33.69,0Z',
  },
  {
    paint: 'goldV',
    d: 'M192.66,30.9l3.6,10.35c.05.14.19.24.34.25l10.96.23c.35,0,.49.45.21.66l-8.73,6.62c-.12.09-.17.25-.13.4l3.18,10.49c.1.33-.27.61-.56.41l-9-6.26c-.13-.09-.29-.09-.42,0l-9,6.26c-.29.2-.66-.07-.56-.41l3.18-10.49c.04-.15,0-.31-.13-.4l-8.73-6.62c-.28-.21-.13-.65.21-.66l10.96-.23c.15,0,.29-.1.34-.25l3.6-10.35c.11-.33.58-.33.69,0Z',
  },
  {
    paint: 'goldV',
    d: 'M236.08,60.72l3.6,10.35c.05.14.19.24.34.25l10.96.23c.35,0,.49.45.21.66l-8.73,6.62c-.12.09-.17.25-.13.4l3.18,10.49c.1.33-.27.61-.56.41l-9-6.26c-.13-.09-.29-.09-.42,0l-9,6.26c-.29.2-.66-.07-.56-.41l3.18-10.49c.04-.15,0-.31-.13-.4l-8.73-6.62c-.28-.21-.13-.65.21-.66l10.96-.23c.15,0,.29-.1.34-.25l3.6-10.35c.11-.33.58-.33.69,0Z',
  },
]

/** Gradient stops for the three golds, shared by every renderer of the crest. */
export const EMBLEM_GRADIENTS = {
  goldH: {
    kind: 'linear' as const,
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0,
    stops: [
      { offset: 0, color: BRAND_COLORS.gold },
      { offset: 0.39, color: BRAND_COLORS.goldMid },
      { offset: 0.51, color: BRAND_COLORS.goldLight },
      { offset: 0.61, color: '#dcb959' },
      { offset: 1, color: BRAND_COLORS.gold },
    ],
  },
  goldV: {
    kind: 'linear' as const,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      { offset: 0.01, color: BRAND_COLORS.goldLight },
      { offset: 0.6, color: BRAND_COLORS.goldMid },
      { offset: 1, color: BRAND_COLORS.gold },
    ],
  },
  goldR: {
    kind: 'radial' as const,
    stops: [
      { offset: 0, color: BRAND_COLORS.gold },
      { offset: 0.25, color: BRAND_COLORS.goldLight },
      { offset: 0.52, color: BRAND_COLORS.gold },
      { offset: 1, color: BRAND_COLORS.goldLight },
    ],
  },
} as const

/** `<defs>` for the crest's gradients, id-prefixed so two marks never collide. */
export function emblemDefsSvg(prefix: string): string {
  const stops = (s: readonly { offset: number; color: string }[]) =>
    s.map((p) => `<stop offset="${p.offset}" stop-color="${p.color}"/>`).join('')
  const h = EMBLEM_GRADIENTS.goldH
  const v = EMBLEM_GRADIENTS.goldV
  return `<linearGradient id="${prefix}-goldH" x1="${h.x1}" y1="${h.y1}" x2="${h.x2}" y2="${h.y2}">${stops(h.stops)}</linearGradient>
    <linearGradient id="${prefix}-goldV" x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}">${stops(v.stops)}</linearGradient>
    <radialGradient id="${prefix}-goldR">${stops(EMBLEM_GRADIENTS.goldR.stops)}</radialGradient>`
}

function paintUrl(prefix: string, paint: EmblemPaint): string {
  return paint === 'white' ? '#ffffff' : `url(#${prefix}-${paint})`
}

/**
 * The crown alone, scaled into a `size`-wide box at (x, y).
 *
 * `invert` flips the paint for the gold field: the crown goes white and the
 * gem's inner facet takes the gold, so the shape keeps its detail instead of
 * flattening into a single white silhouette.
 */
export function emblemSvg(
  x: number,
  y: number,
  size: number,
  prefix: string,
  invert = false,
): string {
  const box = EMBLEM_VIEWBOX
  const k = round(size / box.width)
  const ty = round(y + (size - box.height * k) / 2)
  const fill = (p: EmblemPaint) =>
    invert ? (p === 'white' ? BRAND_COLORS.goldMid : '#ffffff') : paintUrl(prefix, p)
  return `<g transform="translate(${round(x - box.x * k)} ${round(ty - box.y * k)}) scale(${k})">
    ${EMBLEM_PARTS.map((p) => `<path d="${p.d}" fill="${fill(p.paint)}"/>`).join('\n    ')}
  </g>`
}

/**
 * The app icon: a white crown on the logo's gold field, rounded. Used wherever a
 * square lockup is needed and the wordmark would not survive the shrink —
 * badges, the QR card, favicons. The crown needs about 24px to read, so no
 * surface should draw this smaller than that.
 *
 * Callers must inline `emblemDefsSvg(prefix)` plus a `${prefix}-field` gradient
 * in their own `<defs>`.
 */
export function brandMarkSvg(x: number, y: number, size: number, prefix: string): string {
  const r = round(size * 0.28)
  const pad = round(size * 0.16)
  const art = emblemSvg(round(x + pad), round(y + pad), round(size - pad * 2), prefix, true)
  return `<g>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="url(#${prefix}-field)"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="url(#${prefix}-gloss)"/>
    ${art}
  </g>`
}

/**
 * The gold field the crown sits on, plus the light that falls across it. The
 * gloss is a gradient rather than a half-height rectangle: a flat overlay
 * leaves a hard seam straight through the middle of the tile.
 */
export function fieldGradientSvg(prefix: string): string {
  return `<linearGradient id="${prefix}-field" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND_COLORS.goldLight}"/>
      <stop offset="0.55" stop-color="${BRAND_COLORS.goldMid}"/>
      <stop offset="1" stop-color="${BRAND_COLORS.gold}"/>
    </linearGradient>
    <linearGradient id="${prefix}-gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>`
}

function round(n: number, dp = 3): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
