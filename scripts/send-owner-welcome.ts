/**
 * Mails every business owner their welcome — the one-time sweep for listings
 * that were already in the database before this mail existed.
 *
 * The admin panel has a button for the same job, but it works a hundred owners
 * per click; this runs the whole list in one go and prints what happened.
 *
 *   npm run mail:welcome              # every owner: a set-password link for
 *                                     # the locked ones, a plain welcome for
 *                                     # anyone who already has a password
 *   npm run mail:welcome -- --dry     # list who would be mailed, send nothing
 *   npm run mail:welcome -- --locked  # only accounts that cannot log in at all
 *   npm run mail:welcome -- --force   # mail again even if a live link exists
 *   npm run mail:welcome -- --only=owner@shop.in
 *
 * Safe to re-run: without --force an owner who already holds a working link is
 * skipped, and a send that fails leaves no link behind, so the next run retries.
 */
// before anything touches the database or the mail settings
import 'dotenv/config'
import { welcomeCandidates, welcomeOwner } from '../src/lib/owner-welcome'
import { db } from '../src/lib/db'

/** A relay that is fine with a hundred mails will still throttle a thousand. */
const GAP_MS = 250

const flags = process.argv.slice(2)
const has = (name: string) => flags.includes(`--${name}`)
const value = (name: string) =>
  flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? ''

async function main() {
  const dry = has('dry')
  const force = has('force')
  // everyone hears from us once by default — --locked narrows it to the
  // accounts that have no way in at all
  const lockedOnly = has('locked')
  const only = value('only').trim().toLowerCase()

  const emails = only ? [only] : await welcomeCandidates(lockedOnly)
  if (emails.length === 0) {
    console.log('No owners to mail.')
    return
  }

  console.log(
    `${emails.length} owner(s) to mail — ${lockedOnly ? 'passwordless only' : 'everyone'}${
      force ? ', forcing a resend' : ''
    }${dry ? ' (dry run)' : ''}.`,
  )

  if (dry) {
    for (const email of emails) console.log(`  would mail ${email}`)
    return
  }

  const tally = { sent: 0, skipped: 0, failed: 0 }
  for (const [i, email] of emails.entries()) {
    const outcome = await welcomeOwner(email, { force, lockedOnly })
    tally[outcome]++
    console.log(`[${i + 1}/${emails.length}] ${outcome.padEnd(7)} ${email}`)
    if (i < emails.length - 1) await new Promise((r) => setTimeout(r, GAP_MS))
  }

  console.log(`\nSent ${tally.sent}, skipped ${tally.skipped}, failed ${tally.failed}.`)
  if (tally.failed > 0) {
    console.log('Failed owners kept no link, so running this again retries them.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
