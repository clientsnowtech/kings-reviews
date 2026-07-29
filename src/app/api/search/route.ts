import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Typeahead feed for the navbar search box: /api/search?q=spice
 * Same matching rules as /search, just capped and trimmed to what a
 * dropdown row needs. Not cached — results move as businesses go live.
 */
export const dynamic = 'force-dynamic'

const BIZ_LIMIT = 6
const CAT_LIMIT = 4
const MIN_CHARS = 2

function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim()
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80)

  if (q.length < MIN_CHARS) {
    return Response.json({ businesses: [], categories: [] })
  }

  // a keystroke-driven endpoint is easy to hammer — brake per IP
  const limit = rateLimit(`search:${clientKey(req)}`, 60, 60_000)
  if (!limit.ok) {
    return Response.json(
      { businesses: [], categories: [], error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const [businesses, categories] = await Promise.all([
    db.business.findMany({
      where: {
        status: 'LIVE',
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { category: { name: { contains: q } } },
        ],
      },
      orderBy: [{ ratingCount: 'desc' }, { ratingAvg: 'desc' }],
      take: BIZ_LIMIT,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        logo: true,
        ratingAvg: true,
        ratingCount: true,
        category: { select: { name: true } },
      },
    }),
    db.category.findMany({
      where: { name: { contains: q } },
      orderBy: { sort: 'asc' },
      take: CAT_LIMIT,
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ])

  return Response.json(
    {
      // ratingAvg is a Prisma Decimal — serialise it as a number, not "4.5"
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        city: b.city,
        logo: b.logo,
        ratingAvg: Number(b.ratingAvg),
        ratingCount: b.ratingCount,
        category: b.category?.name ?? null,
      })),
      categories,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
