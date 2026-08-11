/**
 * Hands every imported listing to the business it describes.
 *
 * The CSV import means to do this on the way in — no owner column, so the row
 * goes to its own email — but the sheets that built this database carried no
 * usable address where the importer looked, and 108,000 listings ended up under
 * a couple of house accounts. Nobody can be told about a listing that is not
 * theirs, so the welcome mail had nobody to write to.
 *
 * The address is the company email, or the contact email when the company one
 * is missing or unusable. An owner account is minted per address — locked, as
 * the import would have left it, so the daily welcome mail is what opens it.
 *
 *   npm run db:reassign-owners -- --dry       # counts only, nothing written
 *   npm run db:reassign-owners                # do it
 *   npm run db:reassign-owners -- --limit=20000
 *
 * Safe to re-run: a listing already under the right account is left alone, so
 * an interrupted run picks up where it stopped. --limit counts the listings
 * moved, not the rows read, so a run always gets that much further — capping
 * rows read would make every run re-walk the same finished prefix and stop.
 *
 * Two kinds of listing never move — one an owner filed themselves (this only
 * ever looks at addedByAdmin rows), and one whose address belongs to an admin,
 * which would hand a stranger's shop to staff and then mail them about it.
 */
// before anything touches the database
import 'dotenv/config'
import { db } from '../src/lib/db'

/** Rows per pass. Big enough to be quick, small enough to interrupt. */
const CHUNK = 500

const flags = process.argv.slice(2)
const has = (name: string) => flags.includes(`--${name}`)
const value = (name: string) =>
  flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? ''

/**
 * Good enough for a mailbox that has to receive a link: one @, a dot after it,
 * no spaces. The relay decides the rest — this only keeps the obvious rubbish
 * ("n/a", a phone number, an empty cell) out of the user table.
 */
function usableEmail(raw: string | null): string | null {
  const email = (raw ?? '').trim().toLowerCase()
  if (!email || email.length > 190) return null
  return /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(email) ? email : null
}

type Row = { id: string; email: string; contactEmail: string | null; ownerId: string }

async function main() {
  const dry = has('dry')
  const cap = Number(value('limit')) || Infinity

  // Their own listings must never move to a staff mailbox, and staff must not
  // be mailed about shops they merely typed in.
  const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
  const adminEmails = new Set(admins.map((a) => a.email.toLowerCase()))

  const tally = { seen: 0, moved: 0, created: 0, already: 0, noEmail: 0, admin: 0 }
  let cursor: string | undefined

  for (;;) {
    const rows: Row[] = await db.business.findMany({
      where: { addedByAdmin: true },
      orderBy: { id: 'asc' },
      take: CHUNK,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, email: true, contactEmail: true, ownerId: true },
    })
    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id
    tally.seen += rows.length

    // one address may own a hundred rows — resolve each only once per pass
    const wanted = new Map<string, Row[]>()
    for (const row of rows) {
      const email = usableEmail(row.email) ?? usableEmail(row.contactEmail)
      if (!email) {
        tally.noEmail++
        continue
      }
      if (adminEmails.has(email)) {
        tally.admin++
        continue
      }
      const group = wanted.get(email)
      if (group) group.push(row)
      else wanted.set(email, [row])
    }

    const emails = [...wanted.keys()]
    if (emails.length > 0) {
      const known = await db.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      })
      const byEmail = new Map(known.map((u) => [u.email, u.id]))

      if (dry) {
        tally.created += emails.filter((e) => !byEmail.has(e)).length
        for (const [email, group] of wanted) {
          const id = byEmail.get(email)
          for (const row of group) {
            if (id && row.ownerId === id) tally.already++
            else tally.moved++
          }
        }
      } else {
        // Accounts first, so nothing points at an owner that does not exist
        // yet. BUSINESS from the start and no password — the welcome mail's
        // link is the only way in, exactly as for a properly imported listing.
        const missing = emails.filter((e) => !byEmail.has(e))
        if (missing.length > 0) {
          const { count } = await db.user.createMany({
            data: missing.map((email) => ({ email, role: 'BUSINESS' as const })),
            skipDuplicates: true,
          })
          tally.created += count

          const fresh = await db.user.findMany({
            where: { email: { in: missing } },
            select: { id: true, email: true },
          })
          for (const u of fresh) byEmail.set(u.email, u.id)
        }

        const updates = []
        for (const [email, group] of wanted) {
          const ownerId = byEmail.get(email)
          if (!ownerId) continue // a create that lost a race; the next run catches it
          const moving = group.filter((row) => row.ownerId !== ownerId)
          tally.already += group.length - moving.length
          if (moving.length === 0) continue
          updates.push(
            db.business.updateMany({
              where: { id: { in: moving.map((r) => r.id) } },
              data: { ownerId },
            }),
          )
          tally.moved += moving.length
        }
        if (updates.length > 0) await db.$transaction(updates)
      }

      console.log(
        `${tally.seen} seen — ${dry ? 'would move' : 'moved'} ${tally.moved}, new owners ` +
          `${tally.created}, already right ${tally.already}, no address ${tally.noEmail}, ` +
          `admin's own ${tally.admin}`,
      )
    }

    if (tally.moved >= cap) break
  }

  console.log(
    `\n${dry ? 'Would move' : 'Moved'} ${tally.moved} listing(s) onto ${tally.created} new owner ` +
      `account(s). Left alone: ${tally.already} already right, ${tally.noEmail} with no usable ` +
      `address, ${tally.admin} on an admin's address.`,
  )
  if (tally.noEmail > 0) {
    console.log('Listings with no usable address keep their present owner — nobody to write to.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
