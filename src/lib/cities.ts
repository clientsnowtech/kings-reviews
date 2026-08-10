import { db } from './db'
import { slugify } from './utils'

/**
 * The directory's cities, counted once rather than per page load.
 *
 * Every listing page wants the same thing — which cities have listings, and how
 * many — and each one was asking the database for a DISTINCT over the whole
 * business table. At a hundred thousand rows that is a scan on every request,
 * for an answer that changes when a listing is approved, not when a page is
 * opened. So it is grouped once and held for a few minutes.
 *
 * Next 16 replaced `unstable_cache` with `use cache`, which needs Cache
 * Components turned on for the whole app — a migration of its own, and every
 * page here is force-dynamic. A process-local memo is the honest fit: one
 * Passenger process serves the site, and a city count a few minutes stale
 * costs nothing.
 */

export type City = {
  /** as it is written on the listings */
  name: string
  /** the states it appears in — a name like Aurangabad belongs to two */
  states: string[]
  /** live listings */
  count: number
  slug: string
}

const TTL_MS = 10 * 60 * 1000

let memo: { at: number; cities: City[] } | null = null

async function load(): Promise<City[]> {
  const rows = await db.business.groupBy({
    by: ['city', 'state'],
    where: { status: 'LIVE' },
    _count: { _all: true },
  })

  // Two states can spell the same city, and one slug cannot point at both, so
  // the page for that slug covers every listing under the name.
  const bySlug = new Map<string, City>()
  for (const row of rows) {
    const name = row.city.trim()
    const slug = slugify(name)
    if (!slug) continue

    const found = bySlug.get(slug)
    if (found) {
      found.count += row._count._all
      if (row.state && !found.states.includes(row.state)) found.states.push(row.state)
    } else {
      bySlug.set(slug, {
        name,
        states: row.state ? [row.state] : [],
        count: row._count._all,
        slug,
      })
    }
  }

  return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Every city with a live listing, biggest first. */
export async function listCities(): Promise<City[]> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.cities
  const cities = await load()
  memo = { at: Date.now(), cities }
  return cities
}

/** Drop the memo — an import or an approval adds cities the list has not seen. */
export function forgetCities(): void {
  memo = null
}

export async function findCityBySlug(slug: string): Promise<City | null> {
  const cities = await listCities()
  return cities.find((c) => c.slug === slug) ?? null
}

/** Names for a dropdown, alphabetical, optionally narrowed to one state. */
export async function cityNames(state?: string): Promise<string[]> {
  const cities = await listCities()
  return cities
    .filter((c) => !state || c.states.includes(state))
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b))
}

/** The states with a live listing, alphabetical. */
export async function stateNames(): Promise<string[]> {
  const cities = await listCities()
  return [...new Set(cities.flatMap((c) => c.states))].sort((a, b) => a.localeCompare(b))
}