import nodemailer, { type Transporter } from 'nodemailer'
import { db } from './db'
import { loadMailConfig, type MailConfig } from './mail-settings'
import { shell, p, small, button, linkLine, panel, bullets, stars, esc } from './mail-template'

/**
 * Outbound mail. Everything here is optional: with no SMTP settings the calls
 * turn into a log line, because a missing mail server must never stop someone
 * from posting a review or an owner from approving one.
 *
 * Settings come from Admin → Communication first (lib/mail-settings.ts), and
 * from the environment when nothing has been saved there — either SMTP_URL
 * ("smtps://user:pass@host:465") or the SMTP_HOST / SMTP_PORT / SMTP_USER /
 * SMTP_PASS quartet, plus MAIL_FROM.
 */
type Built = { transport: Transporter; from: string } | null

/**
 * The transport is cached against the settings it was built from, so a key
 * rotated in the panel takes effect on the next send rather than the next
 * restart — a restart being something only the host can do here.
 */
let cache: { signature: string; built: Built } | null = null

function fromLine(name: string, email: string): string {
  return name ? `${name} <${email}>` : email
}

function fromEnv(): { config: MailConfig | null; url?: string } {
  const { SMTP_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env
  if (SMTP_URL) return { config: null, url: SMTP_URL }
  if (!SMTP_HOST) return { config: null }
  return {
    config: {
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      username: SMTP_USER ?? '',
      password: SMTP_PASS ?? '',
      // MAIL_FROM is already a whole "Name <address>" line, so it goes through
      // as the address with no display name of its own
      fromName: '',
      fromEmail: MAIL_FROM ?? 'Kings Reviews <no-reply@localhost>',
      enabled: true,
    },
  }
}

async function mailer(): Promise<Built> {
  const saved = await loadMailConfig()
  const env = saved ? { config: null, url: undefined } : fromEnv()

  const signature = saved
    ? `db:${saved.enabled}:${saved.host}:${saved.port}:${saved.username}:${saved.password.length}:${saved.fromName}:${saved.fromEmail}`
    : env.url
      ? `url:${env.url}`
      : env.config
        ? `env:${env.config.host}:${env.config.port}:${env.config.username}:${env.config.fromEmail}`
        : 'none'

  if (cache?.signature === signature) return cache.built

  let built: Built = null
  if (saved && saved.enabled && saved.host) {
    built = {
      transport: nodemailer.createTransport({
        host: saved.host,
        port: saved.port,
        // 465 is the implicit-TLS port; 587 upgrades through STARTTLS, which
        // nodemailer does on its own
        secure: saved.port === 465,
        auth: saved.username ? { user: saved.username, pass: saved.password } : undefined,
      }),
      from: fromLine(saved.fromName, saved.fromEmail || saved.username),
    }
  } else if (env.url) {
    built = {
      transport: nodemailer.createTransport(env.url),
      from: process.env.MAIL_FROM ?? 'Kings Reviews <no-reply@localhost>',
    }
  } else if (env.config) {
    const c = env.config
    built = {
      transport: nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.port === 465,
        auth: c.username ? { user: c.username, pass: c.password } : undefined,
      }),
      from: c.fromEmail,
    }
  }

  cache = { signature, built }
  return built
}

/** Drops the cached transport — the settings form calls this after a save. */
export function forgetMailer() {
  cache = null
}

export type Mail = {
  to: string
  subject: string
  text: string
  /**
   * The branded body. Optional in the type so a caller can still send something
   * plain, but every builder below writes one — and `text` is always sent with
   * it, for the clients and the people who want mail without the decoration.
   */
  html?: string
  /** files to send along — the printable QR card is mailed this way */
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}

export type MailResult = { ok: boolean; skipped: boolean; error?: string }

/** Keeps the log to a size a person can read, and the table to one a host can. */
const LOG_KEEP = 500

/**
 * A set-password link is a working key to somebody's account, and this log is
 * read by every admin and carried in every database dump. The stored preview
 * keeps the mail's shape and loses the token.
 */
