/**
 * Rasterises the crest into every PNG the Android app and the web manifest
 * need, from the same `lib/brand.ts` the SVG icons come from.
 *
 *   npm run android:assets
 *
 * Android side (android/app/src/main/res):
 *   mipmap-<dpi>/ic_launcher.png              rounded gold tile, for launchers
 *                                         older than adaptive icons (API < 26)
 *   mipmap-<dpi>/ic_launcher_background.png   the gold field, full bleed — the
 *                                         launcher cuts its own shape from it
 *   mipmap-<dpi>/ic_launcher_foreground.png   the white crown inside the safe zone
 *   mipmap-<dpi>/ic_launcher_monochrome.png   crown silhouette for themed icons
 *   drawable-<dpi>/splash.png                 the tile, shown while Chrome warms up
 *
 * Web side (public): the PNG icons the manifest lists beside the SVG. Chrome
 * wants a 192 and a 512 raster before it offers "Install app", and the Play
 * listing wants a 512 full-bleed square, which is `icon-maskable-512.png`.
 */

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  EMBLEM_PARTS,
  EMBLEM_VIEWBOX,
  brandMarkSvg,
  emblemDefsSvg,
  emblemSvg,
  fieldGradientSvg,
} from '../src/lib/brand'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res')

/** Pixel multipliers Android draws each density bucket at. */
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const

const P = 'ka'

function wrap(size: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>${fieldGradientSvg(P)}${emblemDefsSvg(P)}</defs>
  ${body}
</svg>`
}

/** The app icon as the site draws it: white crown on a rounded gold tile. */
function tile(size: number): string {
  return wrap(size, brandMarkSvg(0, 0, size, P))
}

/** The gold field with its gloss, edge to edge — no corners for a mask to miss. */
function field(size: number): string {
  return wrap(
    size,
    `<rect width="${size}" height="${size}" fill="url(#${P}-field)"/>
  <rect width="${size}" height="${size}" fill="url(#${P}-gloss)"/>`,
  )
}

/**
 * The crown alone, `fraction` of the canvas wide, centred. Adaptive icons keep
 * a circle of 66/108 of the canvas safe from every mask, so the foreground and
 * monochrome layers draw the crown at just over half the canvas.
 */
function crown(size: number, fraction: number): string {
  const box = size * fraction
  const at = (size - box) / 2
  return wrap(size, emblemSvg(at, at, box, P, true))
}

/** Every part of the crown in one flat white, for the themed-icon layer. */
function silhouette(size: number, fraction: number): string {
  const box = size * fraction
  const at = (size - box) / 2
  const k = box / EMBLEM_VIEWBOX.width
  const ty = at + (box - EMBLEM_VIEWBOX.height * k) / 2
  const paths = EMBLEM_PARTS.map((p) => `<path d="${p.d}" fill="#ffffff"/>`).join('\n    ')
  return wrap(
    size,
    `<g transform="translate(${at - EMBLEM_VIEWBOX.x * k} ${ty - EMBLEM_VIEWBOX.y * k}) scale(${k})">
    ${paths}
  </g>`,
  )
}

/** Full-bleed field with the crown on it: the maskable web icon and the Play listing icon. */
function fullBleed(size: number): string {
  const box = size * 0.62
  const at = (size - box) / 2
  return wrap(
    size,
    `<rect width="${size}" height="${size}" fill="url(#${P}-field)"/>
  <rect width="${size}" height="${size}" fill="url(#${P}-gloss)"/>
  ${emblemSvg(at, at, box, P, true)}`,
  )
}

type Job = { file: string; svg: string; size: number }

function perDensity(dir: string, name: string, dp: number, draw: (px: number) => string): Job[] {
  return Object.entries(DENSITIES).map(([bucket, mult]) => {
    const px = Math.round(dp * mult)
    return { file: join(RES, `${dir}-${bucket}`, `${name}.png`), svg: draw(px), size: px }
  })
}

const jobs: Job[] = [
  // legacy launcher icon: 48dp
  ...perDensity('mipmap', 'ic_launcher', 48, tile),
  // adaptive layers: 108dp canvas, 66dp safe circle
  ...perDensity('mipmap', 'ic_launcher_background', 108, field),
  ...perDensity('mipmap', 'ic_launcher_foreground', 108, (px) => crown(px, 0.54)),
  ...perDensity('mipmap', 'ic_launcher_monochrome', 108, (px) => silhouette(px, 0.54)),
  // splash: the tile at 128dp, centred by Chrome on backgroundColor
  ...perDensity('drawable', 'splash', 128, tile),
  // web manifest + store listing
  { file: join(ROOT, 'public', 'icon-192.png'), svg: tile(192), size: 192 },
  { file: join(ROOT, 'public', 'icon-512.png'), svg: tile(512), size: 512 },
  { file: join(ROOT, 'public', 'icon-maskable-512.png'), svg: fullBleed(512), size: 512 },
]

async function main(): Promise<void> {
  const sharp = (await import('sharp')).default
  for (const job of jobs) {
    mkdirSync(dirname(job.file), { recursive: true })
    await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png().toFile(job.file)
    console.log(`wrote ${job.file.slice(ROOT.length + 1)} (${job.size}px)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
