import { db } from './db'
import { recomputeRating } from './rating'

/**
 * Owner approval has a deadline.
 *
 * Without one, an owner can leave a one-star review PENDING for ever and the
 * rating stays flattering — which makes the whole site worthless. So a review
 * nobody has acted on goes live by itself after a grace period.
 *
 * Only reviews from verified accounts auto-publish. An unverified sign-up is
 * the cheap way to fake a review, and those keep waiting for a human.
 */
export const AUTO_PUBLISH_DAYS = Number(process.env.REVIEW_AUTO_PUBLISH_DAYS ?? 7)

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Publishes overdue reviews and returns how many went live. Scoped to one
 * business when a page only cares about its own, site-wide from the cron
 * script. Safe to call often: the WHERE clause matches nothing once caught up.
 */
export async function publishOverdueReviews(businessId?: string): Promise<number> {
  if (!(AUTO_PUBLISH_DAYS > 0)) return 0

  const due = await db.review.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: new Date(Date.now() - AUTO_PUBLISH_DAYS * DAY_MS) },
      user: { emailVerified: { not: null } },
      ...(businessId ? { businessId } : {}),
    },
    select: { id: true, businessId: true },
    take: 200,
  })
  if (!due.length) return 0

  await db.review.updateMany({
    where: { id: { in: due.map((r) => r.id) } },
    data: { status: 'LIVE', moderatedAt: new Date() },
  })

  for (const id of new Set(due.map((r) => r.businessId))) {
    await recomputeRating(id)
  }

  await db.auditLog.createMany({
    data: due.map((r) => ({
      actorId: 'system',
      actorEmail: 'system',
      action: 'review.auto_publish',
      entity: 'review',
      entityId: r.id,
      detail: `No decision within ${AUTO_PUBLISH_DAYS} days`,
    })),
  })

  return due.length
}

/** When a pending review will publish on its own. */
export function autoPublishDate(createdAt: Date): Date {
  return new Date(createdAt.getTime() + AUTO_PUBLISH_DAYS * DAY_MS)
}
