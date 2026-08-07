import { Prisma } from '@prisma/client'
import { db } from './db'

/**
 * Recomputes a business's rating summary from its LIVE reviews. Pending and
 * removed reviews never move the average — that is what keeps moderation
 * meaningful, so every status change has to run through here.
 */
export async function recomputeRating(businessId: string) {
  const rows = await db.review.groupBy({
    by: ['rating'],
    where: { businessId, status: 'LIVE' },
    _count: { rating: true },
  })
  const hist = [0, 0, 0, 0, 0] // index 0 => 1 star
  let total = 0
  let sum = 0
  for (const r of rows) {
    const n = r._count.rating
    hist[r.rating - 1] = n
    total += n
    sum += r.rating * n
  }
  await db.business.update({
    where: { id: businessId },
    data: {
      ratingCount: total,
      ratingAvg: total ? new Prisma.Decimal((sum / total).toFixed(2)) : new Prisma.Decimal(0),
      rating1: hist[0],
      rating2: hist[1],
      rating3: hist[2],
      rating4: hist[3],
      rating5: hist[4],
    },
  })
}
