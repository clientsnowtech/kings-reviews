import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Circle,
  ShieldQuestion,
  Clock3,
} from 'lucide-react'
import { db } from '@/lib/db'
import { requireOwnedBusiness } from '@/lib/business'
import { BusinessEditForm } from '@/components/business-edit-form'
import { BusinessHoursForm } from '@/components/business-hours-form'
import { BusinessGallery } from '@/components/business-gallery'
import { requestVerification } from '@/lib/business-actions'
import { verificationReadiness } from '@/lib/verification'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { business } = await requireOwnedBusiness(id)

  const [categories, hours, images, extras] = await Promise.all([
    db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.businessHour.findMany({ where: { businessId: id }, orderBy: { day: 'asc' } }),
    db.businessImage.findMany({ where: { businessId: id }, orderBy: { sort: 'asc' } }),
    db.category.findMany({ where: { extraFor: { some: { id } } }, select: { id: true } }),
  ])
  const extraCategoryIds = extras.map((c) => c.id)

  // the same checklist the verification guard runs server-side
  const meter = verificationReadiness({
    logo: business.logo,
    cover: business.cover,
    description: business.description,
    website: business.website,
    address: business.address,
    pincode: business.pincode,
    mapUrl: business.mapUrl,
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
        <ul className="mt-3 space-y-1 text-sm">
          {meter.checks.map((c) => (
            <li key={c.key}>
              <a
                href={`#${c.anchor}`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-1.5 py-1 -mx-1.5 transition hover:bg-mint',
                  c.ok ? 'text-muted' : 'font-medium',
                )}
              >
                {c.ok ? (
                  <Check size={15} className="shrink-0 text-brand" />
                ) : (
                  <Circle size={15} className="shrink-0 text-muted" />
                )}
                <span className={c.ok ? 'line-through' : ''}>{c.label}</span>
                {!c.ok && <ArrowRight size={14} className="ml-auto shrink-0 text-brand" />}
              </a>
            </li>
          ))}
        </ul>
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
        ) : meter.ready ? (
          <form action={requestVerification} className="flex flex-wrap items-center justify-between gap-3">
            <input type="hidden" name="businessId" value={business.id} />
            <p className="flex items-center gap-2 text-sm">
              <ShieldQuestion size={17} className="text-muted" />
              Profile complete. Ask an admin to verify this business.
            </p>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Request verification
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm">
              <ShieldQuestion size={17} className="text-muted" />
              Finish the profile to unlock verification — and with it the website badge.
            </p>
            <p className="text-sm text-muted">
              {meter.missing.length} task{meter.missing.length === 1 ? '' : 's'} left:{' '}
              {meter.missing.map((c, i) => (
                <span key={c.key}>
                  {i > 0 && ', '}
                  <a href={`#${c.anchor}`} className="font-medium text-brand hover:underline">
                    {c.label.toLowerCase()}
                  </a>
                </span>
              ))}
              .
            </p>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border px-4 py-2 text-sm font-medium text-muted"
            >
              Request verification
            </button>
          </div>
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
          contactName: business.contactName,
          contactRole: business.contactRole,
          contactEmail: business.contactEmail,
          contactPhone: business.contactPhone,
        }}
        categories={categories}
        extraCategoryIds={extraCategoryIds}
      />

      <div id="hours" className="scroll-mt-24">
        <BusinessHoursForm businessId={business.id} hours={hours} />
      </div>

      <div id="photos" className="scroll-mt-24">
        <BusinessGallery businessId={business.id} images={images} />
      </div>
    </div>
  )
}
