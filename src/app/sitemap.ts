import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { listCities } from '@/lib/cities'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

// without this the sitemap is frozen at build time and newly approved
// businesses never reach Google until the next deploy
export const revalidate = 3600

/** A single sitemap file may not exceed 50,000 URLs. */
const MAX_URLS = 50_000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const staticRoutes: MetadataRoute.Sitemap = [
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

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/category/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Only covers a business's primary category. A listing filed under extra
  // categories still reaches the plain /category/<slug> page above, which is
  // what carries its links.
  const cityRoutes: MetadataRoute.Sitemap = cityPairs
    .filter((p) => p.category?.slug && p.city)
    .map((p) => ({
      url: `${BASE}/category/${p.category!.slug}?city=${encodeURIComponent(p.city)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${BASE}/company/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  // "Businesses in Ahmedabad" is a page in its own right now, so it is listed
  // as one — ahead of the category×city long tail, which is far larger and far
  // thinner.
  const cityPageRoutes: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${BASE}/city/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // Business pages first, then the listing pages that link to them — if the cap
  // ever bites it should drop the long tail, not a real profile.
  return [
    ...staticRoutes,
    ...businessRoutes,
    ...cityPageRoutes,
    ...categoryRoutes,
    ...cityRoutes,
  ].slice(0, MAX_URLS)
}
