import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  Cpu,
  Eye,
  Handshake,
  MapPin,
  MessageSquareText,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { db } from '@/lib/db'
import { Stars } from '@/components/stars'
import { LEGAL_ENTITY, OFFICE, OFFICE_MAP_URL } from '@/lib/legal'
import { clampDescription, SITE_NAME, SITE_URL } from '@/lib/seo'

/** Stats are a headline, not a ledger — an hour of staleness costs nothing. */
export const revalidate = 3600

const description = clampDescription(
  `${SITE_NAME} is an independent business review directory for India. Our mission, how we keep ` +
    'reviews honest, and why no business can pay to remove one.',
)

export const metadata: Metadata = {
  title: 'About Us',
  description,
  keywords: [
    'about Kings Reviews',
    'Indian business review platform',
    'verified customer reviews India',
    'independent review directory',
    'fake review detection India',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/about',
    title: 'About Us',
    description,
  },
  twitter: { card: 'summary_large_image', title: 'About Us', description },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_URL}/about`,
  name: `About ${LEGAL_ENTITY}`,
  description,
  mainEntity: {
    '@type': 'Organization',
    name: LEGAL_ENTITY,
    url: SITE_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${OFFICE.line1}, ${OFFICE.line2}`,
      addressLocality: OFFICE.city,
      addressRegion: OFFICE.state,
      postalCode: OFFICE.pincode,
      addressCountry: 'IN',
    },
  },
}

const VALUES = [
  {
    icon: <Users size={18} />,
    title: 'The reader comes first',
    body: 'Every call — what we show, what we remove, what we rank — is settled by what serves the person deciding where to spend their money.',
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Integrity is not for sale',
    body: 'No business can buy a rating, a rank, or the deletion of a review. If we ever cannot say that, this platform is worth nothing.',
  },
  {
    icon: <Handshake size={18} />,
    title: 'Both sides get a voice',
    body: 'A customer writes; the owner answers in public. Neither gets the last word in private.',
  },
  {
    icon: <Eye size={18} />,
    title: 'Explain the decision',
    body: 'When we take a review down, the person who wrote it is told what happened and why. Silence is not moderation.',
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Built for India',
    body: 'Indian cities, Indian categories, Indian law — DPDP Act and IT Rules compliant, not a foreign product with a rupee sign bolted on.',
  },
]

