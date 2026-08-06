import { auth } from '@/lib/auth'

// Sends a user to the right home after the public login, based on their role.
// (Admins use the dedicated /admin/login flow instead.)
export async function GET() {
  const session = await auth()
  const role = session?.user?.role

  const dest =
    role === 'ADMIN'
      ? '/admin'
      : role === 'BUSINESS'
        ? '/business/dashboard'
        : '/'

  // A relative Location keeps the browser on the host it is already on. Behind
  // Passenger the incoming request URL reads as http://localhost:3000, so an
  // absolute URL built from it sends users to a dead address.
  return new Response(null, { status: 307, headers: { Location: dest } })
}
