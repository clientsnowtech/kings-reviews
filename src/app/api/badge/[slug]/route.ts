import type { NextRequest } from 'next/server'
import {
  CREDIT_NAME,
  CREDIT_URL,
  notFoundSvg,
  parseTheme,
  parseVariant,
  renderBadgeSvg,
} from '@/lib/badge'
import {
  allowBadgeRequest,
  clientKey,
  getBadgeBusiness,
  recordBadgeView,
} from '@/lib/badge-server'

/**
 * Public badge image:
 * /api/badge/<slug>?variant=card|square|seal|tile|strip|banner|micro&theme=light|dark
 * Embedded with a plain <img> on the business's own website, so it is
 * open to any origin and cached at the edge.
 */
export const dynamic = 'force-dynamic'

function svg(body: string, status: number, cache: string) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': cache,
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Powered-By': `${CREDIT_NAME} ${CREDIT_URL}`,
      Link: `<${CREDIT_URL}>; rel="author"`,
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = req.nextUrl.searchParams
  const variant = parseVariant(sp.get('variant'))
  const theme = parseTheme(sp.get('theme'))

  if (!allowBadgeRequest(clientKey(req))) {
    return svg(notFoundSvg(theme), 429, 'no-store')
  }

  const business = await getBadgeBusiness(slug)

  // an unverified or revoked badge answers exactly like an unknown one — no
  // signal to scrape, and the badge is only earned once verification lands
  if (!business || !business.badgeEnabled || !business.verified) {
    return svg(notFoundSvg(theme), 404, 'public, max-age=60')
  }

  recordBadgeView(business.id, req.headers.get('referer'))

  const body = renderBadgeSvg({
    name: business.name,
    ratingAvg: business.ratingAvg,
    ratingCount: business.ratingCount,
    verified: business.verified,
    variant,
    theme,
  })

  return svg(body, 200, 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400')
}
