import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { adminCreateBusiness } from '@/lib/admin-actions'
import { SubmitButton } from '@/components/submit-button'
import { CategoryPicker } from '@/components/category-picker'
import { LocationPicker } from '@/components/location-picker'

export const dynamic = 'force-dynamic'

export default async function AdminNewBusiness() {
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

      <h2 className="text-xl font-bold">Add business</h2>

      <form action={adminCreateBusiness} className="space-y-4 rounded-2xl border bg-surface p-6">
        <div>
          <label className={label}>Name</label>
          <input name="name" required minLength={2} className={field} />
        </div>

        <CategoryPicker groups={groups} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Website</label>
            <input name="website" className={field} placeholder="https://…" />
          </div>
          <div>
            <label className={label}>Email</label>
            <input name="email" type="email" required className={field} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input name="phone" required className={field} />
          </div>
        </div>

        <LocationPicker />

        <div>
          <label className={label}>Description</label>
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Owner email</label>
            <input
              name="ownerEmail"
              type="email"
              className={field}
              placeholder="Leave blank to own it yourself"
            />
            <p className="mt-1 text-xs text-muted">
              An unknown email gets an account with no password — its owner claims the listing by
              signing in with Google.
            </p>
          </div>
          <div>
            <label className={label}>Status</label>
            <select name="status" defaultValue="LIVE" className={field}>
              <option value="LIVE">Live</option>
              <option value="PENDING">Pending</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              Listing it is not verifying it — verification stays its own queue.
            </p>
          </div>
        </div>

        <SubmitButton
          pendingLabel="Creating…"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Create business
        </SubmitButton>
      </form>
    </div>
  )
}
