import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { adminUpdateBusiness } from '@/lib/admin-actions'
import { SubmitButton } from '@/components/submit-button'
import { CategoryPicker } from '@/components/category-picker'
import { LocationPicker } from '@/components/location-picker'

export const dynamic = 'force-dynamic'

export default async function AdminEditBusiness({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [business, categories] = await Promise.all([
    db.business.findUnique({
      where: { id },
      include: { extraCategories: { select: { id: true } } },
    }),
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])
  if (!business) notFound()

  const field = 'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand'
  const label = 'mb-1 block text-sm font-medium'

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to businesses
      </Link>

      <h2 className="text-xl font-bold">Edit business</h2>

      <form action={adminUpdateBusiness} className="space-y-4 rounded-2xl border bg-surface p-6">
        <input type="hidden" name="id" value={business.id} />

        <div>
          <label className={label}>Name</label>
          <input name="name" defaultValue={business.name} required className={field} />
        </div>

        <CategoryPicker
          categories={categories}
          defaultCategoryId={business.categoryId}
          defaultExtraIds={business.extraCategories.map((c) => c.id)}
          extraName="extraCategoryIds"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Website</label>
            <input name="website" defaultValue={business.website ?? ''} className={field} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input name="email" type="email" defaultValue={business.email} required className={field} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input name="phone" defaultValue={business.phone} className={field} />
          </div>
        </div>

        <LocationPicker defaultState={business.state} defaultCity={business.city} />

        <div>
          <label className={label}>Description</label>
          <textarea
            name="description"
            defaultValue={business.description ?? ''}
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <SubmitButton
          pendingLabel="Saving…"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Save changes
        </SubmitButton>
      </form>
    </div>
  )
}
