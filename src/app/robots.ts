import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // badge images are hotlinked from customer sites, so they stay crawlable
      allow: ['/', '/api/badge/'],
      // /r/ is the review short-link — it only ever redirects, so crawling it
      // spends budget to land on a page the sitemap already lists.
      // /sitemaps/ is what sitemap_<n>.xml rewrites to internally; the
      // numbered name is the one to fetch, and this keeps the raw path from
      // being crawled as a second copy of it.
      disallow: [
        '/sitemaps/',
        '/business/dashboard',
        '/my/',
        '/api/',
        '/embed/',
        '/login',
        '/register',
        '/r/',
        '/post-login',
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
