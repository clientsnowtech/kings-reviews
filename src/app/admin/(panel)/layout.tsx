import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'
import { AdminSidebar } from '@/components/admin-sidebar'

export const metadata: Metadata = { title: 'Admin · TrustIndex' }
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAdmin()
  const [openReports, pendingBusinesses] = await Promise.all([
    db.reviewReport.count({ where: { status: 'OPEN' } }),
    // listings sitting in the approval queue, invisible to everyone until acted on
    db.business.count({ where: { status: 'PENDING' } }),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h1 className="text-lg font-bold leading-tight">Admin panel</h1>
          <p className="text-xs text-muted">{session.user.email}</p>
        </div>
        <Link
          href="/"
          className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted hover:bg-background hover:text-foreground"
        >
          ← Back to site
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* min-w-0: a grid item defaults to min-width:auto, so the sidebar's
            scrolling tab strip widens the whole grid past the viewport instead
            of scrolling inside itself. */}
        <aside className="min-w-0 md:sticky md:top-20 md:self-start">
          <AdminSidebar openReports={openReports} pendingBusinesses={pendingBusinesses} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
