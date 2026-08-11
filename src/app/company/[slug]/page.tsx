import type { ComponentType } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Prisma } from '@prisma/client'
import {
  Globe,
  Mail,
  MapPin,
  Phone,
  BadgeCheck,
  CalendarDays,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft,
  Award,
  Pencil,
} from 'lucide-react'
import { db } from '@/lib/db'
import { tierFor } from '@/lib/badge'
import { auth } from '@/lib/auth'
import { Stars } from '@/components/stars'
import { ReviewDialog } from '@/components/review-dialog'
import { PhotoLightbox } from '@/components/photo-lightbox'
import { ShareButton } from '@/components/share-button'
import { HelpfulButton } from '@/components/helpful-button'
import { ReviewControls } from '@/components/review-controls'
import { AskForReview } from '@/components/ask-for-review'
import { askTargets } from '@/lib/review-link'
import { ReviewBody } from '@/components/review-body'
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from '@/components/brand-icons'
import { publishOverdueReviews } from '@/lib/review-sla'
import { SITE_NAME } from '@/lib/seo'
import { colorFrom, initials, formatDate, externalUrl } from '@/lib/utils'

const PAGE_SIZE = 10

type SortKey = 'recent' | 'helpful' | 'highest' | 'lowest'
const SORT_KEYS: SortKey[] = ['recent', 'helpful', 'highest', 'lowest']

function orderFor(sort: SortKey): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case 'helpful':
      return [{ helpfulCount: 'desc' }, { createdAt: 'desc' }]
    case 'highest':
      return [{ rating: 'desc' }, { createdAt: 'desc' }]
    case 'lowest':
      return [{ rating: 'asc' }, { createdAt: 'desc' }]
    default:
      return [{ createdAt: 'desc' }]
  }
}

