/**
 * Rewrite every category's listingCount from what is actually live.
 *
 * Counts used to move by +1 at listing time, back when a new listing was
 * instantly public. A listing now only counts once an admin approves it, so
 * rows written under the old rule read one too high. Run this once after
 * deploying; from then on the app keeps the counts right by itself.
 *
 *   npm run db:recount
 */
// run outside Next, so nothing has read .env for us
import 'dotenv/config'
import { db } from '../src/lib/db'

async function main() {
  const categories = await db.category.findMany({
    select: { id: true, name: true, listingCount: true },
  })
  let fixed = 0

  for (const c of categories) {
    // same rule as recountCategory(): a listing counts under its primary trade
    // and under every extra one it is filed in
    const live = await db.business.count({
      where: {
        status: 'LIVE',
        OR: [{ categoryId: c.id }, { extraCategories: { some: { id: c.id } } }],
      },
    })
    if (live === c.listingCount) continue
    await db.category.update({ where: { id: c.id }, data: { listingCount: live } })
    console.info(`${c.name}: ${c.listingCount} → ${live}`)
    fixed++
  }

  console.info(`Done. ${fixed} of ${categories.length} categories corrected.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
