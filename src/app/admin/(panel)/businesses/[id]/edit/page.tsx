import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { adminRenameBusiness } from '@/lib/admin-actions'
import { SubmitButton } from '@/components/submit-button'
import { BusinessEditForm } from '@/components/business-edit-form'
import { BusinessHoursForm } from '@/components/business-hours-form'
import { BusinessGallery } from '@/components/business-gallery'

export const dynamic = 'force-dynamic'

/**
 * Admin edit — the owner's own screens, not a copy of them.
 *
 * The panel used to carry a shorter form of its own, so an admin could not
 * touch hours, photos, the logo or half the profile fields, and every field
 * added for owners had to be added here again or quietly go missing. Now the
 * same components run in both places; only the name sits outside them, because
 * owners cannot rename a listing that already carries its reviews.
 */
export default async function AdminEditBusiness({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ duplicate?: string; slug?: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const { duplicate, slug: dupSlug } = await searchParams

  const [business, categories, hours, images, extras] = await Promise.all([
    db.business.findUnique({ where: { id }, include: { owner: { select: { email: true } } } }),
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.businessHour.findMany({ where: { businessId: id }, orderBy: { day: 'asc' } }),
    db.businessImage.findMany({ where: { businessId: id }, orderBy: { sort: 'asc' } }),
    db.category.findMany({ where: { extraFor: { some: { id } } }, select: { id: true } }),
  ])
  if (!business) notFound()

  const field =
    'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand'

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to businesses
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Edit business</h2>
          <p className="text-sm text-muted">
            Owned by {business.owner.email} · the owner sees these same forms.
          </p>
        </div>
        <Link
          href={`/company/${business.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted hover:bg-mint"
        >
          <ExternalLink size={14} /> Public page
        </Link>
      </div>

      {duplicate && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <p className="font-medium">Not renamed — this would duplicate another listing.</p>
          <p className="mt-1">{duplicate}</p>
          {dupSlug && (
            <Link
              href={`/company/${dupSlug}`}
              className="mt-2 inline-block font-medium underline underline-offset-2"
            >
              Open the other listing
            </Link>
          )}
        </div>
      )}

      {/* the one field owners never get */}
      <form action={adminRenameBusiness} className="rounded-2xl border bg-surface p-6">
        <input type="hidden" name="id" value={business.id} />
        <label className="mb-1 block text-sm font-medium">Name</label>
        <div className="flex gap-2">
          <input name="name" defaultValue={business.name} required minLength={2} className={field} />
          <SubmitButton
            pendingLabel="Saving…"
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
          >
            Rename
          </SubmitButton>
        </div>
        <p className="mt-1 text-xs text-muted">
          Owners cannot rename their own listing — its reviews belong to the business it was.
        </p>
      </form>

      <BusinessEditForm
        business={{
          id: business.id,
          categoryId: business.categoryId,
          email: business.email,
          phone: business.phone,
          whatsapp: business.whatsapp,
          website: business.website,
          tagline: business.tagline,
          description: business.description,
          foundedYear: business.foundedYear,
          instagram: business.instagram,
          facebook: business.facebook,
          address: business.address,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          mapUrl: business.mapUrl,
          logo: business.logo,
          cover: business.cover,
        }}
        categories={categories}
        extraCategoryIds={extras.map((c) => c.id)}
      />

      <BusinessHoursForm businessId={business.id} hours={hours} />

      <BusinessGallery businessId={business.id} images={images} />
    </div>
  )
}
