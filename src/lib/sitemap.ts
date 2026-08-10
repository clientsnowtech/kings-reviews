import { db } from './db'
import { listCities } from './cities'

export const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

/**
 * A sitemap file may hold 50,000 URLs, but the directory grows by whole
 * imported directories at a time and a file that large is slow to fetch and
 * slow to re-crawl. Ten thousand keeps every file small, and the index carries
 * as many of them as it takes — no link is dropped for want of room.
 */
export const CHUNK_SIZE = 10_000

/** The protocol's ceiling on how many sitemaps one index may list. */
const MAX_SITEMAPS = 50_000

export type SitemapEntry = {
  url: string
  lastModified?: Date
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority: number
}

/**
 * Every URL the site wants crawled, in the order it wants them crawled.
 *
 * Collected once and held for a few minutes, the same way city counts are (see
 * lib/cities.ts): a crawler reads the index and then pulls every chunk in a
 * burst, and each chunk asking the database for the whole business table again
 * would be one scan per file. The list is built once and sliced from there.
 */
const TTL_MS = 15 * 60 * 1000

let memo: { at: number; entries: SitemapEntry[] } | null = null

async function load(): Promise<SitemapEntry[]> {
  const [categories, businesses, cityPairs, cities] = await Promise.all([
    db.category.findMany({ select: { slug: true } }),
    db.business.findMany({
      where: { status: 'LIVE' },
      select: { slug: true, updatedAt: true },
    }),
    // "Plumbers in Pune" is the query people actually type, and the category
    // page already treats ?city= as its own canonical — but none of those URLs
    // were ever listed, so nothing crawled them. One row per category/city
    // combination that has a live listing.
    db.business.findMany({
      where: { status: 'LIVE' },
      distinct: ['categoryId', 'city'],
      select: { city: true, category: { select: { slug: true } } },
      orderBy: { city: 'asc' },
    }),
    listCities(),
  ])

  const staticRoutes: SitemapEntry[] = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/businesses`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/cities`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/business/register`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/grievance`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const categoryRoutes: SitemapEntry[] = categories.map((c) => ({
    url: `${BASE}/category/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Only covers a business's primary category. A listing filed under extra
  // categories still reaches the plain /category/<slug> page above, which is
  // what carries its links.
  const cityRoutes: SitemapEntry[] = cityPairs
    .filter((p) => p.category?.slug && p.city)
    .map((p) => ({
      url: `${BASE}/category/${p.category!.slug}?city=${encodeURIComponent(p.city)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  const businessRoutes: SitemapEntry[] = businesses.map((b) => ({
    url: `${BASE}/company/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  // "Businesses in Ahmedabad" is a page in its own right now, so it is listed
  // as one — ahead of the category×city long tail, which is far larger and far
  // thinner.
  const cityPageRoutes: SitemapEntry[] = cities.map((c) => ({
    url: `${BASE}/city/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // Business pages first, then the listing pages that link to them — the early
  // chunks are the ones a crawler reaches first.
  return [
    ...staticRoutes,
    ...businessRoutes,
    ...cityPageRoutes,
    ...categoryRoutes,
    ...cityRoutes,
  ].slice(0, CHUNK_SIZE * MAX_SITEMAPS)
}

export async function allEntries(): Promise<SitemapEntry[]> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.entries
  const entries = await load()
  memo = { at: Date.now(), entries }
  return entries
}

/** How many sitemap files it takes to hold every URL. Never fewer than one. */
export async function sitemapCount(): Promise<number> {
  const entries = await allEntries()
  return Math.max(1, Math.ceil(entries.length / CHUNK_SIZE))
}

/** The URLs in sitemap_<n>.xml, counted from 1. Empty when n is out of range. */
export async function entriesForSitemap(n: number): Promise<SitemapEntry[]> {
  const entries = await allEntries()
  const start = (n - 1) * CHUNK_SIZE
  return entries.slice(start, start + CHUNK_SIZE)
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}