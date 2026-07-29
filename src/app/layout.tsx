import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Logo } from '@/components/logo'
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
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="hover:text-brand">{label}</Link>
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
        <main className="flex-1">{children}</main>
        <footer className="border-t bg-cream">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Logo href={null} />
                <p className="mt-3 max-w-xs text-sm text-muted">
                  India’s trusted business review directory. Read honest reviews and share your own.
                </p>
              </div>

              <FooterCol title="Discover" links={[['Categories', '/categories'], ['Search', '/search'], ['Top rated', '/']]} />
              <FooterCol title="For businesses" links={[['List your business', '/business/register'], ['Dashboard', '/business/dashboard'], ['Log in', '/login']]} />
              <FooterCol title="Account" links={[['Sign up', '/register'], ['Log in', '/login'], ['My reviews', '/my/reviews']]} />
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
              <p>
                Made in India 🇮🇳 · Built by{' '}
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
      </body>
    </html>
  )
}
