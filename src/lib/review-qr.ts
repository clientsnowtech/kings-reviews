import QRCode from 'qrcode'

/**
 * Branded review QR.
 *
 * The default `QRCode.toString()` output is a black grid with no owner in it —
 * printed at a counter it could be anyone's code, and nothing says the scan
 * leads to a review. So the modules are drawn here instead: brand teal, rounded
 * eyes, the TrustIndex tile knocked into the middle, and a print-ready card
 * around it that names the business and says what the scan does.
 *
 * The mark in the centre is why every code is generated at error-correction
 * level H — 30% of the symbol can be lost and still decode, and the hole takes
 * about 6% of it.
 */

const BRAND = '#0e7a63'
const BRAND_DARK = '#0a5b49'
const MINT = '#e7f5ef'
const BORDER = '#dfe6e3'
const INK = '#0f172a'
const MUTED = '#64748b'
// 'Noto Sans' leads because that is what the server has: a browser skips past it
// to system-ui, while the mail rasteriser finds it in `assets/fonts` and stops
// there. Both draw the same card; only the server has no second choice.
const FONT = "'Noto Sans',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
// Devanagari needs its own stack — the Latin fonts above draw it as boxes
const FONT_HI = `'Noto Sans Devanagari','Nirmala UI','Mangal',${FONT}`

/** Quiet zone. The spec asks for 4 modules; anything less and phones hunt. */
const MARGIN = 4

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/** The rounded tile + check of the site logo, drawn from its top-left corner. */
function brandTile(x: number, y: number, size: number, id: string): string {
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(size / 32, 4)})">
    <rect width="32" height="32" rx="9" fill="url(#${id})"/>
    <rect width="32" height="16" rx="9" fill="#ffffff" opacity="0.10"/>
    <path d="M9.5 16.4l4 4 9-9.4" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>`
}

/** One finder eye: rounded frame plus rounded pupil, drawn in module units. */
function finder(x: number, y: number): string {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${BRAND_DARK}" stroke-width="1"/>
    <rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1" fill="${BRAND_DARK}"/>`
}

type QrArt = {
  /** side of the symbol including the quiet zone, in module units */
  span: number
  defs: string
  body: string
}

/**
 * Turn a URL into drawable QR art.
 *
 * Finder eyes and the centre hole are skipped in the module loop and drawn as
 * shapes of their own — that is the whole difference between a QR that looks
 * generated and one that looks designed.
 */
function qrArt(url: string, id: string): QrArt {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const size = modules.size

  // odd span so the hole sits dead centre on a module boundary
  const hole = (Math.round(size * 0.21) | 1) + 1
  const holeFrom = (size - hole) / 2
  const holeTo = holeFrom + hole

  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
  const inHole = (r: number, c: number) =>
    r >= holeFrom && r < holeTo && c >= holeFrom && c < holeTo

  let dots = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!modules.data[r * size + c]) continue
      if (inFinder(r, c) || inHole(r, c)) continue
      dots += `<rect x="${c + MARGIN}" y="${r + MARGIN}" width="1" height="1" rx="0.32"/>`
    }
  }

  const eyes = [
    finder(MARGIN, MARGIN),
    finder(MARGIN + size - 7, MARGIN),
    finder(MARGIN, MARGIN + size - 7),
  ].join('')

  // white pad under the mark so the tile never touches a live module
  const pad = 0.6
  const markX = MARGIN + holeFrom
  const markY = MARGIN + holeFrom
  const centre = `<rect x="${round(markX - pad)}" y="${round(markY - pad)}" width="${round(hole + pad * 2)}" height="${round(hole + pad * 2)}" rx="${round(hole * 0.28)}" fill="#ffffff"/>
    ${brandTile(markX + hole * 0.06, markY + hole * 0.06, hole * 0.88, `${id}-mark`)}`

  return {
    span: size + MARGIN * 2,
    defs: `<linearGradient id="${id}-mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12876d"/><stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>`,
    body: `<g fill="${BRAND}">${dots}</g>${eyes}${centre}`,
  }
}

