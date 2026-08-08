import { db } from '@/lib/db'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

/**
 * Short review link — what the printed QR actually carries.
 *
 * `/company/<slug>?review=ask` is long, and every character it costs turns into
 * more modules in the code: a denser grid needs a bigger print or a closer
 * phone. `/r/<slug>` keeps the symbol coarse enough to scan off a receipt, and
 * it is short enough that someone can type it by hand.
 *
 * The redirect is also the only moment a printed card is measurable, so the
 * scan is counted here. It counts requests, not people — a link preview or a
 * second look inflates it — so it reads as interest, not as visitors.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  // stay on the host the scan arrived at — a printed code tested on localhost
  // or a staging domain must not bounce the reader to production
  const base = URL.canParse(req.url) ? new URL(req.url).origin : APP_URL

  const business = await db.business.findUnique({ where: { slug }, select: { id: true } })
  if (!business) return Response.redirect(new URL('/', base), 302)

  try {
    await db.business.update({ where: { id: business.id }, data: { qrScans: { increment: 1 } } })
  } catch (err) {
    // counting is never worth a broken scan, but a counter that quietly stops
    // reads as "nobody scanned it" — which is the one wrong answer here
    console.error('[qr scan not counted]', slug, err)
  }

  return Response.redirect(new URL(`/company/${slug}?review=ask&src=qr`, base), 302)
}
