import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string)
const db = new PrismaClient({ adapter })

// One-shot wipe of all demo data. FK cascades do most of the work:
// deleting a Business removes its reviews/replies/images/hours;
// deleting a User removes their businesses + reviews.
async function main() {
  await db.reviewReport.deleteMany({})
  await db.reviewVote.deleteMany({})
  await db.reviewImage.deleteMany({})
  await db.reviewReply.deleteMany({})
  await db.review.deleteMany({})
  await db.businessImage.deleteMany({})
  await db.businessHour.deleteMany({})
  await db.business.deleteMany({})
  await db.category.deleteMany({})
  await db.auditLog.deleteMany({})
  // demo accounts only (seeded owner/admin/reviewers)
  await db.user.deleteMany({
    where: { OR: [{ email: { endsWith: '@example.in' } }, { email: { endsWith: '@trustindex.in' } }] },
  })
  console.log('Demo data removed.')
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
