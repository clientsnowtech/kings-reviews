import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { adminCreateBusiness } from '@/lib/admin-actions'
import { SubmitButton } from '@/components/submit-button'
import { CategoryPicker } from '@/components/category-picker'
import { LocationPicker } from '@/components/location-picker'

export const dynamic = 'force-dynamic'

export default async function AdminNewBusiness({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string; slug?: string }>
}) {
  const { duplicate, slug } = await searchParams
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

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

      {duplicate && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <p className="font-medium">Not added — this looks like a duplicate.</p>
          <p className="mt-1">{duplicate}</p>
          {slug && (
            <Link
              href={`/company/${slug}`}
              className="mt-2 inline-block font-medium underline underline-offset-2"
            >
              Open the existing listing
            </Link>
          )}
        </div>
      )}

      <form action={adminCreateBusiness} className="space-y-4 rounded-2xl border bg-surface p-6">
        <div>
          <label className={label}>Name</label>
          <input name="name" required minLength={2} className={field} />
        </div>

        <CategoryPicker categories={categories} extraName="extraCategoryIds" />

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
          <div>
            <label className={label}>WhatsApp</label>
            <input name="whatsapp" className={field} placeholder="+91 …" />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Google Maps link</label>
            <input name="mapUrl" className={field} placeholder="https://maps.app.goo.gl/…" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">
          Phone, WhatsApp, maps, website and email each become an action button on the public
          profile.
        </p>

        {/* the named human behind the listing — kept off the public page */}
        <fieldset className="rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">Contact person</legend>
          <p className="mb-3 text-xs text-muted">
            Who we deal with about this listing. Never shown on the public profile.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Full name</label>
              <input name="contactName" className={field} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label className={label}>Role</label>
              <input name="contactRole" className={field} placeholder="e.g. Owner, Manager" />
            </div>
            <div>
              <label className={label}>Email</label>
              <input name="contactEmail" type="email" className={field} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input name="contactPhone" className={field} placeholder="+91 …" />
            </div>
          </div>
        </fieldset>

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
              placeholder="Leave blank to use the business email"
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
