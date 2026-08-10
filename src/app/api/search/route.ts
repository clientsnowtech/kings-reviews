import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { listCities } from '@/lib/cities'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Typeahead feed for the navbar search box: /api/search?q=spice
 * Same matching rules as /search, just capped and trimmed to what a
 * dropdown row needs. Not cached — results move as businesses go live.
 *
 * Three things share the one box: a business, its category, and the place it
 * trades in. Cities come off the memoised roll-up rather than a DISTINCT per
 * keystroke.
 */
export const dynamic = 'force-dynamic'

const BIZ_LIMIT = 6
const CAT_LIMIT = 4
const CITY_LIMIT = 4
const MIN_CHARS = 2

function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim()
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80)

  if (q.length < MIN_CHARS) {
    return Response.json({ businesses: [], categories: [], cities: [] })
  }

  // a keystroke-driven endpoint is easy to hammer — brake per IP
  const limit = rateLimit(`search:${clientKey(req)}`, 60, 60_000)
  if (!limit.ok) {
    return Response.json(
      { businesses: [], categories: [], cities: [], error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const needle = q.toLowerCase()

  const [businesses, categories, allCities] = await Promise.all([
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
    listCities(),
  ])

  // a place that starts with what was typed is the one meant — "sur" is Surat
  // before it is Mirzapur, and the big cities break the tie after that
  const cities = allCities
    .filter((c) => c.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(needle) ? 0 : 1
      const bStarts = b.name.toLowerCase().startsWith(needle) ? 0 : 1
      return aStarts - bStarts || b.count - a.count
    })
    .slice(0, CITY_LIMIT)
    .map((c) => ({ name: c.name, slug: c.slug, count: c.count, state: c.states[0] ?? null }))

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
      cities,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