async function getBusiness(slug: string) {
  const where = { slug, status: 'LIVE' as const }
  const include = {
    category: { select: { name: true, slug: true } },
    extraCategories: { orderBy: { name: 'asc' as const }, select: { name: true, slug: true } },
  }

  const b = await db.business.findFirst({ where, include })
  if (!b) return null

  // An owner who ignores a review does not get to bury it: anything past the
  // approval deadline publishes itself here, and the denormalised rating
  // columns are re-read only when that actually moved something.
  return (await publishOverdueReviews(b.id)) ? db.business.findFirst({ where, include }) : b
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rating?: string; sort?: string; page?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const b = await db.business.findFirst({
    where: { slug, status: 'LIVE' },
    include: { category: { select: { name: true } } },
  })
  if (!b) return { title: 'Business not found', robots: { index: false, follow: false } }

  const avg = Number(b.ratingAvg)
  // What people actually type is "best <trade> in <city>", so the title leads
  // with that and names the business last. The category is what the listing is
  // filed under; a row somehow left without one keeps the plain name.
  const title = b.category
    ? `Best ${b.category.name} in ${b.city}, ${b.state} - ${b.name}`
    : `${b.name} Reviews`
  // Same shape as the title — trade, then place, then the business — with the
  // rating only when there is one. A listing nobody has reviewed yet was
  // advertising "0.0★ from 0 reviews", which reads as a bad business rather
  // than a new one, and that is the line Google prints under the link.
  const trade = b.category ? `${b.category.name} in ${b.city}, ${b.state}` : `${b.city}, ${b.state}`
  const description =
    b.ratingCount > 0
      ? `${b.name} — ${trade}. Rated ${avg.toFixed(1)}★ from ${b.ratingCount} customer ${b.ratingCount === 1 ? 'review' : 'reviews'}. Read honest reviews, ratings and contact details on TrustIndex India.`
      : `${b.name} — ${trade}. Contact details, timings and customer ratings on TrustIndex India. Be the first to review it.`

  // Every paged, sorted or star-filtered view is the same business with its
  // reviews rearranged. One canonical copy gets indexed and the rest are
  // followed for their links only — the same rule the category pages apply.
  const filteredView = Boolean(sp.rating || sp.page || (sp.sort && sp.sort !== 'recent'))

  return {
    // absolute, so the root layout's "· TrustIndex India" is not appended: the
    // title already carries the trade, the city and the business, and Google
    // cuts it off around sixty characters — the site name is what it would eat.
    title: { absolute: title },
    description,
    alternates: { canonical: `/company/${b.slug}` },
    robots: filteredView ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: `/company/${b.slug}`,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rating?: string; sort?: string; page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const b = await getBusiness(slug)
  if (!b) notFound()

  const session = await auth()
  const avg = Number(b.ratingAvg)
  const hist = [b.rating5, b.rating4, b.rating3, b.rating2, b.rating1]

  const fr = sp.rating ? Number(sp.rating) : 0
  const sort: SortKey = SORT_KEYS.includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : 'recent'

  const filteredTotal = fr ? hist[5 - fr] : b.ratingCount
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(sp.page) || 1), totalPages)

  // paged + sorted reviews (query-driven, never loads the whole table)
  const reviews = await db.review.findMany({
    where: { businessId: b.id, status: 'LIVE', ...(fr ? { rating: fr } : {}) },
    orderBy: orderFor(sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      user: { select: { name: true, email: true, emailVerified: true } },
      reply: true,
      images: true,
    },
  })

  // photo strip — pulled straight from review images, independent of paging
  const photoRows = await db.reviewImage.findMany({
    where: { review: { businessId: b.id, status: 'LIVE' } },
    orderBy: { id: 'desc' },
    take: 12,
    select: { id: true, path: true },
  })

  // which of the visible reviews the current user has marked helpful
  const myVotes = session?.user
    ? new Set(
        (
          await db.reviewVote.findMany({
            where: { userId: session.user.id, reviewId: { in: reviews.map((r) => r.id) } },
            select: { reviewId: true },
          })
        ).map((v) => v.reviewId),
      )
    : new Set<string>()

  const myReview = session?.user
    ? await db.review.findUnique({
        where: { businessId_userId: { businessId: b.id, userId: session.user.id } },
        select: { rating: true, title: true, body: true, status: true },
      })
    : null

  const isOwner = session?.user?.id === b.ownerId
  const isAdmin = session?.user?.role === 'ADMIN'
  const canManage = isOwner || isAdmin

  // Whoever can manage this listing gets the two things they came back for —
  // the edit form and the invite kit — without a detour through a dashboard.
  // An admin edits through the admin form, which is the one that can touch
  // ownership and status.
  const editHref = isAdmin
    ? `/admin/businesses/${b.id}/edit`
    : `/business/dashboard/businesses/${b.id}/edit`
  const askTarget = canManage ? await askTargets([b]) : []

  // owners get nudged from their own profile page — a review nobody approves
  // is a review nobody reads
  const awaitingOwner = isOwner
    ? await db.review.count({ where: { businessId: b.id, status: 'PENDING' } })
    : 0

  // badge tier — only worth showing on the profile once it clears Silver
  const tier = tierFor(b.ratingCount, avg)
  const showTier = tier.key !== 'rated'

  // one pill, rendered beside the logo on a phone and beside the name on a
  // desktop — written once so the two placements cannot drift apart
  const verifiedPill = b.verifiedAt ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
      <BadgeCheck size={13} /> Verified
    </span>
  ) : (
    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">Unverified</span>
  )

  // derive social / contact links from free-form fields
  const waDigits = b.whatsapp?.replace(/\D/g, '')
  const siteHref = externalUrl(b.website)
  const mapHref = externalUrl(b.mapUrl)
  // tel: chokes on spaces and brackets, so keep digits and a leading +
  const telDigits = b.phone?.replace(/[^\d+]/g, '')
  const mailAddress = b.email?.trim()
  const igHref = b.instagram
    ? b.instagram.startsWith('http')
      ? b.instagram
      : `https://instagram.com/${b.instagram.replace(/^@/, '')}`
    : null
  const fbHref = b.facebook
    ? b.facebook.startsWith('http')
      ? b.facebook
      : `https://facebook.com/${b.facebook}`
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: b.name,
    image: b.logo ?? b.cover ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: b.city,
      addressRegion: b.state,
      postalCode: b.pincode ?? undefined,
      addressCountry: 'IN',
    },
    telephone: b.phone,
    email: mailAddress || undefined,
    url: siteHref ?? undefined,
    hasMap: mapHref ?? undefined,
    ...([igHref, fbHref].some(Boolean) && { sameAs: [igHref, fbHref].filter(Boolean) }),
    ...(b.ratingCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avg.toFixed(1),
        reviewCount: b.ratingCount,
        bestRating: 5,
      },
    }),
    ...(reviews.length > 0 && {
      review: reviews.slice(0, 10).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.user.name ?? 'Anonymous' },
        datePublished: r.createdAt.toISOString(),
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        name: r.title,
        reviewBody: r.body,
      })),
    }),
  }

  type Contact = {
    href: string
    icon: ComponentType<{ size?: number }>
    label: string
    /** tel: and mailto: hand off to the device, so they stay in this tab */
    external?: boolean
  }

  const contacts = [
    telDigits && { href: `tel:${telDigits}`, icon: Phone, label: 'Call' },
    waDigits && { href: `https://wa.me/${waDigits}`, icon: WhatsAppIcon, label: 'WhatsApp', external: true },
    mapHref && { href: mapHref, icon: MapIcon, label: 'Directions', external: true },
    siteHref && { href: siteHref, icon: Globe, label: 'Website', external: true },
    mailAddress && { href: `mailto:${mailAddress}`, icon: Mail, label: 'Email' },
    igHref && { href: igHref, icon: InstagramIcon, label: 'Instagram', external: true },
    fbHref && { href: fbHref, icon: FacebookIcon, label: 'Facebook', external: true },
  ].filter(Boolean) as Contact[]

  // build a paging href that preserves the active filter + sort
  const pageHref = (p: number) => {
    const q = new URLSearchParams()
    if (fr) q.set('rating', String(fr))
    if (sort !== 'recent') q.set('sort', sort)
    if (p > 1) q.set('page', String(p))
    const qs = q.toString()
    return `/company/${b.slug}${qs ? `?${qs}` : ''}#reviews`
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Manage bar — only for the owner and for staff. It sits where the
          breadcrumb used to, above the fold, because an owner who lands here
          from an invite link is here to fix a detail or send another card, and
          the dashboard is two navigations away. */}
      {canManage && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand/20 bg-mint px-4 py-3">
          <span className="mr-auto text-xs font-medium text-brand-strong">
            {isOwner ? 'You manage this listing.' : 'Admin view.'}
          </span>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
          >
            <Pencil size={15} /> Edit business
          </Link>
          {askTarget.length > 0 && <AskForReview businesses={askTarget} />}
        </div>
      )}

      {/* header card */}
      <div className="overflow-hidden rounded-2xl border bg-surface shadow-soft">
        {/* cover */}
        {b.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.cover} alt="" loading="lazy" decoding="async" className="h-40 w-full object-cover sm:h-56" />
        ) : (
          <div className="h-24 w-full hero-wash sm:h-28" />
        )}

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end">
          {/* On a phone the status rides beside the logo — it is the first thing
              worth knowing, and down beside the name it cost a whole line.
              `sm:contents` dissolves this wrapper on desktop, where the logo is
              a flex child of the row itself. */}
          <div className="flex items-center gap-3 sm:contents">
            {b.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logo}
                alt={`${b.name} logo`}
                className="-mt-16 h-24 w-24 shrink-0 rounded-2xl border-4 border-surface bg-surface object-cover shadow-soft"
              />
            ) : (
              <span
                className="-mt-16 grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-4 border-surface text-2xl font-bold text-white shadow-soft"
                style={{ background: colorFrom(b.slug) }}
              >
                {initials(b.name)}
              </span>
            )}
            <span className="sm:hidden">{verifiedPill}</span>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{b.name}</h1>
              <span className="max-sm:hidden">{verifiedPill}</span>
              {showTier && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${tier.from}, ${tier.to})` }}
                  title={`${tier.label} tier · ${b.ratingCount} reviews`}
                >
                  <Award size={12} /> {tier.label}
                </span>
              )}
            </div>
            {b.tagline && <p className="mt-1 text-sm text-foreground/80">{b.tagline}</p>}

            {/* Every trade this business is filed under, primary first. Two
                even columns on a phone: ragged pill widths read as noise on a
                narrow screen, a grid reads as a list. */}
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
              {[b.category, ...b.extraCategories].map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="truncate rounded-full border bg-surface px-2.5 py-1 text-center text-xs font-medium text-muted transition hover:border-brand hover:text-brand sm:py-0.5"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <address className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm not-italic text-muted">
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {b.city}, {b.state}
              </span>
              {b.foundedYear && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} /> Est. {b.foundedYear}
                </span>
              )}
              <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:text-brand">
                <Phone size={14} /> {b.phone}
              </a>
            </address>
          </div>

          {/* score box — tinted with the business's earned badge tier */}
          <div
            className="shrink-0 overflow-hidden rounded-xl border text-center max-sm:w-full"
            style={{ background: `${tier.solid}14`, borderColor: `${tier.solid}40` }}
          >
            <div
              className="h-1.5 w-full"
              style={{ background: `linear-gradient(135deg, ${tier.from}, ${tier.to})` }}
            />
            <div className="px-5 py-3">
              <div className="text-4xl font-bold leading-none" style={{ color: tier.solid }}>
                {avg.toFixed(1)}
              </div>
              <div className="mt-1.5 flex justify-center">
                <Stars value={avg} size="md" />
              </div>
              <div className="mt-1 text-xs text-muted">{b.ratingCount} reviews</div>
            </div>
          </div>
        </div>

        {/* Contact / social chips + share. Two even columns on a phone — these
            are the buttons people came to press, and a ragged wrap leaves half
            of them at odd widths and easy to mis-tap. */}
        <div className="grid grid-cols-2 gap-2 border-t bg-background/40 px-6 py-4 sm:flex sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              {...(c.external && { target: '_blank', rel: 'noopener noreferrer nofollow' })}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border bg-surface px-3 py-2 text-sm text-foreground/80 transition hover:border-brand hover:bg-brand hover:text-white sm:justify-start sm:py-1.5"
            >
              <c.icon size={15} /> {c.label}
            </a>
          ))}
          <ShareButton title={`${b.name} reviews`} />
        </div>
      </div>

      {b.description && (
        <p className="mt-6 hyphens-auto rounded-2xl border bg-surface p-6 text-justify text-sm leading-relaxed text-foreground/90 shadow-soft">
          {b.description}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Reviews column. `min-w-0` because a grid item defaults to
            min-width:auto, so the swipeable review track would stretch the
            whole page instead of scrolling inside itself. */}
        <div className="order-2 min-w-0 lg:order-1">
          <h2 id="reviews" className="mb-4 scroll-mt-20 text-xl font-bold">
            Reviews {b.ratingCount > 0 && <span className="text-muted">({b.ratingCount})</span>}
          </h2>

          {/* UGC photo gallery */}
          {photoRows.length > 0 && (
            <div className="mb-5 rounded-xl border bg-surface p-4 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold">Photos from reviews</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <PhotoLightbox
                  images={photoRows.map((img) => ({
                    id: img.id,
                    path: img.path,
                    alt: `Photo from a review of ${b.name}`,
                  }))}
                  thumbClass="h-24 w-24 border"
                />
              </div>
            </div>
          )}

          {/* rating filter + sort */}
          {b.ratingCount > 0 && (
            <ReviewControls slug={b.slug} rating={fr} sort={sort} counts={hist} />
          )}

          {reviews.length === 0 ? (
            <div className="rounded-xl border bg-surface p-6 text-center shadow-soft">
              <p className="text-muted">
                {fr ? `No ${fr}★ reviews yet.` : `No reviews yet. Be the first to review ${b.name}.`}
              </p>
              {!isOwner && (
                <ReviewDialog
                  businessId={b.id}
                  businessName={b.name}
                  slug={b.slug}
                  signedIn={!!session?.user}
                  existing={myReview}
                />
              )}
            </div>
          ) : (
            /* A phone swipes through the reviews instead of scrolling past a
               dozen full-height cards to reach the rest of the page; snap
               points stop it landing between two. Desktop keeps the stack. */
            <div className="max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:overflow-x-auto max-sm:pb-2 sm:space-y-4">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-xl border bg-surface p-5 shadow-soft transition hover:shadow-float max-sm:w-[88%] max-sm:shrink-0 max-sm:snap-start">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
                        style={{ background: colorFrom(r.user.email ?? r.id) }}
                      >
                        {initials(r.user.name ?? r.user.email)}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 font-medium">
                          {r.user.name ?? 'Anonymous'}
                          {r.user.emailVerified && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-normal text-brand" title="Verified reviewer">
                              <BadgeCheck size={13} />
                            </span>
                          )}
                        </div>
                        <time dateTime={r.createdAt.toISOString()} className="text-xs text-muted">
                          {formatDate(r.createdAt)}
                        </time>
                      </div>
                    </div>
                    <Stars value={r.rating} size="sm" />
                  </div>
                  <h3 className="mt-2 font-semibold">{r.title}</h3>
                  <ReviewBody text={r.body} />

                  {r.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PhotoLightbox
                        images={r.images.map((img) => ({
                          id: img.id,
                          path: img.path,
                          alt: `Photo from ${r.user.name ?? 'a'} review`,
                        }))}
                        thumbClass="h-20 w-20 border"
                      />
                    </div>
                  )}

                  {r.reply && (
                    <div className="mt-4 rounded-lg border-l-2 border-brand bg-background p-4">
                      <div className="text-xs font-semibold text-brand">
                        Reply from {b.name}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">
                        {r.reply.body}
                      </p>
                    </div>
                  )}

                  {!isOwner && (
                    <div className="mt-4 border-t pt-3">
                      <HelpfulButton
                        reviewId={r.id}
                        initialCount={r.helpfulCount}
                        initialVoted={myVotes.has(r.id)}
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* pagination */}
          {totalPages > 1 && (
            <nav aria-label="Reviews pagination" className="mt-6 flex items-center justify-center gap-3 text-sm">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border bg-surface px-3 py-2 transition hover:border-brand hover:text-brand"
                >
                  <ChevronLeft size={16} /> Prev
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-muted opacity-50">
                  <ChevronLeft size={16} /> Prev
                </span>
              )}
              <span className="text-muted">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border bg-surface px-3 py-2 transition hover:border-brand hover:text-brand"
                >
                  Next <ChevronRight size={16} />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-muted opacity-50">
                  Next <ChevronRight size={16} />
                </span>
              )}
            </nav>
          )}
        </div>

        {/* write review column */}
        <aside id="write-review" className="order-1 scroll-mt-20 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          {/* histogram */}
          <div className="mb-6 rounded-xl border bg-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Rating breakdown</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold" style={{ color: tier.solid }}>
                  {avg.toFixed(1)}
                </span>
                <Stars value={avg} size="sm" />
              </div>
            </div>
            {[5, 4, 3, 2, 1].map((star, i) => {
              const n = hist[i]
              const pct = b.ratingCount ? (n / b.ratingCount) * 100 : 0
              return (
                <div key={star} className="mb-1.5 flex items-center gap-2 text-xs">
                  <span className="flex w-7 items-center gap-0.5 font-medium text-foreground/70">{star}★</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-star" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted">{n}</span>
                </div>
              )
            })}
          </div>

          {isOwner ? (
            <div className="rounded-xl border bg-surface p-6 text-sm text-muted">
              This is your business. Manage replies from your{' '}
              <Link href="/business/dashboard" className="font-medium text-brand hover:underline">
                dashboard
              </Link>
              .
              {awaitingOwner > 0 && (
                <Link
                  href="/business/dashboard/reviews?s=pending"
                  className="mt-3 block rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  {awaitingOwner} {awaitingOwner === 1 ? 'review is' : 'reviews are'} waiting for
                  your approval →
                </Link>
              )}
            </div>
          ) : (
            <ReviewDialog
              variant="card"
              businessId={b.id}
              businessName={b.name}
              slug={b.slug}
              signedIn={!!session?.user}
              existing={myReview}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
