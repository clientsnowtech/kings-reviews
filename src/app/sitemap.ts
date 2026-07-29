import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

// without this the sitemap is frozen at build time and newly approved
// businesses never reach Google until the next deploy
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, businesses] = await Promise.all([
    db.category.findMany({ select: { slug: true } }),
    db.business.findMany({
      where: { status: 'LIVE' },
      select: { slug: true, updatedAt: true },
    }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/business/register`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/category/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${BASE}/company/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  return [...staticRoutes, ...categoryRoutes, ...businessRoutes]
}
