import QRCode from 'qrcode'
import type { AskTarget } from '@/components/ask-for-review'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

/**
 * The link an owner hands to a customer. `review=ask` opens the review dialog
 * on the public page without pre-filling any stars — `review=1..5` would, and
 * an invite must never put words in the reviewer's mouth.
 */
export function reviewLink(slug: string): string {
  return `${APP_URL}/company/${slug}?review=ask`
}

/** Link + printable QR for each business, both built on the server. */
export async function askTargets(
  businesses: { name: string; slug: string }[],
): Promise<AskTarget[]> {
  return Promise.all(
    businesses.map(async (b) => ({
      name: b.name,
      slug: b.slug,
      url: reviewLink(b.slug),
      qrSvg: await QRCode.toString(reviewLink(b.slug), { type: 'svg', margin: 0 }),
    })),
  )
}
