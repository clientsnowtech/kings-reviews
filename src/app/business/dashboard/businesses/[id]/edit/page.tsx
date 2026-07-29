import Link from 'next/link'
import { ArrowLeft, BadgeCheck, ShieldQuestion, Clock3 } from 'lucide-react'
import { db } from '@/lib/db'
import { requireOwnedBusiness } from '@/lib/business'
import { BusinessEditForm } from '@/components/business-edit-form'
import { BusinessHoursForm } from '@/components/business-hours-form'
import { BusinessGallery } from '@/components/business-gallery'
import { requestVerification } from '@/lib/business-actions'

export const dynamic = 'force-dynamic'

// Weighted checklist that drives the profile-completeness meter.
function completeness(b: {
  logo: string | null
  cover: string | null
  description: string | null
  website: string | null
  address: string | null
  pincode: string | null
  hours: number
  images: number
}) {
  const checks = [
    { ok: !!b.logo, label: 'Add a logo' },
    { ok: !!b.cover, label: 'Add a cover image' },
    { ok: !!b.description && b.description.length >= 40, label: 'Write a description (40+ chars)' },
    { ok: !!b.website, label: 'Add a website' },
    { ok: !!b.address, label: 'Add a street address' },
    { ok: !!b.pincode, label: 'Add a pincode' },
    { ok: b.hours > 0, label: 'Set business hours' },
    { ok: b.images >= 3, label: 'Upload at least 3 photos' },
  ]
  const done = checks.filter((c) => c.ok).length
  return { pct: Math.round((done / checks.length) * 100), checks }
}

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { business } = await requireOwnedBusiness(id)

  const [parents, hours, images] = await Promise.all([
    db.category.findMany({
      where: { parentId: null },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        children: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
      },
    }),
    db.businessHour.findMany({ where: { businessId: id }, orderBy: { day: 'asc' } }),
    db.businessImage.findMany({ where: { businessId: id }, orderBy: { sort: 'asc' } }),
  ])
  const groups = parents.filter((p) => p.children.length > 0)

  const meter = completeness({
    logo: business.logo,
    cover: business.cover,
    description: business.description,
    website: business.website,
    address: business.address,
    pincode: business.pincode,
    hours: hours.length,
    images: images.length,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/business/dashboard/businesses"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to businesses
      </Link>

      <div>
        <h2 className="text-xl font-bold">{business.name}</h2>
        <p className="text-sm text-muted">Edit listing details. Business name is fixed after listing.</p>
      </div>

      {/* completeness meter */}
      <div className="rounded-2xl border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Profile completeness</h3>
          <span className="text-sm font-bold text-brand">{meter.pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/60">
          <div className="h-full rounded-full bg-brand" style={{ width: `${meter.pct}%` }} />
        </div>
        {meter.pct < 100 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {meter.checks.filter((c) => !c.ok).map((c) => (
              <li key={c.label}>• {c.label}</li>
            ))}
          </ul>
        )}
      </div>

      {/* verification */}
      <div className="rounded-2xl border bg-surface p-6">
        {business.verifiedAt ? (
          <p className="flex items-center gap-2 font-medium text-brand">
            <BadgeCheck size={18} /> This business is verified.
          </p>
        ) : business.verifyRequestedAt ? (
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <Clock3 size={17} /> Verification requested — an admin will review it soon.
          </p>
        ) : (
          <form action={requestVerification} className="flex flex-wrap items-center justify-between gap-3">
            <input type="hidden" name="businessId" value={business.id} />
            <p className="flex items-center gap-2 text-sm">
              <ShieldQuestion size={17} className="text-muted" />
              Get a verified badge to build customer trust.
            </p>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Request verification
            </button>
          </form>
        )}
      </div>

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
        groups={groups}
      />

      <BusinessHoursForm businessId={business.id} hours={hours} />

      <BusinessGallery businessId={business.id} images={images} />
    </div>
  )
}
