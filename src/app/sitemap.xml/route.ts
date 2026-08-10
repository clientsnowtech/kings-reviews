import {
  BASE,
  entriesForSitemap,
  escapeXml,
  sitemapCount,
  xmlResponse,
} from '@/lib/sitemap'

/**
 * The sitemap index.
 *
 * Next's `sitemap.ts` convention only ever writes a single <urlset>, and one
 * file cannot hold a directory this size without brushing the 50,000 URL
 * limit. So /sitemap.xml is an index instead: it lists sitemap_1.xml,
 * sitemap_2.xml and however many more it takes to cover every URL. Search
 * engines accept an index anywhere they accept a sitemap, so robots.txt keeps
 * pointing at this same address.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const count = await sitemapCount()

  const parts: string[] = []
  for (let n = 1; n <= count; n++) {
    const entries = await entriesForSitemap(n)
    // the newest listing in the file — tells a crawler which chunks moved
    let newest: Date | undefined
    for (const e of entries) {
      if (e.lastModified && (!newest || e.lastModified > newest)) newest = e.lastModified
    }
    parts.push(
      [
        '  <sitemap>',
        `    <loc>${escapeXml(`${BASE}/sitemap_${n}.xml`)}</loc>`,
        newest ? `    <lastmod>${newest.toISOString()}</lastmod>` : null,
        '  </sitemap>',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${parts.join('\n')}
</sitemapindex>
`

  return xmlResponse(body)
}
