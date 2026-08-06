import { NextResponse, type NextRequest } from 'next/server'

/**
 * Keeps signed-out visitors out of the admin panel before anything renders.
 *
 * `requireAdmin()` in the panel layout still decides who is actually an admin,
 * but Next renders layout and page concurrently: by the time that redirect
 * resolves, the page's RSC payload — dashboard markup, counts, the latest
 * business and review names — has already been flushed to the client. Stopping
 * the request here means there is nothing to flush.
 *
 * It only checks that a session cookie exists. Verifying it would mean crypto
 * (and a database read for the role) on every request; the real check stays
 * server-side, and this closes the anonymous case, which is the one that leaked
 * to the open internet.
 */
const SESSION_COOKIES = ['__Secure-authjs.session-token', 'authjs.session-token']

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin/login')) return NextResponse.next()
  if (SESSION_COOKIES.some((name) => req.cookies.has(name))) return NextResponse.next()

  // A relative Location: behind Passenger the request URL reads as
  // http://localhost:3000, so an absolute redirect points at a dead host.
  return new NextResponse(null, { status: 307, headers: { Location: '/admin/login' } })
}

export const config = {
  matcher: ['/admin/:path*'],
}
