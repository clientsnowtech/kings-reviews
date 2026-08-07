import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { ProfileForm } from '@/components/profile-form'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

const ROLE_LABEL = {
  USER: 'Reviewer',
  BUSINESS: 'Business owner',
  ADMIN: 'Administrator',
} as const

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/my/profile')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
  })
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Personal details</h2>
        <p className="text-sm text-muted">This is what people see next to your reviews.</p>
      </div>

      <ProfileForm user={user} />

      <dl className="grid gap-4 rounded-xl border bg-surface p-6 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Account type</dt>
          <dd className="mt-0.5 font-medium">{ROLE_LABEL[user.role]}</dd>
        </div>
        <div>
          <dt className="text-muted">Member since</dt>
          <dd className="mt-0.5 font-medium">{formatDate(user.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="mt-0.5 font-medium">{user.emailVerified ? 'Verified' : 'Not verified'}</dd>
        </div>
      </dl>
    </div>
  )
}
