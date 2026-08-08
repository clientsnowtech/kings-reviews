import { db } from '@/lib/db'

/** A relative Location keeps the reader on whatever host they scanned into. */
function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to } })
}

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
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params

  const business = await db.business.findUnique({ where: { slug }, select: { id: true } })
  if (!business) return redirect('/')

  try {
    await db.business.update({ where: { id: business.id }, data: { qrScans: { increment: 1 } } })
  } catch (err) {
    // counting is never worth a broken scan, but a counter that quietly stops
    // reads as "nobody scanned it" — which is the one wrong answer here
    console.error('[qr scan not counted]', slug, err)
  }

  return redirect(`/company/${slug}?review=ask&src=qr`)
}