export default async function AboutPage() {
  const [businesses, reviews, categories, cities, featured] = await Promise.all([
    db.business.count({ where: { status: 'LIVE' } }),
    db.review.count({ where: { status: 'LIVE' } }),
    db.category.count({ where: { businesses: { some: { status: 'LIVE' } } } }),
    db.business.findMany({
      where: { status: 'LIVE' },
      distinct: ['city'],
      select: { city: true },
    }),
    // Real reviews, not invented testimonials — the whole page argues for
    // honesty, so the social proof had better come out of the database.
    db.review.findMany({
      where: { status: 'LIVE', rating: { gte: 4 } },
      orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      take: 3,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        user: { select: { name: true } },
        business: { select: { name: true, slug: true, city: true } },
      },
    }),
  ])

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============ HERO ============ */}
      <section className="hero-wash border-b">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted">
            <Link href="/" className="hover:text-brand">Home</Link>
            <ChevronRight size={14} />
            <span className="font-medium text-foreground">About</span>
          </nav>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white/70 px-3 py-1 text-xs font-semibold text-brand shadow-soft">
            <ShieldCheck size={14} /> Independent · India-first
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
            Every customer in India deserves <span className="text-brand">a voice</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            {LEGAL_ENTITY} is an independent directory where people write about the businesses they
            have really dealt with — and where those businesses answer in public, for everyone to
            read.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Building2 size={16} />} value={businesses} label="businesses listed" />
            <Stat icon={<Star size={16} />} value={reviews} label="reviews published" />
            <Stat icon={<ScanSearch size={16} />} value={categories} label="active categories" />
            <Stat icon={<MapPin size={16} />} value={cities.length} label="cities covered" />
          </dl>
        </div>
      </section>

      {/* ============ MISSION ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand">Our mission</h2>
            <p className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">
              To become the answer to “is this business any good?” — for every business in India.
            </p>
          </div>
          <div className="space-y-4 text-foreground/90">
            <p>
              Finding an honest opinion about a local business here is harder than it should be.
              Ratings sit inside marketplaces that also want your order. Five-star reviews arrive in
              batches from accounts that never bought anything. And an owner with a genuine
              explanation has nowhere to give it.
            </p>
            <p>
              So we built a directory with one job: put the customer’s experience and the owner’s
              reply on the same page, in the open, and let the reader decide. No sponsored ranking,
              no paid deletions, no algorithm quietly burying the inconvenient.
            </p>
            <p className="border-l-2 border-brand pl-4 font-medium text-foreground">
              A review platform is only worth what its worst incentive allows. Ours is simple —
              nobody can pay us to change what you read.
            </p>
          </div>
        </div>
      </section>

      {/* ============ WHAT WE DO ============ */}
      <section className="border-y bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold">What we do</h2>
          <p className="mt-2 max-w-2xl text-muted">
            One platform, two jobs — and they only work together.
          </p>

          <div className="stagger mt-8 grid gap-4 lg:grid-cols-2">
            <Audience
              badge="For customers"
              icon={<Users size={18} />}
              title="Decide with real experience, not advertising"
              points={[
                'Search any business, category or city and read what customers actually said.',
                'Ratings that come from accounts, one review per business, screened before they publish.',
                'See the owner’s reply right under the review — the full exchange, not one side.',
              ]}
              cta={{ href: '/categories', label: 'Browse categories' }}
            />
            <Audience
              badge="For businesses"
              icon={<Building2 size={18} />}
              title="Earn trust in public, and keep it"
              points={[
                'Claim your listing free, correct your details, and add photos and hours.',
                'Reply to every review publicly — turn a complaint into a visible resolution.',
                'Collect reviews with a QR card or link, and show your rating with a badge on your site.',
              ]}
              cta={{ href: '/business/register', label: 'List your business free' }}
            />
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="stagger mt-6 grid gap-4 sm:grid-cols-3">
          <Step
            n={1}
            icon={<ScanSearch size={18} />}
            title="Find the business"
            body="Search by name, browse a category, or narrow down to your city."
          />
          <Step
            n={2}
            icon={<MessageSquareText size={18} />}
            title="Read and write"
            body="Every review comes from a registered account, one per business, first-hand only."
          />
          <Step
            n={3}
            icon={<BadgeCheck size={18} />}
            title="Owners reply"
            body="Verified owners answer publicly. No private edits, no quiet deletions."
          />
        </div>
      </section>

      {/* ============ TRUST & INTEGRITY ============ */}
      <section className="border-y bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold">How we keep reviews honest</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Fake reviews are the whole problem. We fight them on three fronts, because any one of
            them alone is easy to walk around.
          </p>

          <div className="stagger mt-8 grid gap-4 sm:grid-cols-3">
            <Pillar
              icon={<Cpu size={18} />}
              title="Automated checks"
              body="Every submission is screened for banned words, duplicate text, personal data and burst patterns before a human ever sees it."
            />
            <Pillar
              icon={<Users size={18} />}
              title="Human moderation"
              body="Reviews are approved by a person, not a queue timer. Rejections carry a written reason back to the reviewer."
            />
            <Pillar
              icon={<ShieldCheck size={18} />}
              title="Community reports"
              body="Anyone can report a review. Reports open a case with our Grievance Officer and are answered on a statutory clock."
            />
          </div>

          <p className="mt-6 text-sm text-muted">
            Something wrong on the platform?{' '}
            <Link href="/grievance" className="font-medium text-brand hover:underline">
              Report it here
            </Link>{' '}
            — acknowledged within 24 hours, resolved within 15 days.
          </p>
        </div>
      </section>

      {/* ============ VALUES ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold">What we stand for</h2>
        <div className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand hover:shadow-float"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                {v.icon}
              </span>
              <h3 className="mt-3 font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ REAL REVIEWS ============ */}
      {featured.length > 0 && (
        <section className="border-y bg-cream">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-bold">In their words</h2>
            <p className="mt-2 text-muted">
              Pulled live from the platform — not written for this page.
            </p>

            <div className="stagger mt-8 grid gap-4 sm:grid-cols-3">
              {featured.map((r) => (
                <figure
                  key={r.id}
                  className="flex flex-col rounded-2xl border bg-surface p-5 shadow-soft"
                >
                  <Quote size={20} className="text-brand/40" />
                  <Stars value={r.rating} size="sm" />
                  <blockquote className="mt-2 flex-1">
                    <p className="font-semibold">{r.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{r.body}</p>
                  </blockquote>
                  <figcaption className="mt-4 border-t pt-3 text-xs text-muted">
                    {r.user.name ?? 'A customer'} on{' '}
                    <Link
                      href={`/company/${r.business.slug}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {r.business.name}
                    </Link>
                    , {r.business.city}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ WHERE WE ARE ============ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Where we are</h2>
            <div className="mt-3 flex items-start gap-2 text-foreground/90">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand" />
              <address className="not-italic leading-relaxed">
                {LEGAL_ENTITY}
                <br />
                {OFFICE.line1}
                <br />
                {OFFICE.line2}
                <br />
                {OFFICE.city}, {OFFICE.state} {OFFICE.pincode}
              </address>
            </div>
            <a
              href={OFFICE_MAP_URL}
              target="_blank"
              rel="noopener"
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Open in Google Maps →
            </a>
          </div>

          <div className="rounded-2xl border bg-surface p-6 shadow-soft">
            <h3 className="font-semibold">Get in touch</h3>
            <p className="mt-1 text-sm text-muted">
              Questions, corrections, press, or partnerships — we read everything.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong active:scale-[0.98]"
              >
                Contact us
              </Link>
              <Link
                href="/business/register"
                className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:border-brand hover:text-brand active:scale-[0.98]"
              >
                List your business
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              Complaint about a review or your personal data?{' '}
              <Link href="/grievance" className="font-medium text-brand hover:underline">
                Grievance Redressal
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl border bg-white/80 px-4 py-3 shadow-soft">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <span className="text-brand">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-extrabold tabular-nums">{value.toLocaleString('en-IN')}</dd>
    </div>
  )
}

function Audience({
  badge,
  icon,
  title,
  points,
  cta,
}: {
  badge: string
  icon: React.ReactNode
  title: string
  points: string[]
  cta: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col rounded-2xl border bg-surface p-6 shadow-soft transition hover:border-brand hover:shadow-float">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
        {icon} {badge}
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <ul className="mt-3 flex-1 space-y-2 text-sm text-muted">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className="mt-5 inline-block w-fit rounded-lg border px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand active:scale-95"
      >
        {cta.label} →
      </Link>
    </div>
  )
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand hover:shadow-float">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
          {icon}
        </span>
        <span className="text-xs font-semibold text-muted">Step {n}</span>
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  )
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-surface p-5 shadow-soft">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  )
}
