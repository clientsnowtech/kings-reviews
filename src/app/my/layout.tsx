import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { initials, colorFrom } from '@/lib/utils'
import { AccountTabs } from '@/components/account-tabs'

export const metadata: Metadata = { title: 'My account · Kings Reviews' }
export const dynamic = 'force-dynamic'

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/my/profile')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  })
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatars are local uploads
          <img src={user.image} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span
            className="grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white"
            style={{ background: colorFrom(user.email) }}
          >
            {initials(user.name ?? user.email)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold leading-tight">{user.name ?? 'My account'}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-6">
        <AccountTabs />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  )
}
