/**
 * The daily drip of set-password mails.
 *
 * Every listing an admin or a CSV import filed has an owner account with no
 * password, so its owner cannot log in at all until a link reaches them. There
 * are thousands of those and Brevo's plan carries 300 mails a day, so this
 * takes the oldest 280 still waiting and leaves the rest for tomorrow. The
 * margin covers the day's ordinary mail — review alerts, admin tests.
 *
 * Each owner is mailed once and only once: a send the relay accepted stamps
 * welcomeMailedAt, and nothing here looks at a stamped account again. A send
 * that failed leaves no stamp and no link, so it comes back round tomorrow.
 *
 *   npm run mail:welcome-daily              # send today's batch
 *   npm run mail:welcome-daily -- --dry     # list who would be mailed
 *   npm run mail:welcome-daily -- --limit=50
 *
 * Cron: scripts/daily-welcome.sh, once a day.
 */
// before anything touches the database or the mail settings
import 'dotenv/config'
import { backfillWelcomeMailed, pendingWelcomeOwners, welcomeOwner } from '../src/lib/owner-welcome'
import { db } from '../src/lib/db'

/** 300 a day on the Brevo plan, minus room for the site's own traffic. */
const DEFAULT_LIMIT = 280

/** A relay that is fine with a hundred mails will still throttle a thousand. */
const GAP_MS = 250

const flags = process.argv.slice(2)
const has = (name: string) => flags.includes(`--${name}`)
const value = (name: string) =>
  flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? ''

function limitFromArgs(): number {
  const raw = value('limit') || process.env.MAIL_DAILY_WELCOME_LIMIT || ''
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_LIMIT
}

async function main() {
  const dry = has('dry')
  const limit = limitFromArgs()

  // owners welcomed before the stamp column existed must not be greeted twice
  const stamped = await backfillWelcomeMailed()
  if (stamped > 0) console.log(`Marked ${stamped} owner(s) as already welcomed earlier.`)

  const emails = await pendingWelcomeOwners(limit)
  if (emails.length === 0) {
    console.log('Nobody left to welcome today.')
    return
  }

  console.log(`${emails.length} owner(s) to mail today (cap ${limit})${dry ? ' — dry run' : ''}.`)
  if (dry) {
    for (const email of emails) console.log(`  would mail ${email}`)
    return
  }

  const tally = { sent: 0, skipped: 0, failed: 0 }
  for (const [i, email] of emails.entries()) {
    const outcome = await welcomeOwner(email)
    tally[outcome]++
    console.log(`[${i + 1}/${emails.length}] ${outcome.padEnd(7)} ${email}`)
    if (i < emails.length - 1) await new Promise((r) => setTimeout(r, GAP_MS))
  }

  console.log(`\nSent ${tally.sent}, skipped ${tally.skipped}, failed ${tally.failed}.`)
  if (tally.failed > 0) console.log('Failed owners kept no stamp, so tomorrow retries them.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
