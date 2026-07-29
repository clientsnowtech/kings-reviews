import { db } from '@/lib/db'

/**
 * Serving-side plumbing for the embeddable badge.
 *
 * A badge sits on someone else's website, so every visitor there is a request
 * here. Three guards keep that cheap and safe: a short in-process memo instead
 * of a DB round trip per view, a per-IP ceiling, and impression counters that
 * are buffered rather than written one row at a time.
 */

export type BadgeBusiness = {
  id: string
  name: string
  ratingAvg: number
  ratingCount: number
  verified: boolean
  badgeEnabled: boolean
}

// ------------------------------------------------------------------ read cache

const CACHE_TTL = 60_000
const CACHE_MAX = 500

const cache = new Map<string, { at: number; row: BadgeBusiness | null }>()

export async function getBadgeBusiness(slug: string): Promise<BadgeBusiness | null> {
  const hit = cache.get(slug)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.row

  const b = await db.business.findFirst({
    where: { slug, status: 'LIVE' },
    select: {
      id: true,
      name: true,
      ratingAvg: true,
      ratingCount: true,
      verifiedAt: true,
      badgeEnabled: true,
    },
  })

  const row: BadgeBusiness | null = b
    ? {
        id: b.id,
        name: b.name,
        ratingAvg: Number(b.ratingAvg),
        ratingCount: b.ratingCount,
        verified: b.verifiedAt !== null,
        badgeEnabled: b.badgeEnabled,
      }
    : null

  cache.set(slug, { at: Date.now(), row })
  if (cache.size > CACHE_MAX) {
    const now = Date.now()
    for (const [k, v] of cache) if (now - v.at >= CACHE_TTL) cache.delete(k)
  }
  return row
}

/** Drop a slug from the memo — call after the listing or its badge state changes. */
export function forgetBadgeBusiness(slug: string) {
  cache.delete(slug)
}

// ------------------------------------------------------------------ rate limit

const RATE_WINDOW = 60_000
const RATE_MAX = 120
const RATE_MAX_KEYS = 10_000

const hits = new Map<string, { n: number; reset: number }>()

/** Fixed-window counter per caller. Returns false once the window is spent. */
export function allowBadgeRequest(key: string): boolean {
  const now = Date.now()
  const e = hits.get(key)

  if (!e || now > e.reset) {
    hits.set(key, { n: 1, reset: now + RATE_WINDOW })
    if (hits.size > RATE_MAX_KEYS) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k)
    }
    return true
  }
  if (e.n >= RATE_MAX) return false
  e.n++
  return true
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim()
}

// ------------------------------------------------------------------ impressions

const FLUSH_MS = 30_000
const FLUSH_MAX_KEYS = 200

const pending = new Map<string, number>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

export function refererDomain(referer: string | null): string {
  if (!referer) return 'direct'
  try {
    return new URL(referer).hostname.replace(/^www\./, '').slice(0, 190) || 'direct'
  } catch {
    return 'direct'
  }
}

/** Count a badge render. Cheap and synchronous — the DB write happens later. */
export function recordBadgeView(businessId: string, referer: string | null) {
  const key = `${businessId}|${refererDomain(referer)}`
  pending.set(key, (pending.get(key) ?? 0) + 1)

  if (pending.size >= FLUSH_MAX_KEYS) {
    void flushBadgeViews()
    return
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => void flushBadgeViews(), FLUSH_MS)
    flushTimer.unref?.()
  }
}

function today(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export type BadgeViewStats = Record<
  string,
  { total: number; domains: { domain: string; views: number }[] }
>

/** Per-domain badge impressions for the owner dashboard. */
export async function badgeViewStats(businessIds: string[], days = 30): Promise<BadgeViewStats> {
  if (businessIds.length === 0) return {}

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const grouped = await db.badgeView.groupBy({
    by: ['businessId', 'domain'],
    where: { businessId: { in: businessIds }, day: { gte: since } },
    _sum: { views: true },
  })

  const stats: BadgeViewStats = {}
  for (const g of grouped) {
    const entry = (stats[g.businessId] ??= { total: 0, domains: [] })
    const views = g._sum.views ?? 0
    entry.total += views
    entry.domains.push({ domain: g.domain, views })
  }
  for (const entry of Object.values(stats)) {
    entry.domains.sort((a, z) => z.views - a.views)
    entry.domains = entry.domains.slice(0, 6)
  }
  return stats
}

export async function flushBadgeViews() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pending.size === 0) return

  const batch = [...pending.entries()]
  pending.clear()
  const day = today()

  try {
    await db.$transaction(
      batch.map(([key, views]) => {
        const sep = key.indexOf('|')
        const businessId = key.slice(0, sep)
        const domain = key.slice(sep + 1)
        return db.badgeView.upsert({
          where: { businessId_domain_day: { businessId, domain, day } },
          create: { businessId, domain, day, views },
          update: { views: { increment: views } },
        })
      }),
    )
  } catch {
    // counters are best-effort telemetry — a failed flush must never break a render
  }
}
