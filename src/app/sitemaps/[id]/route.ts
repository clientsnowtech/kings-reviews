import { entriesForSitemap, escapeXml, sitemapCount, xmlResponse } from '@/lib/sitemap'

/**
 * One chunk of the sitemap — 10,000 URLs at most.
 *
 * Reached as /sitemap_<n>.xml, which is the name the index publishes and the
 * only name anything should fetch; next.config.ts rewrites it here because a
 * route segment cannot be half of a filename. Nothing links to /sitemaps/<n>
 * directly and robots.txt keeps crawlers off it, so the numbered .xml stays
 * the single canonical address.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const n = Number(id)

  const count = await sitemapCount()
  if (!Number.isInteger(n) || n < 1 || n > count) {
    return new Response('Not found', { status: 404 })
  }

  const entries = await entriesForSitemap(n)

  const urls = entries
    .map((e) =>
      [
        '  <url>',
        `    <loc>${escapeXml(e.url)}</loc>`,
        e.lastModified ? `    <lastmod>${e.lastModified.toISOString()}</lastmod>` : null,
        `    <changefreq>${e.changeFrequency}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

  return xmlResponse(body)
}