function redact(html: string): string {
  return html.replace(/(\/set-password\/)[^\s"'<>]+/g, '$1&hellip;')
}

async function record(
  to: string,
  subject: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  error?: string,
  html?: string,
) {
  try {
    const row = await db.emailLog.create({
      data: {
        to: to || '—',
        subject,
        status,
        error: error ?? null,
        html: html ? redact(html) : null,
      },
      select: { id: true },
    })
    // pruned on the way past rather than on a schedule: one delete every fifty
    // sends costs nothing, and nothing else here runs on a timer
    if (row.id % 50 === 0) {
      const cutoff = await db.emailLog.findMany({
        orderBy: { id: 'desc' },
        skip: LOG_KEEP,
        take: 1,
        select: { id: true },
      })
      if (cutoff[0]) await db.emailLog.deleteMany({ where: { id: { lte: cutoff[0].id } } })
    }
  } catch (err) {
    // the log is a convenience; it must never be why a notification fails
    console.error('[mail log failed]', err)
  }
}

/** Fire-and-forget: a failed notification is logged, never thrown. */
export async function sendMail({ to, subject, text, html, attachments }: Mail): Promise<MailResult> {
  const built = await mailer()
  if (!built || !to) {
    console.info(`[mail skipped] ${to || 'no address'} — ${subject}`)
    // the body is kept even for a skip — it is the only way to see what would
    // have gone out once the settings are finally in place
    await record(to, subject, 'SKIPPED', to ? 'No SMTP settings' : 'No recipient address', html)
    return { ok: false, skipped: true }
  }
  try {
    await built.transport.sendMail({ from: built.from, to, subject, text, html, attachments })
    await record(to, subject, 'SENT', undefined, html)
    return { ok: true, skipped: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mail failed]', subject, err)
    await record(to, subject, 'FAILED', message, html)
    return { ok: false, skipped: false, error: message }
  }
}

const site = () => process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? ''

export function reviewPendingMail(args: {
  to: string
  businessName: string
  rating: number
  days: number
}): Mail {
  const url = `${site()}/business/dashboard/reviews?s=pending`
  return {
    to: args.to,
    subject: `New review for ${args.businessName} — waiting for you`,
    text: [
      `Someone left a ${args.rating}-star review for ${args.businessName}.`,
      '',
      `It stays hidden until you approve it, and publishes on its own after ${args.days} days if you do nothing.`,
      url,
    ].join('\n'),
    html: shell({
      subject: `New review for ${args.businessName}`,
      preheader: `A ${args.rating}-star review is waiting for your approval.`,
      heading: 'A new review is waiting for you',
      body: [
        p(`Someone left a review for <strong>${esc(args.businessName)}</strong>.`),
        p(stars(args.rating)),
        panel(
          `It stays hidden until you approve it, and publishes on its own after <strong>${args.days} days</strong> if you do nothing.`,
        ),
        button('Read the review', url),
      ].join('\n'),
    }),
  }
}

/** Someone listed a business and it is sitting in the approval queue. */
export function businessSubmittedMail(args: {
  to: string
  businessName: string
  city: string
  ownerEmail: string
}): Mail {
  return {
    to: args.to,
    subject: `New listing waiting for approval — ${args.businessName}`,
    text: [
      `${args.businessName} (${args.city}) was listed by ${args.ownerEmail}.`,
      '',
      'Nothing of it is public until someone approves it.',
      `${site()}/admin/businesses?status=PENDING`,
    ].join('\n'),
    html: shell({
      subject: `New listing waiting for approval — ${args.businessName}`,
      preheader: `${args.businessName} (${args.city}) is in the approval queue.`,
      heading: 'A listing is waiting for approval',
      body: [
        p(
          `<strong>${esc(args.businessName)}</strong> (${esc(args.city)}) was listed by ${esc(
            args.ownerEmail,
          )}.`,
        ),
        panel('Nothing of it is public until someone approves it.'),
        button('Open the queue', `${site()}/admin/businesses?status=PENDING`),
      ].join('\n'),
    }),
  }
}

/** What the owner hears back once an admin has looked at the listing. */
export function businessDecisionMail(args: {
  to: string
  businessName: string
  status: 'LIVE' | 'REJECTED' | 'SUSPENDED' | 'PENDING'
  slug: string
}): Mail {
  if (args.status === 'LIVE') {
    return {
      to: args.to,
      subject: `${args.businessName} is live on Kings Reviews`,
      text: [
        'Your listing is approved and public now.',
        `${site()}/company/${args.slug}`,
        '',
        'Next step: ask your customers for reviews from the dashboard.',
        `${site()}/business/dashboard`,
      ].join('\n'),
      html: shell({
        subject: `${args.businessName} is live on Kings Reviews`,
        preheader: 'Your listing is approved and public now.',
        heading: `${args.businessName} is live`,
        body: [
          p('Your listing is approved and public now.'),
          button('View your listing', `${site()}/company/${args.slug}`),
          panel(
            'Next step: ask your customers for reviews from the dashboard. Every review makes the page worth more to the people who find it.',
          ),
          linkLine('Dashboard:', `${site()}/business/dashboard`),
        ].join('\n'),
      }),
    }
  }

  const why =
    args.status === 'REJECTED'
      ? 'It was not approved, so it is not public.'
      : args.status === 'SUSPENDED'
        ? 'It has been suspended and is no longer public.'
        : 'It is back in the approval queue and is not public right now.'

  return {
    to: args.to,
    subject: `${args.businessName} — listing update`,
    text: [
      why,
      '',
      'Write to us if you think this is a mistake, or edit the listing and it will be looked at again.',
      `${site()}/business/dashboard/businesses`,
    ].join('\n'),
    html: shell({
      subject: `${args.businessName} — listing update`,
      preheader: why,
      heading: `${args.businessName} — listing update`,
      body: [
        p(why),
        p(
          'Write to us if you think this is a mistake, or edit the listing and it will be looked at again.',
        ),
        button('Open your listings', `${site()}/business/dashboard/businesses`),
      ].join('\n'),
    }),
  }
}

/**
 * Someone else listed this business and named this address as its owner.
 *
 * Without this the account exists but nobody knows it does — the listing sits
 * there unclaimed and the owner never hears that they can run it.
 */
export function businessClaimMail(args: {
  to: string
  businessName: string
  city: string
  slug: string
}): Mail {
  return {
    to: args.to,
    subject: `${args.businessName} is listed on Kings Reviews — claim it`,
    text: [
      `We added ${args.businessName} (${args.city}) to Kings Reviews and put this address down as its owner.`,
      `${site()}/company/${args.slug}`,
      '',
      'Sign in with this email to claim it — you can then edit the listing, reply to reviews and print a QR card that asks customers for one.',
      `${site()}/login`,
    ].join('\n'),
    html: shell({
      subject: `${args.businessName} is listed on Kings Reviews — claim it`,
      preheader: `${args.businessName} (${args.city}) is on Kings Reviews with this address as its owner.`,
      heading: `${args.businessName} is on Kings Reviews`,
      body: [
        p(
          `We added <strong>${esc(args.businessName)}</strong> (${esc(
            args.city,
          )}) to Kings Reviews and put this address down as its owner.`,
        ),
        linkLine('The page:', `${site()}/company/${args.slug}`),
        panel(
          'Sign in with this email to claim it. You can then edit the listing, reply to reviews and print a QR card that asks customers for one.',
        ),
        button('Claim the listing', `${site()}/login`),
      ].join('\n'),
    }),
  }
}

/**
 * The welcome, sent to the owner of a listing somebody else added.
 *
 * An admin-created account has no password, so the login form rejects it and
 * the register form says the email is taken. For those the set-password link is
 * the whole point of the mail — without it the owner cannot get in at all. An
 * owner who can already sign in, by password or through Google, gets the same
 * mail minus the link.
 */
export function ownerWelcomeMail(args: {
  to: string
  businesses: { name: string; city: string; slug: string }[]
  /** null for an account that already has a password — it needs no link */
  url: string | null
  days: number
}): Mail {
  const [first] = args.businesses
  const more = args.businesses.length - 1

  return {
    to: args.to,
    subject: args.url
      ? more > 0
        ? 'Your listings on Kings Reviews — set your password'
        : `${first.name} is on Kings Reviews — set your password`
      : more > 0
        ? 'Your listings on Kings Reviews'
        : `${first.name} is on Kings Reviews`,
    text: [
      more > 0
        ? `${first.name} (${first.city}) and ${more} other ${
            more === 1 ? 'listing' : 'listings'
          } are on Kings Reviews with this address down as the owner.`
        : `${first.name} (${first.city}) is listed on Kings Reviews with this address down as the owner.`,
      '',
      ...(args.url
        ? ['Set your password here and the account is yours:', args.url, `The link works for ${args.days} days.`]
        : ['Log in with this address to manage it:', `${site()}/login`]),
      '',
      'Once you are in you can edit the listing, reply to reviews and print a QR card that asks customers for one.',
      ...args.businesses.map((b) => `${site()}/company/${b.slug}`),
      '',
      `Dashboard: ${site()}/business/dashboard`,
      '',
      args.url
        ? 'If this was not meant for you, ignore this mail — nothing changes until the password is set.'
        : 'If this was not meant for you, write to us and we will take the listing down.',
    ].join('\n'),
    html: shell({
      subject: `${first.name} on Kings Reviews`,
      preheader: args.url
        ? 'Set your password and the account is yours.'
        : 'Log in with this address to manage your listing.',
      heading:
        more > 0 ? 'Your listings are on Kings Reviews' : `${first.name} is on Kings Reviews`,
      body: [
        p(
          more > 0
            ? `<strong>${esc(first.name)}</strong> (${esc(first.city)}) and ${more} other ${
                more === 1 ? 'listing' : 'listings'
              } are on Kings Reviews with this address down as the owner.`
            : `<strong>${esc(first.name)}</strong> (${esc(
                first.city,
              )}) is listed on Kings Reviews with this address down as the owner.`,
        ),
        ...(args.url
          ? [
              p('Set your password and the account is yours:'),
              button('Set your password', args.url),
              small(`The link works for ${args.days} days.`),
            ]
          : [p('Log in with this address to manage it:'), button('Log in', `${site()}/login`)]),
        panel(
          'Once you are in you can edit the listing, reply to reviews and print a QR card that asks customers for one.',
        ),
        // Named rather than listed as bare URLs: an owner with six listings
        // cannot tell six slugs apart, but knows their own shop names.
        bullets(
          args.businesses.map(
            (b) =>
              `<a href="${site()}/company/${esc(b.slug)}" style="color:#0c785d;">${esc(
                b.name,
              )}</a> <span style="color:#5b6f67;">&middot; ${esc(b.city)}</span>`,
          ),
        ),
        linkLine('Dashboard:', `${site()}/business/dashboard`),
        small(
          args.url
            ? 'If this was not meant for you, ignore this mail — nothing changes until the password is set.'
            : 'If this was not meant for you, write to us and we will take the listing down.',
        ),
      ].join('\n'),
    }),
  }
}

/** The printable QR card, mailed as a real attachment. */
export function reviewCardMail(args: {
  to: string
  businessName: string
  url: string
  card: Buffer
  filename: string
}): Mail {
  return {
    to: args.to,
    subject: `Your review QR card — ${args.businessName}`,
    text: [
      `The card is attached. Print it for the counter, the receipt or the packaging.`,
      '',
      'A phone camera on the code opens your review page:',
      args.url,
      '',
      'Print it at 3 cm or bigger and never stretch it — a squashed code stops scanning.',
    ].join('\n'),
    html: shell({
      subject: `Your review QR card — ${args.businessName}`,
      preheader: 'The printable card is attached to this mail.',
      heading: 'Your review QR card',
      body: [
        p(
          `The card for <strong>${esc(
            args.businessName,
          )}</strong> is attached. Print it for the counter, the receipt or the packaging.`,
        ),
        p('A phone camera on the code opens your review page:'),
        linkLine('Review page:', args.url),
        panel(
          'Print it at 3 cm or bigger and never stretch it — a squashed code stops scanning.',
        ),
      ].join('\n'),
    }),
    attachments: [{ filename: args.filename, content: args.card, contentType: 'image/png' }],
  }
}

export function reviewDecidedMail(args: {
  to: string
  businessName: string
  approved: boolean
  reason?: string | null
  slug: string
}): Mail {
  return {
    to: args.to,
    subject: args.approved
      ? `Your review of ${args.businessName} is live`
      : `Your review of ${args.businessName} was not published`,
    text: args.approved
      ? ['It is on the profile now — thanks for writing it.', `${site()}/company/${args.slug}`].join(
          '\n',
        )
      : [
          `${args.businessName} did not publish your review.`,
          `Reason: ${args.reason ?? 'No reason given.'}`,
          '',
          'You can rewrite it and submit again, and our team reviews rejections.',
          `${site()}/my/reviews`,
        ].join('\n'),
    html: args.approved
      ? shell({
          subject: `Your review of ${args.businessName} is live`,
          preheader: 'It is on the profile now — thanks for writing it.',
          heading: 'Your review is live',
          body: [
            p(
              `It is on the profile of <strong>${esc(
                args.businessName,
              )}</strong> now — thanks for writing it.`,
            ),
            button('See it on the profile', `${site()}/company/${args.slug}`),
          ].join('\n'),
        })
      : shell({
          subject: `Your review of ${args.businessName} was not published`,
          preheader: `${args.businessName} did not publish your review.`,
          heading: 'Your review was not published',
          body: [
            p(`<strong>${esc(args.businessName)}</strong> did not publish your review.`),
            // The reason is the whole mail — a rejection without one reads as a
            // review that silently disappeared.
            panel(`<strong>Reason:</strong> ${esc(args.reason ?? 'No reason given.')}`),
            p('You can rewrite it and submit again, and our team reviews rejections.'),
            button('Your reviews', `${site()}/my/reviews`),
          ].join('\n'),
        }),
  }
}
