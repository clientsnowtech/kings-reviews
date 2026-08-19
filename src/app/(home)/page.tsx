import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, PencilLine, Building2, ShieldCheck, Star, MapPin, BadgeCheck, ArrowRight, Quote, MessageSquareText, Flag, TrendingUp } from 'lucide-react'
import { db } from '@/lib/db'
import { listCities } from '@/lib/cities'
import { BusinessCard } from '@/components/business-card'
import { CategoryIcon } from '@/components/category-icon'
import { NavSearch } from '@/components/nav-search'
import { Stars } from '@/components/stars'
import { colorFrom, initials, formatDate } from '@/lib/utils'

// The busiest page on the site, and none of what it shows is per-visitor —
// featured listings and the recent-review strip are the same for everyone. It
// was rebuilding from the database on every single request; five minutes of
// staleness is invisible here and takes the query off the hot path.
export const revalidate = 300

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Kings Reviews'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

const TITLE = 'Business Reviews & Ratings in India | Kings Reviews'
const DESCRIPTION =
  'Read honest customer reviews and ratings for Indian businesses — restaurants, hotels, shops and services. Compare, verify and write your own review free.'

export const metadata: Metadata = {
  // `absolute` opts out of the layout's "%s · Kings Reviews" template, which
  // would otherwise put the brand name in the title twice.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: APP_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

// Tells search engines the site name to display and wires up the sitelinks
// search box, pointed at the same /search route users get.
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: APP_NAME,
  url: APP_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${APP_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default async function Home() {
  // Only categories with something to show — the directory carries Google's
  // full ~4,000, nearly all of them empty. Same test the /categories page uses,
  // so its total and the one on the stats band agree.
  const live = { some: { status: 'LIVE' as const } }
  const listed = { OR: [{ businesses: live }, { extraFor: live }] }

  const [categories, topRated, recent, totalBiz, totalReviews, totalCategories, rating, cities] =
    await Promise.all([
      // busiest first
      db.category.findMany({
        where: listed,
        orderBy: [{ listingCount: 'desc' }, { name: 'asc' }],
        take: 8,
      }),
      db.business.findMany({
        where: { status: 'LIVE' },
        orderBy: [{ ratingCount: 'desc' }, { ratingAvg: 'desc' }],
        take: 6,
        include: { category: { select: { name: true, slug: true } } },
      }),
      db.review.findMany({
        where: { status: 'LIVE' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          user: { select: { name: true, email: true } },
          business: { select: { name: true, slug: true, logo: true } },
        },
      }),
      db.business.count({ where: { status: 'LIVE' } }),
      db.review.count({ where: { status: 'LIVE' } }),
      // the whole shelf, not the eight tiles below it
      db.category.count({ where: listed }),
      // the headline rating, averaged over the reviews that are actually public
      db.review.aggregate({ where: { status: 'LIVE' }, _avg: { rating: true } }),
      // Popular means busiest, not first in the alphabet. A distinct-by-city
      // read ordered by name put Aamdi and Abohar on the front page and left
      // off every city anyone actually searches for. listCities counts live
      // listings per city and is memoised, so this costs nothing per load.
      listCities(),
    ])

  // A directory with no reviews yet has no average to show — printing 0.0 out
  // of 5 reads as a terrible score rather than as an empty shelf.
  const avgRating = rating._avg.rating ?? 0
  const avgLabel = totalReviews > 0 ? avgRating.toFixed(1) : '—'

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* ============ HERO ============ */}
      <section className="hero-wash border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white/70 px-3 py-1 text-xs font-semibold text-brand shadow-soft">
              <ShieldCheck size={14} /> India’s trusted review directory
            </span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Real reviews. Real <span className="text-brand">trust.</span>
              <br />
              Real growth.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Discover businesses across India through honest customer reviews — and share your own.
            </p>

            {/* same typeahead as the navbar — a company, a trade or a town */}
            <NavSearch size="lg" className="mt-8 w-full max-w-xl" />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {totalReviews > 0 && (
                <div className="flex items-center gap-2">
                  <Stars value={avgRating} size="md" />
                  <span className="text-sm font-semibold">{avgLabel}/5</span>
                  <span className="text-sm text-muted">from {totalReviews.toLocaleString('en-IN')} reviews</span>
                </div>
              )}
              <Link
                href="/business/register"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2.5"
              >
                List your business <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAND ============ */}
      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-soft sm:grid-cols-4">
          <Kpi value={totalBiz.toLocaleString('en-IN')} label="Businesses listed" icon={<Building2 size={18} />} />
          {/* published, not verified — verification is a business's badge, and
              claiming it for every review is a claim we cannot back */}
          <Kpi value={totalReviews.toLocaleString('en-IN')} label="Customer reviews" icon={<BadgeCheck size={18} />} />
          <Kpi value={totalCategories.toLocaleString('en-IN')} label="Categories" icon={<TrendingUp size={18} />} />
          <Kpi value={avgLabel} label="Avg rating" icon={<Star size={18} />} />
        </div>
      </section>

      {/* ============ WHY ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          <Feature icon={<BadgeCheck size={22} />} title="Verified businesses" text="Every listing is checked, so you review real companies — not fakes." />
          <Feature icon={<MessageSquareText size={22} />} title="Businesses reply" text="Owners respond publicly, turning feedback into better service." />
          <Feature icon={<Flag size={22} />} title="Fake reviews flagged" text="Report suspicious reviews — our team keeps ratings honest." />
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      {categories.length > 0 && (
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Explore categories</h2>
            <p className="mt-1 text-muted">Browse businesses by what they do.</p>
          </div>
          <Link href="/categories" className="text-sm font-semibold text-brand hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="group overflow-hidden rounded-2xl border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:shadow-float">
              {/* A tinted tile rather than a photo: the stock images were random
                  (an ocean for "SEO agency"), and no photo set covers 4,000
                  categories. The colour is derived from the slug, so each one
                  is distinct but stable. */}
              <div
                className="relative h-28 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${colorFrom(c.slug)}, var(--brand-strong))` }}
              >
                <CategoryIcon
                  name={c.icon}
                  category={c.name}
                  size={96}
                  className="absolute -bottom-4 -right-3 text-white/20 transition duration-500 group-hover:scale-110"
                />
                <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-brand shadow-soft">
                  <CategoryIcon name={c.icon} category={c.name} size={18} />
                </span>
                <span className="absolute bottom-2 left-3 pr-12 font-semibold text-white drop-shadow">{c.name}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted">{c.listingCount} listings</span>
                <ArrowRight size={15} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* ============ RECENT REVIEWS ============ */}
      <section className="border-y bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex items-center gap-2">
            <Quote size={22} className="text-brand" />
            <h2 className="text-3xl font-bold tracking-tight">What customers are saying</h2>
          </div>
          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r) => (
              <Link key={r.id} href={`/company/${r.business.slug}`} className="rounded-2xl border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-float">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} size="sm" />
                  <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                </div>
                <p className="mt-3 font-semibold">{r.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{r.body}</p>
                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                  {r.business.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.business.logo} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: colorFrom(r.business.slug) }}>
                      {initials(r.business.name)}
                    </span>
                  )}
                  <span className="text-sm font-medium">{r.business.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TOP RATED ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-center gap-2">
          <Star size={22} className="text-star" fill="var(--star)" />
          <h2 className="text-3xl font-bold tracking-tight">Top rated on Kings Reviews</h2>
        </div>
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topRated.map((b) => (
            <BusinessCard key={b.id} b={b} />
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-t bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">How Kings Reviews works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Step n="1" icon={<Search size={22} />} title="Discover" text="Search and browse verified businesses by category, city or name." />
            <Step n="2" icon={<PencilLine size={22} />} title="Review" text="Share your honest experience and rate out of 5 stars." />
            <Step n="3" icon={<Building2 size={22} />} title="Grow" text="Businesses reply to reviews and build lasting public trust." />
          </div>
        </div>
      </section>

      {/* ============ POPULAR CITIES ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Popular cities</h2>
        <div className="flex flex-wrap gap-2">
          {cities.slice(0, 12).map((c) => (
            <Link key={c.slug} href={`/city/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-4 py-2 text-sm shadow-soft transition hover:border-brand hover:text-brand">
              <MapPin size={14} /> {c.name}
              <span className="text-xs text-muted">{c.count.toLocaleString('en-IN')}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ BUSINESS CTA ============ */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand p-10 text-white sm:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-52 w-52 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold">Own a business?</h2>
              <p className="mt-2 max-w-md text-white/85">List it free, collect genuine customer reviews and win new customers with public trust.</p>
            </div>
            <Link href="/business/register" className="shrink-0 rounded-full bg-white px-8 py-3.5 font-bold text-brand transition hover:scale-105">
              List your business — free
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Kpi({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white px-4 py-6 text-center">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/10 text-brand">{icon}</span>
      <span className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-surface p-6 shadow-soft">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-brand">{icon}</span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  )
}

function Step({ n, icon, title, text }: { n: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="relative rounded-2xl border bg-white p-7 shadow-soft">
      <span className="absolute right-5 top-5 text-4xl font-black text-mint-2">{n}</span>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">{icon}</span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  )
}
