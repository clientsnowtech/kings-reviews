import { readFile } from 'fs/promises'
import path from 'path'
import type { AskTarget } from '@/components/ask-for-review'
import { brandedQrSvg, reviewPosterSvg } from './review-qr'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

/**
 * The link an owner hands to a customer. `review=ask` opens the review dialog
 * on the public page without pre-filling any stars — `review=1..5` would, and
 * an invite must never put words in the reviewer's mouth.
 */
export function reviewLink(slug: string): string {
  return `${APP_URL}/company/${slug}?review=ask`
}

/**
 * The short form the printed QR carries. Fewer characters means fewer modules,
 * and a coarser code scans from further away and off smaller paper. See
 * src/app/r/[slug]/route.ts, which redirects it and counts the scan.
 */
export function shortReviewLink(slug: string): string {
  return `${APP_URL}/r/${slug}`
}

/** A logo big enough to bloat the SVG is not worth the personal touch. */
const LOGO_MAX_BYTES = 200 * 1024
const LOGO_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/**
 * Inline an uploaded logo as a data URI.
 *
 * The card is one self-contained SVG that gets rasterised in the browser and
 * mailed as a file, so a `/uploads/...` reference would resolve to nothing by
 * the time anyone looks at it.
 */
async function logoDataUri(logo: string | null | undefined): Promise<string | null> {
  if (!logo || !logo.startsWith('/uploads/')) return null

  const type = LOGO_TYPES[path.extname(logo).toLowerCase()]
  if (!type) return null

  const root = path.join(process.cwd(), 'public', 'uploads')
  const file = path.join(root, path.normalize(logo.slice('/uploads/'.length)))
  // a stored path is data like any other — it does not get to climb out of uploads
  if (!file.startsWith(root)) return null

  try {
    const buf = await readFile(file)
    if (buf.byteLength > LOGO_MAX_BYTES) return null
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    // a logo the disk lost is no reason to withhold the card
    return null
  }
}

/** Link, branded QR and printable card for each business, all built on the server. */
export async function askTargets(
  businesses: { id: string; name: string; slug: string; logo?: string | null }[],
): Promise<AskTarget[]> {
  return Promise.all(
    businesses.map(async (b) => {
      const url = reviewLink(b.slug)
      const short = shortReviewLink(b.slug)
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        url,
        // ids are per-business so two codes on one page cannot share a gradient
        qrSvg: brandedQrSvg(short, `qr-${b.slug}`),
        posterSvg: reviewPosterSvg({
          name: b.name,
          url: short,
          logo: await logoDataUri(b.logo),
          id: `card-${b.slug}`,
        }),
      }
    }),
  )
}
