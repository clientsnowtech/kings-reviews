/**
 * Replaces the category table with Google Business Profile's category list.
 *
 * Run with `npm run db:categories`. Safe to re-run: it upserts by slug and only
 * removes leftovers that no business is filed under, so a category someone is
 * already using survives even if it is not on the list.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import 'dotenv/config'

const db = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) })

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const file = join(process.cwd(), 'prisma', 'categories.json')
  const names: string[] = JSON.parse(readFileSync(file, 'utf8'))
  console.log(`read ${names.length} category names`)

  // Different names can reduce to the same slug ("A&W" vs "A W"), and slug is
  // unique, so disambiguate before touching the database.
  const seen = new Set<string>()
  const rows = names.map((name) => {
    const base = slugify(name) || 'category'
    let slug = base
    for (let i = 2; seen.has(slug); i++) slug = `${base}-${i}`
    seen.add(slug)
    return { name, slug }
  })

  let created = 0
  let updated = 0
  for (const row of rows) {
    const existing = await db.category.findUnique({ where: { slug: row.slug }, select: { id: true } })
    if (existing) {
      await db.category.update({ where: { id: existing.id }, data: { name: row.name } })
      updated++
    } else {
      await db.category.create({ data: { name: row.name, slug: row.slug } })
      created++
    }
    if ((created + updated) % 500 === 0) console.log(`  …${created + updated}/${rows.length}`)
  }

  const slugs = rows.map((r) => r.slug)
  const removed = await db.category.deleteMany({
    where: { slug: { notIn: slugs }, businesses: { none: {} } },
  })
  const kept = await db.category.count({ where: { slug: { notIn: slugs } } })

  console.log(`created ${created}, updated ${updated}, removed ${removed.count}`)
  if (kept > 0) {
    console.log(`kept ${kept} off-list categories because businesses are filed under them`)
  }
  console.log('total categories:', await db.category.count())
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
