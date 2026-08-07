import type { ComponentType } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Prisma } from '@prisma/client'
import {
  Globe,
  MapPin,
  Phone,
  BadgeCheck,
  CalendarDays,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft,
  Award,
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
import { ReviewBody } from '@/components/review-body'
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from '@/components/brand-icons'
import { publishOverdueReviews } from '@/lib/review-sla'
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
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const b = await db.business.findFirst({ where: { slug, status: 'LIVE' } })
  if (!b) return { title: 'Business not found' }
  const avg = Number(b.ratingAvg)
  return {
    title: `${b.name} Reviews`,
    description: `${b.name} in ${b.city}, ${b.state} has ${avg.toFixed(1)}★ from ${b.ratingCount} reviews. Read reviews or write your own on TrustIndex.`,
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

  // owners get nudged from their own profile page — a review nobody approves
  // is a review nobody reads
  const awaitingOwner = isOwner
    ? await db.review.count({ where: { businessId: b.id, status: 'PENDING' } })
    : 0

  // badge tier — only worth showing on the profile once it clears Silver
  const tier = tierFor(b.ratingCount, avg)
  const showTier = tier.key !== 'rated'

  // derive social / contact links from free-form fields
  const waDigits = b.whatsapp?.replace(/\D/g, '')
  const siteHref = externalUrl(b.website)
  const mapHref = externalUrl(b.mapUrl)
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
    url: siteHref ?? undefined,
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
  }

  const contacts = [
    waDigits && { href: `https://wa.me/${waDigits}`, icon: WhatsAppIcon, label: 'WhatsApp' },
    siteHref && { href: siteHref, icon: Globe, label: 'Website' },
    igHref && { href: igHref, icon: InstagramIcon, label: 'Instagram' },
    fbHref && { href: fbHref, icon: FacebookIcon, label: 'Facebook' },
    mapHref && { href: mapHref, icon: MapIcon, label: 'Directions' },
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

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted">
        <Link href="/" className="hover:text-brand">Home</Link>
        <ChevronRight size={13} />
        <Link href={`/category/${b.category.slug}`} className="hover:text-brand">{b.category.name}</Link>
        <ChevronRight size={13} />
        <span className="text-foreground/70">{b.name}</span>
      </nav>

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

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{b.name}</h1>
              {b.verifiedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                  <BadgeCheck size={13} /> Verified
                </span>
              ) : (
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                  Unverified
                </span>
              )}
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

            {/* Every trade this business is filed under, primary first. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[b.category, ...b.extraCategories].map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="rounded-full border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted transition hover:border-brand hover:text-brand"
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

        {/* contact / social chips + share */}
        <div className="flex flex-wrap gap-2 border-t bg-background/40 px-6 py-4">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1.5 text-sm text-foreground/80 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              <c.icon size={15} /> {c.label}
            </a>
          ))}
          <ShareButton title={`${b.name} reviews`} />
        </div>
      </div>

      {b.description && (
        <p className="mt-6 rounded-2xl border bg-surface p-6 text-sm leading-relaxed text-foreground/90 shadow-soft">
          {b.description}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* reviews column */}
        <div className="order-2 lg:order-1">
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
            <div className="space-y-4">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-xl border bg-surface p-5 shadow-soft transition hover:shadow-float">
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
