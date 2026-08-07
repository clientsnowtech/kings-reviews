/**
 * Publishes reviews whose owner-approval deadline has passed.
 *
 * The web pages sweep their own business on load, which covers anything people
 * actually look at. This script is for the rest — a listing nobody visits must
 * not become a place where reviews quietly rot. Run it daily:
 *
 *   npm run reviews:publish-due
 */
import { publishOverdueReviews, AUTO_PUBLISH_DAYS } from '../src/lib/review-sla'
import { db } from '../src/lib/db'

async function main() {
  if (!(AUTO_PUBLISH_DAYS > 0)) {
    console.log('REVIEW_AUTO_PUBLISH_DAYS is 0 — auto-publishing is off, nothing to do.')
    return
  }

  let total = 0
  // publishOverdueReviews caps each pass, so keep going until a pass is empty
  for (;;) {
    const n = await publishOverdueReviews()
    total += n
    if (n === 0) break
  }
  console.log(`Published ${total} review(s) past the ${AUTO_PUBLISH_DAYS}-day deadline.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
