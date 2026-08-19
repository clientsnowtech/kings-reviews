import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

/**
 * Share card for a business page — the one that actually matters, since a
 * company link is what gets forwarded on WhatsApp.
 *
 * The route has no generateStaticParams, so nothing is rendered at build time;
 * the first share renders the PNG and `revalidate` keeps it cached for a day.
 * That matters here: the production host builds on a single worker and could
 * not afford a card per listing up front.
 */
export const alt = 'Business reviews on Kings Reviews'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await db.business.findFirst({
    where: { slug, status: 'LIVE' },
    select: {
      name: true,
      city: true,
      state: true,
      ratingAvg: true,
      ratingCount: true,
      category: { select: { name: true } },
    },
  })

  // An unknown or unpublished slug still has to return an image — the page
  // itself 404s, but a crawler that asks for the card should not get a 500.
  if (!b) {
    return new ImageResponse(
      ogCard({
        title: 'Business reviews in India',
        subtitle: 'Find and rate businesses on Kings Reviews.',
      }),
      { ...size },
    )
  }

  const chips = [
    b.ratingCount > 0
      ? `${b.ratingCount.toLocaleString('en-IN')} review${b.ratingCount === 1 ? '' : 's'}`
      : 'Be the first to review',
  ]
  if (b.category?.name) chips.push(b.category.name)

  return new ImageResponse(
    ogCard({
      eyebrow: [b.city, b.state].filter(Boolean).join(', '),
      title: b.name,
      subtitle: b.ratingCount > 0 ? 'Rated by real customers' : 'No reviews yet — add yours',
      rating: Number(b.ratingAvg),
      chips,
    }),
    { ...size },
  )
}
