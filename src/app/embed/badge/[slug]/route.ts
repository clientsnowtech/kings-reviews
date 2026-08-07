import type { NextRequest } from 'next/server'
import {
  allowBadgeRequest,
  clientKey,
  getBadgeBusiness,
  recordBadgeView,
} from '@/lib/badge-server'
import {
  CREDIT_NAME,
  CREDIT_URL,
  badgeAltText,
  notFoundSvg,
  parseTheme,
  parseVariant,
  renderBadgeSvg,
} from '@/lib/badge'

/**
 * Frameable badge:
 * /embed/badge/<slug>?variant=card|square|seal|tile|strip|banner|micro&theme=light|dark
 *
 * Same artwork as /api/badge, but wrapped in a clickable link back to the
 * profile. Served as a bare route handler because the root layout would
 * otherwise inject the site chrome into the iframe.
 */
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

function html(body: string, status: number, cache: string) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cache,
      // must stay embeddable on any customer domain
      'Content-Security-Policy': 'frame-ancestors *',
      'X-Powered-By': `${CREDIT_NAME} ${CREDIT_URL}`,
      Link: `<${CREDIT_URL}>; rel="author"`,
    },
  })
}

function page(inner: string, title: string) {
  return `<!doctype html>
<html lang="en">
<!-- badge by ${CREDIT_NAME} — ${CREDIT_URL} -->
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="author" content="${CREDIT_NAME}">
<link rel="author" href="${CREDIT_URL}">
<link rel="publisher" href="${CREDIT_URL}">
<style>
  html,body{margin:0;padding:0;background:transparent;overflow:hidden}
  a{display:inline-block;line-height:0;text-decoration:none;transition:transform .15s ease,filter .15s ease}
  a:hover{transform:translateY(-2px);filter:drop-shadow(0 6px 16px rgba(16,40,34,.16))}
  a:focus-visible{outline:2px solid #0e7a63;outline-offset:3px;border-radius:18px}
</style>
</head>
<body>${inner}</body>
</html>`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = req.nextUrl.searchParams
  const variant = parseVariant(sp.get('variant'))
  const theme = parseTheme(sp.get('theme'))

  if (!allowBadgeRequest(clientKey(req))) {
    return html(page(notFoundSvg(theme), 'Rate limited'), 429, 'no-store')
  }

  const business = await getBadgeBusiness(slug)

  // a revoked badge answers exactly like an unknown one — no signal to scrape
  if (!business || !business.badgeEnabled) {
    return html(page(notFoundSvg(theme), 'Not on TrustIndex'), 404, 'public, max-age=60')
  }

  recordBadgeView(business.id, req.headers.get('referer'))

  const data = {
    name: business.name,
    ratingAvg: business.ratingAvg,
    ratingCount: business.ratingCount,
    verified: business.verified,
  }
  const svg = renderBadgeSvg({ ...data, variant, theme })
  const alt = badgeAltText(data).replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const href = `${APP_URL}/company/${encodeURIComponent(slug)}?utm_source=badge&utm_medium=embed&utm_campaign=${variant}`

  const inner = `<a href="${href}" target="_blank" rel="noopener" title="${alt}">${svg}</a>`

  return html(page(inner, alt), 200, 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400')
}
