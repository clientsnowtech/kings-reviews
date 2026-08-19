import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
} from 'lucide-react'
import { ContactForm } from '@/components/contact-form'
import { GRIEVANCE, LEGAL_ENTITY, OFFICE, OFFICE_MAP_URL } from '@/lib/legal'
import { clampDescription, SITE_NAME, SITE_URL } from '@/lib/seo'

const description = clampDescription(
  `Contact ${SITE_NAME} — email ${GRIEVANCE.email}, call ${GRIEVANCE.phone}, or visit our office in ` +
    `${OFFICE.city}, ${OFFICE.state}. We reply to every message on working days.`,
)

export const metadata: Metadata = {
  title: 'Contact Us',
  description,
  keywords: [
    'contact Kings Reviews',
    'Kings Reviews support',
    'business listing help',
    `review platform contact ${OFFICE.city}`,
  ],
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/contact',
    title: 'Contact Us',
    description,
  },
  twitter: { card: 'summary_large_image', title: 'Contact Us', description },
}

/** Keyless embed — `output=embed` needs no Maps API key and no client script. */
const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(OFFICE.full)}&output=embed`

const WHATSAPP_URL = `https://wa.me/${GRIEVANCE.phoneHref.replace('+', '')}`

/**
 * Answers people actually write in about. Kept in one array so the visible
 * accordion and the FAQPage markup can never drift apart — two hand-maintained
 * copies is how rich results end up quoting text that is no longer on the page.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I claim my business listing?',
    a: 'Register as a business owner, search for your listing, and submit a claim. We verify ownership using the contact details on the listing — usually within two working days. Claiming and replying to reviews is free.',
  },
  {
    q: 'Can I get a negative review removed?',
    a: 'Not for being negative. We remove content that is fake, abusive, defamatory, off-topic, or that exposes someone’s personal data. Nobody can pay to have a review deleted. Report it through Grievance Redressal and we will assess it against our policy and the law.',
  },
  {
    q: 'How quickly do you reply?',
    a: 'General queries get an answer within 24 hours on working days. Formal grievances are acknowledged within 24 hours and resolved within 15 days, as the IT Rules, 2021 require.',
  },
  {
    q: 'The information on my listing is wrong. How do I fix it?',
    a: 'Claim the listing and edit it from your dashboard — name, address, hours, photos and contact details are all yours to change. If you cannot claim it yet, email us the correction and we will update it.',
  },
  {
    q: 'Do you charge for a listing?',
    a: 'No. Listing a business, claiming it, and replying to reviews are all free. We do not sell ranking positions, and paying us cannot move a business up the results.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      // The page Google reads for NAP — name, address, phone.
      '@type': 'Organization',
      name: LEGAL_ENTITY,
      url: SITE_URL,
      email: GRIEVANCE.email,
      telephone: GRIEVANCE.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${OFFICE.line1}, ${OFFICE.line2}`,
        addressLocality: OFFICE.city,
        addressRegion: OFFICE.state,
        postalCode: OFFICE.pincode,
        addressCountry: 'IN',
      },
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: GRIEVANCE.email,
          telephone: GRIEVANCE.phone,
          areaServed: 'IN',
          availableLanguage: ['English', 'Hindi', 'Gujarati'],
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

export default function ContactPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============ HERO ============ */}
      <section className="hero-wash border-b">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted">
            <Link href="/" className="hover:text-brand">Home</Link>
            <ChevronRight size={14} />
            <span className="font-medium text-foreground">Contact</span>
          </nav>

          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Talk to <span className="text-brand">us</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Questions about a listing, a review, or your account? Pick whichever way suits you —
            they all reach the same team.
          </p>

          {/* One tap each on a phone: dial, WhatsApp, mail. */}
          <div className="mt-8 flex flex-wrap gap-3">
            <QuickAction href={`tel:${GRIEVANCE.phoneHref}`} icon={<Phone size={16} />} primary>
              Call {GRIEVANCE.phone}
            </QuickAction>
            <QuickAction href={WHATSAPP_URL} icon={<MessageCircle size={16} />} external>
              WhatsApp
            </QuickAction>
            <QuickAction href={`mailto:${GRIEVANCE.email}`} icon={<Mail size={16} />}>
              Email us
            </QuickAction>
          </div>
        </div>
      </section>

      {/* ============ DETAILS + FORM ============ */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <div className="stagger space-y-4">
            <ContactCard
              icon={<Mail size={18} />}
              title="Email"
              hint="Best for anything with details or attachments."
            >
              <a href={`mailto:${GRIEVANCE.email}`} className="font-medium text-brand hover:underline">
                {GRIEVANCE.email}
              </a>
            </ContactCard>

            <ContactCard
              icon={<Phone size={18} />}
              title="Phone & WhatsApp"
              hint="Monday to Saturday, 10:00–18:00 IST."
            >
              <a href={`tel:${GRIEVANCE.phoneHref}`} className="font-medium text-brand hover:underline">
                {GRIEVANCE.phone}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="mt-1 block font-medium text-brand hover:underline"
              >
                Chat on WhatsApp →
              </a>
            </ContactCard>

            <ContactCard icon={<MapPin size={18} />} title="Office" hint="Visits by appointment.">
              <address className="not-italic leading-relaxed">
                {OFFICE.line1}
                <br />
                {OFFICE.line2}
                <br />
                {OFFICE.city}, {OFFICE.state} {OFFICE.pincode}
              </address>
              <a
                href={OFFICE_MAP_URL}
                target="_blank"
                rel="noopener"
                className="mt-2 inline-block font-medium text-brand hover:underline"
              >
                Open in Google Maps →
              </a>
            </ContactCard>

            <ContactCard
              icon={<Clock size={18} />}
              title="Response time"
              hint="Grievances follow the statutory clock."
            >
              <p>
                General queries: within 24 hours on working days. Formal grievances: acknowledged in{' '}
                {GRIEVANCE.ackHours} hours, resolved within {GRIEVANCE.resolveDays} days.
              </p>
            </ContactCard>

            <ContactCard
              icon={<ShieldAlert size={18} />}
              title="Complaint about content or data?"
              hint="That route is separate, and it has a named officer."
            >
              <Link href="/grievance" className="font-medium text-brand hover:underline">
                Go to Grievance Redressal →
              </Link>
            </ContactCard>

            <ContactCard
              icon={<Building2 size={18} />}
              title="Own a business?"
              hint="Claim your page and reply to reviews."
            >
              <Link href="/business/register" className="font-medium text-brand hover:underline">
                List your business free →
              </Link>
            </ContactCard>
          </div>

          {/* Sticky so the form stays in view while the card column scrolls. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ============ MAP ============ */}
      <section className="border-t bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold">Find us in {OFFICE.city}</h2>
          <p className="mt-2 text-sm text-muted">
            {OFFICE.line1}, {OFFICE.line2}, {OFFICE.city}, {OFFICE.state} {OFFICE.pincode}
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border shadow-soft">
            <iframe
              // loading="lazy" keeps the embed off the critical path — the map is
              // below the fold and costs more than everything above it combined.
              src={MAP_EMBED_URL}
              title={`Map to ${LEGAL_ENTITY}, ${OFFICE.city}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[340px] w-full border-0"
            />
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-2xl font-bold">Before you write in</h2>
        <p className="mt-2 text-sm text-muted">
          These five cover most of what reaches our inbox.
        </p>

        <div className="stagger mt-6 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border bg-surface p-5 shadow-soft transition hover:border-brand"
            >
              <summary className="flex list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  children,
  primary,
  external,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  primary?: boolean
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
      className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-soft active:scale-95 ${
        primary
          ? 'bg-brand text-white hover:bg-brand-strong'
          : 'border bg-white/80 hover:border-brand hover:text-brand'
      }`}
    >
      {icon}
      {children}
    </a>
  )
}

function ContactCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 rounded-2xl border bg-surface p-5 shadow-soft transition hover:border-brand hover:shadow-float">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
        <div className="mt-2 text-foreground/90">{children}</div>
      </div>
    </div>
  )
}