/** The code on its own — used for the on-screen preview and the plain download. */
export function brandedQrSvg(url: string, id = 'tiqr'): string {
  const art = qrArt(url, id)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${art.span * 8}" height="${art.span * 8}" viewBox="0 0 ${art.span} ${art.span}" role="img" aria-label="QR code to review this business on TrustIndex India">
  <defs>${art.defs}</defs>
  <rect width="${art.span}" height="${art.span}" fill="#ffffff"/>
  ${art.body}
</svg>`
}

/** Name sizes down as it grows, so a long one never collides with the card edge. */
function nameSize(name: string): number {
  if (name.length <= 18) return 34
  if (name.length <= 26) return 29
  if (name.length <= 34) return 24
  return 21
}

/**
 * A counter-ready card: brand header, the business name, the code, and one
 * line telling the customer what the scan does. Printed as-is on A-anything.
 */
export function reviewPosterSvg({
  name,
  url,
  logo,
  id = 'tip',
}: {
  name: string
  /** the short link the code carries and the card prints */
  url: string
  /** the business's own logo as a data URI — a card that looks like theirs */
  logo?: string | null
  id?: string
}): string {
  const art = qrArt(url, id)
  const W = 640
  const H = 900

  // QR panel — inset from the card, code centred inside it
  const panel = { x: 120, y: 286, size: 400 }
  const inset = 22
  const codeSize = panel.size - inset * 2
  const scale = round(codeSize / art.span, 5)

  const host = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  // the printed link is for someone typing it by hand — `?review=ask` only
  // opens the review box, and the page alone gets them there
  const shownUrl = clip(url.replace(/^https?:\/\//, '').replace(/\?.*$/, ''), 58)
  const shownName = clip(name, 42)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Review ${esc(name)} on TrustIndex India" font-family="${FONT}">
  <defs>
    ${art.defs}
    <linearGradient id="${id}-band" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12876d"/><stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" rx="34" fill="#ffffff"/>

  <!-- header band: the rounded rect is squared off at the bottom by a second one -->
  <g>
    <rect width="${W}" height="150" rx="34" fill="url(#${id}-band)"/>
    <rect y="110" width="${W}" height="40" fill="url(#${id}-band)"/>
    <rect x="46" y="43" width="52" height="52" rx="15" fill="#ffffff"/>
    <path d="M61 70.5l7.5 7.5 16.5-17" fill="none" stroke="${BRAND}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="116" y="72" font-size="28" font-weight="700" fill="#ffffff">TrustIndex</text>
    <text x="118" y="92" font-size="11" font-weight="600" letter-spacing="6" fill="#ffffff" opacity="0.75">INDIA</text>
    ${
      logo
        ? // the owner's own mark, opposite ours — the card reads as theirs,
          // listed with us, rather than as our advert on their counter
          `<clipPath id="${id}-logo"><rect x="534" y="43" width="60" height="60" rx="16"/></clipPath>
           <rect x="534" y="43" width="60" height="60" rx="16" fill="#ffffff"/>
           <image href="${esc(logo)}" x="538" y="47" width="52" height="52" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id}-logo)"/>`
        : ''
    }
  </g>

  <text x="${W / 2}" y="206" text-anchor="middle" font-size="${nameSize(shownName)}" font-weight="700" fill="${INK}">${esc(shownName)}</text>
  <text x="${W / 2}" y="238" text-anchor="middle" font-size="17" fill="${MUTED}">Scan to leave us a review</text>
  <text x="${W / 2}" y="264" text-anchor="middle" font-size="16" fill="${BRAND}" font-family="${FONT_HI}">स्कैन करें और रिव्यू दें</text>

  <rect x="${panel.x}" y="${panel.y}" width="${panel.size}" height="${panel.size}" rx="26" fill="#ffffff" stroke="${BORDER}" stroke-width="2"/>
  <g transform="translate(${panel.x + inset} ${panel.y + inset}) scale(${scale})">${art.body}</g>

  <text x="${W / 2}" y="726" text-anchor="middle" font-size="16" fill="${MUTED}">Point your phone camera at the code — no app needed.</text>
  <text x="${W / 2}" y="752" text-anchor="middle" font-size="15" fill="${MUTED}" font-family="${FONT_HI}">कैमरा खोलिए, कोड पर ले जाइए।</text>
  <text x="${W / 2}" y="778" text-anchor="middle" font-size="14" font-weight="600" fill="${BRAND}">${esc(shownUrl)}</text>

  <!-- footer: rounded rect squared off at the top, mirroring the header -->
  <g>
    <rect y="800" width="${W}" height="100" rx="34" fill="${MINT}"/>
    <rect y="800" width="${W}" height="40" fill="${MINT}"/>
    <text x="${W / 2}" y="843" text-anchor="middle" font-size="17" font-weight="700" fill="${BRAND_DARK}">It takes 30 seconds and helps the next customer choose.</text>
    <text x="${W / 2}" y="870" text-anchor="middle" font-size="13" font-weight="600" letter-spacing="1.5" fill="${BRAND}">${esc(host)}</text>
  </g>
</svg>`
}
