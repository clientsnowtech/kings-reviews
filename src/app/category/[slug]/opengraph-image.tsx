import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

/**
 * Share card for a category listing. Cached for a day like the company card —
 * the counts move slowly and the host cannot spare a render per crawl.
 */
export const alt = 'Category listings on Kings Reviews'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await db.category.findUnique({
    where: { slug },
    select: { id: true, name: true },
  })

  if (!category) {
    return new ImageResponse(
      ogCard({
        title: 'Browse businesses by category',
        subtitle: 'Ratings and reviews across every trade in India.',
      }),
      { ...size },
    )
  }

  // Mirrors listedIn() on the category page: a business counts here whether the
  // category is its primary one or one of its extras.
  const agg = await db.business.aggregate({
    where: {
      status: 'LIVE',
      OR: [{ categoryId: category.id }, { extraCategories: { some: { id: category.id } } }],
    },
    _count: { _all: true },
    _sum: { ratingCount: true },
    _avg: { ratingAvg: true },
  })

  const count = agg._count._all
  const reviews = agg._sum.ratingCount ?? 0
  const chips: string[] = []
  if (count > 0) chips.push(`${count.toLocaleString('en-IN')} listed`)
  if (reviews > 0) chips.push(`${reviews.toLocaleString('en-IN')} reviews`)

  return new ImageResponse(
    ogCard({
      eyebrow: 'Category',
      title: `Best ${category.name} in India`,
      subtitle:
        count > 0
          ? 'Compare ratings and read real customer reviews.'
          : 'Be the first to list your business here.',
      rating: agg._avg.ratingAvg ? Number(agg._avg.ratingAvg) : undefined,
      chips,
    }),
    { ...size },
  )
}
