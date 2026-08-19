/**
 * Writes the square brand icons from the one copy of the crest in lib/brand.ts,
 * which is itself lifted from logo.svg.
 *
 * Favicons and the manifest icon are static files — a route cannot serve them
 * early enough — so they are generated here rather than hand-copied, and a
 * change to the logo means re-running this instead of editing three SVGs.
 *
 *   npm run brand:assets
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BRAND_NAME,
  EMBLEM_PARTS,
  brandMarkSvg,
  emblemDefsSvg,
  fieldGradientSvg,
} from '../src/lib/brand'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function icon(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${BRAND_NAME}">
  <defs>
    ${fieldGradientSvg('kr')}
    ${emblemDefsSvg('kr')}
  </defs>
  ${brandMarkSvg(0, 0, size, 'kr')}
</svg>
`
}

/**
 * The supplied lockups draw the crown loose on the page. The mark it has to
 * match — badge, favicon, QR card — sets the crown in a gold tile, so the two
 * are rebuilt here from the pristine artwork in assets/brand: the crown paths
 * come out, the tile goes in at their place, and the wordmark is left exactly
 * as drawn.
 *
 * The tile fills the canvas height and the crown scales into it, which lands it
 * at very nearly the size the loose crown occupied — the wordmark beside it
 * does not have to move.
 */
const LOCKUP_H = 248.47

function lockup(sourceRel: string): string {
  const src = readFileSync(join(ROOT, sourceRel), 'utf8')
  const crown = new Set(EMBLEM_PARTS.map((p) => p.d))

  let first = -1
  const stripped = src.replace(/<path[^>]*?d="([^"]+)"[^>]*\/>/g, (tag, d, at: number) => {
    if (!crown.has(d)) return tag
    if (first < 0) first = at
    return ''
  })
  if (first < 0) throw new Error(`no crown paths in ${sourceRel}`)

  const tile = `<defs>${fieldGradientSvg('krl')}${emblemDefsSvg('krl')}</defs>${brandMarkSvg(0, 0, LOCKUP_H, 'krl')}`
  return `${stripped.slice(0, first)}${tile}${stripped.slice(first)}`
}

const targets: [string, string][] = [
  ['public/icon.svg', icon(64)],
  ['src/app/icon.svg', icon(64)],
  ['public/logo-mark.svg', icon(256)],
  ['public/logo.svg', lockup('assets/brand/lockup-full.svg')],
  ['public/logo-wordmark.svg', lockup('assets/brand/lockup-wordmark.svg')],
]

for (const [rel, svg] of targets) {
  writeFileSync(join(ROOT, rel), svg, 'utf8')
  console.log(`wrote ${rel}`)
}

/**
 * Apple wants a raster: iOS ignores an SVG touch icon. Rasterised here and
 * committed rather than generated per request, so the icon costs nothing at
 * runtime and does not depend on sharp being present on the host.
 */
async function appleIcon(): Promise<void> {
  const sharp = (await import('sharp')).default
  await sharp(Buffer.from(icon(180)))
    .resize(180, 180)
    .png()
    .toFile(join(ROOT, 'src/app/apple-icon.png'))
  console.log('wrote src/app/apple-icon.png')
}

void appleIcon()
