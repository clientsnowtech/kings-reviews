import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { listCities } from '@/lib/cities'
import { clampDescription, SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const cities = await listCities()
  const total = cities.reduce((sum, c) => sum + c.count, 0)
  const named = cities.slice(0, 4).map((c) => c.name)
  const rest = cities.length - named.length

  const title = 'Browse businesses by city'
  const description = clampDescription(
    `Find verified businesses in ${named.join(', ')}${
      rest > 0 ? ` and ${rest.toLocaleString('en-IN')} more cities` : ''
    } — ${total.toLocaleString('en-IN')} listings on ${SITE_NAME}.`,
  )

  return {
    title,
    description,
    alternates: { canonical: '/cities' },
    openGraph: { type: 'website', siteName: SITE_NAME, url: '/cities', title, description },
  }
}

/** One city tile — the same card everywhere, so the state lists and the
 *  "most listed" strip cannot drift apart. */
function CityCard({ name, slug, count }: { name: string; slug: string; count: number }) {
  return (
    <Link
      href={`/city/${slug}`}
      className="flex items-center gap-3 rounded-xl border bg-surface p-4 transition hover:border-brand"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
        <MapPin size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{name}</span>
        <span className="block text-xs text-muted">{count.toLocaleString('en-IN')} listings</span>
      </span>
    </Link>
  )
}

export default async function CitiesPage() {
  const cities = await listCities()
  const total = cities.reduce((sum, c) => sum + c.count, 0)

  // Grouped by state, because a flat alphabetical wall of several hundred names
  // says nothing about where any of them are.
  const byState = new Map<string, typeof cities>()
  for (const city of cities) {
    for (const state of city.states.length ? city.states : ['Other']) {
      const list = byState.get(state) ?? []
      list.push(city)
      byState.set(state, list)
    }
  }
  const states = [...byState.entries()].sort(
    (a, b) =>
      b[1].reduce((n, c) => n + c.count, 0) - a[1].reduce((n, c) => n + c.count, 0) ||
      a[0].localeCompare(b[0]),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Businesses by city</h1>
      <p className="mt-1 text-muted">
        {total.toLocaleString('en-IN')} listings across {cities.length.toLocaleString('en-IN')}{' '}
        {cities.length === 1 ? 'city' : 'cities'}.
      </p>

      {cities.length === 0 ? (
        <p className="mt-8 rounded-xl border bg-surface p-8 text-center text-muted">
          No cities yet.{' '}
          <Link href="/business/register" className="font-medium text-brand hover:underline">
            List a business
          </Link>
          .
        </p>
      ) : (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">
            Most listed
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cities.slice(0, 8).map((c) => (
              <CityCard key={c.slug} name={c.name} slug={c.slug} count={c.count} />
            ))}
          </div>

          {states.map(([state, list]) => (
            <section key={state} className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{state}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[...list]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <CityCard key={c.slug} name={c.name} slug={c.slug} count={c.count} />
                  ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
