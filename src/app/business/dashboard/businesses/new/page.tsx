import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/business'
import { BusinessRegisterForm } from '@/components/business-register-form'

export const metadata: Metadata = { title: 'Add a business' }
export const dynamic = 'force-dynamic'

export default async function AddBusinessPage() {
  await requireUser('/business/dashboard/businesses/new')

  const parents = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sort: 'asc' },
    select: {
      id: true,
      name: true,
      children: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
    },
  })
  const groups = parents.filter((p) => p.children.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add a business</h1>
        <p className="mt-1 text-sm text-muted">
          It goes live immediately with an <strong>Unverified</strong> badge until verification.
        </p>
      </div>

      <div className="rounded-2xl border bg-surface p-6 sm:p-8">
        <BusinessRegisterForm groups={groups} />
      </div>
    </div>
  )
}
