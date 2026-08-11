/**
 * Sends every notification the site can send, to one address, with made-up
 * listing data. For seeing what actually lands in an inbox without approving a
 * real business or rejecting somebody's review.
 *
 *   npm run mail:demo -- --to=you@example.com
 *   npm run mail:demo -- --to=you@example.com --only=welcome,live
 *   npm run mail:demo -- --print                 # subjects and text, send nothing
 *   npm run mail:demo -- --save=./tmp/mails      # write the HTML for a browser
 *
 * Nothing here touches an account: the set-password link is a placeholder
 * rather than a real token, so a demo cannot invalidate an owner's live invite.
 * Clicking it lands on the expired-link page, which is the honest thing for it
 * to do.
 */
// before anything touches the database or the mail settings
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  sendMail,
  type Mail,
  ownerWelcomeMail,
  businessDecisionMail,
  businessSubmittedMail,
  businessClaimMail,
  reviewPendingMail,
  reviewDecidedMail,
  reviewCardMail,
} from '../src/lib/mail'
import { reviewPosterSvg } from '../src/lib/review-qr'
import { setPasswordUrl, SET_PASSWORD_TTL_DAYS } from '../src/lib/password-token'
import { db } from '../src/lib/db'

const flags = process.argv.slice(2)
const has = (name: string) => flags.includes(`--${name}`)
const value = (name: string) =>
  flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? ''

const DEMO = { name: 'Tele IT Solutions', city: 'Indore', slug: 'tele-it-solutions' }
const SECOND = { name: 'Divine Experts', city: 'Ahmedabad', slug: 'divine-experts' }

/**
 * The real card, rasterised the way the dashboard's does it.
 *
 * The app draws the poster in the browser through canvas; a script has no
 * canvas, so it goes through sharp — which ships with Next rather than being
 * asked for by name here. If that import ever stops resolving, this returns
 * null and the card mail is dropped from the run: a demo attaching a fake QR
 * code teaches the reader nothing about the card and everything wrong about it.
 */
async function realCard(): Promise<Buffer | null> {
  try {
    const sharp = (await import('sharp')).default
    const svg = reviewPosterSvg({
      name: DEMO.name,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${DEMO.slug}`,
    })
    return await sharp(Buffer.from(svg)).png().toBuffer()
  } catch (err) {
    console.log(`no card: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

/** Every mail, keyed by the name --only matches against. */
function everyMail(to: string, card: Buffer | null): { key: string; mail: Mail }[] {
  return [
    {
      key: 'welcome',
      mail: ownerWelcomeMail({
        to,
        businesses: [DEMO],
        url: setPasswordUrl('demo-link-not-a-real-token'),
        days: SET_PASSWORD_TTL_DAYS,
      }),
    },
    {
      key: 'welcome-many',
      mail: ownerWelcomeMail({
        to,
        businesses: [DEMO, SECOND],
        url: null,
        days: SET_PASSWORD_TTL_DAYS,
      }),
    },
    {
      key: 'live',
      mail: businessDecisionMail({
        to,
        businessName: DEMO.name,
        status: 'LIVE',
        slug: DEMO.slug,
      }),
    },
    {
      key: 'rejected',
      mail: businessDecisionMail({
        to,
        businessName: DEMO.name,
        status: 'REJECTED',
        slug: DEMO.slug,
      }),
    },
    {
      key: 'claim',
      mail: businessClaimMail({ to, businessName: DEMO.name, city: DEMO.city, slug: DEMO.slug }),
    },
    {
      key: 'submitted',
      mail: businessSubmittedMail({
        to,
        businessName: DEMO.name,
        city: DEMO.city,
        ownerEmail: 'owner@example.in',
      }),
    },
    { key: 'review-pending', mail: reviewPendingMail({ to, businessName: DEMO.name, rating: 4, days: 7 }) },
    {
      key: 'review-live',
      mail: reviewDecidedMail({ to, businessName: DEMO.name, approved: true, slug: DEMO.slug }),
    },
    {
      key: 'review-rejected',
      mail: reviewDecidedMail({
        to,
        businessName: DEMO.name,
        approved: false,
        reason: 'It named a member of staff, which our guidelines do not allow.',
        slug: DEMO.slug,
      }),
    },
    // dropped entirely when the card could not be drawn — see realCard()
    ...(card
      ? [
          {
            key: 'qr-card',
            mail: reviewCardMail({
              to,
              businessName: DEMO.name,
              url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/${DEMO.slug}`,
              card,
              filename: `review-card-${DEMO.slug}.png`,
            }),
          },
        ]
      : []),
  ]
}

async function main() {
  const print = has('print')
  const saveTo = value('save').trim()
  const to = value('to').trim() || 'demo@example.com'
  if (!print && !saveTo && !value('to')) {
    console.error('Give an address: npm run mail:demo -- --to=you@example.com')
    process.exitCode = 1
    return
  }

  const wanted = value('only')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const mails = everyMail(to, await realCard()).filter(
    (m) => !wanted.length || wanted.some((w) => m.key.includes(w)),
  )
  if (!mails.length) {
    console.error(`Nothing matched --only=${value('only')}`)
    process.exitCode = 1
    return
  }

  if (saveTo) await mkdir(saveTo, { recursive: true })

  for (const { key, mail } of mails) {
    if (saveTo && mail.html) {
      await writeFile(join(saveTo, `${key}.html`), mail.html, 'utf8')
      console.log(`saved   ${key}.html`)
      // attachments land next to the HTML: the QR card is the one part of a mail
      // you cannot check by reading it — it either scans or it does not
      for (const file of mail.attachments ?? []) {
        await writeFile(join(saveTo, file.filename), file.content)
        console.log(`saved   ${file.filename} (${Math.round(file.content.length / 1024)}kb)`)
      }
    }
    if (print) {
      console.log(`\n--- [${key}] ${mail.subject}\n${mail.text}`)
    }
    if (print || saveTo) continue

    const res = await sendMail(mail)
    console.log(
      `${res.ok ? 'sent   ' : res.skipped ? 'skipped' : 'failed '} [${key}] ${mail.subject}`,
    )
    if (res.error) console.log(`  ${res.error}`)
  }

  if (!print && !saveTo) console.log(`\n${mails.length} mail(s) to ${to}. Admin → Communication has the log.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
