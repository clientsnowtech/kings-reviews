import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Sends a user to the right home after the public login, based on their role.
// (Admins use the dedicated /admin/login flow instead.)
export async function GET(req: Request) {
  const session = await auth()
  const role = session?.user?.role

  const dest =
    role === 'ADMIN'
      ? '/admin'
      : role === 'BUSINESS'
        ? '/business/dashboard'
        : '/'

  return NextResponse.redirect(new URL(dest, req.url))
}
