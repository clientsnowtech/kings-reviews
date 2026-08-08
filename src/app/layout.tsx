import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { PageTransition } from '@/components/page-transition'
import { Logo } from '@/components/logo'
import { CookieConsent, CookieSettingsButton } from '@/components/cookie-consent'
import { Analytics } from '@/components/analytics'
import { CREDIT_NAME, CREDIT_URL } from '@/lib/badge'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'TrustIndex India'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Read & write business reviews`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'Discover and review businesses across India. Honest customer ratings and reviews for restaurants, hotels, services and more.',
  // Search-console ownership proof. A bare meta tag — no script, no cookie — so
  // it sits outside the consent gate that Analytics() lives behind.
  verification: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
    ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
    : undefined,
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="inline-block hover:translate-x-0.5 hover:text-brand">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="border-t bg-cream">
          <div className="mx-auto max-w-6xl px-4 py-12">
            {/* Two columns even on the narrowest phone — three stacked link
                lists pushed the copyright line a full screen of scrolling away.
                The brand blurb keeps full width; only the link lists pair up. */}
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
              <div className="col-span-2 sm:col-span-1">
                <Logo href={null} />
                <p className="mt-3 max-w-xs text-sm text-muted">
                  India’s trusted business review directory. Read honest reviews and share your own.
                </p>
              </div>

              <FooterCol title="Discover" links={[['Categories', '/categories'], ['Search', '/search'], ['Top rated', '/']]} />
              <FooterCol title="For businesses" links={[['List your business', '/business/register'], ['Dashboard', '/business/dashboard'], ['Log in', '/login']]} />
              <FooterCol title="Account" links={[['Sign up', '/register'], ['Log in', '/login'], ['My reviews', '/my/reviews']]} />
              <FooterCol title="Company" links={[['About us', '/about'], ['Contact us', '/contact'], ['Grievance', '/grievance']]} />
            </div>

            {/* DPDPA asks that the notice and the grievance route be easy to
                find from anywhere on the platform, not buried in a sub-page. */}
            <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t pt-6 text-sm text-muted">
              {(
                [
                  ['About Us', '/about'],
                  ['Contact Us', '/contact'],
                  ['Privacy Policy', '/privacy'],
                  ['Terms of Service', '/terms'],
                  ['Grievance Redressal', '/grievance'],
                ] as [string, string][]
              ).map(([label, href]) => (
                <Link key={href} href={href} className="inline-block hover:translate-x-0.5 hover:text-brand">
                  {label}
                </Link>
              ))}
              {/* Withdrawing consent has to be as easy as giving it, so the way
                  back into the choice lives beside the notice it belongs to. */}
              <CookieSettingsButton className="inline-block hover:translate-x-0.5 hover:text-brand" />
            </nav>

            <div className="mt-6 flex flex-col gap-2 border-t pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
              <p className="flex items-center gap-1.5">
                Made in India
                {/* drawn, not 🇮🇳 — Windows ships no flag glyphs and renders
                    that emoji as the bare letters "IN" */}
                <svg
                  width="18"
                  height="12"
                  viewBox="0 0 18 12"
                  role="img"
                  aria-label="India"
                  className="shrink-0 rounded-[2px] ring-1 ring-black/10"
                >
                  <rect width="18" height="4" fill="#ff9933" />
                  <rect y="4" width="18" height="4" fill="#ffffff" />
                  <rect y="8" width="18" height="4" fill="#138808" />
                  <circle cx="9" cy="6" r="1.5" fill="none" stroke="#000080" strokeWidth="0.7" />
                </svg>
                · Built by{' '}
                <a
                  href={CREDIT_URL}
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-brand hover:underline"
                >
                  {CREDIT_NAME}
                </a>
              </p>
            </div>
          </div>
        </footer>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  )
}
