import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Outbound mail. Everything here is optional: with no SMTP settings the calls
 * turn into a log line, because a missing mail server must never stop someone
 * from posting a review or an owner from approving one.
 *
 * Configure with either SMTP_URL ("smtps://user:pass@host:465") or the
 * SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS quartet, plus MAIL_FROM.
 */
let transport: Transporter | null | undefined

function mailer(): Transporter | null {
  if (transport !== undefined) return transport

  const { SMTP_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (SMTP_URL) {
    transport = nodemailer.createTransport(SMTP_URL)
  } else if (SMTP_HOST) {
    const port = Number(SMTP_PORT ?? 587)
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS ?? '' } : undefined,
    })
  } else {
    transport = null
  }
  return transport
}

export type Mail = {
  to: string
  subject: string
  text: string
  /** files to send along — the printable QR card is mailed this way */
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}

/** Fire-and-forget: a failed notification is logged, never thrown. */
export async function sendMail({ to, subject, text, attachments }: Mail): Promise<void> {
  const t = mailer()
  if (!t || !to) {
    console.info(`[mail skipped] ${to || 'no address'} — ${subject}`)
    return
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM ?? 'TrustIndex <no-reply@localhost>',
      to,
      subject,
      text,
      attachments,
    })
  } catch (err) {
    console.error('[mail failed]', subject, err)
  }
}

const site = () => process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? ''

export function reviewPendingMail(args: {
  to: string
  businessName: string
  rating: number
  days: number
}): Mail {
  return {
    to: args.to,
    subject: `New review for ${args.businessName} — waiting for you`,
    text: [
      `Someone left a ${args.rating}-star review for ${args.businessName}.`,
      '',
      `It stays hidden until you approve it, and publishes on its own after ${args.days} days if you do nothing.`,
      `${site()}/business/dashboard/reviews?s=pending`,
    ].join('\n'),
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
      subject: `${args.businessName} is live on TrustIndex`,
      text: [
        'Your listing is approved and public now.',
        `${site()}/company/${args.slug}`,
        '',
        'Next step: ask your customers for reviews from the dashboard.',
        `${site()}/business/dashboard`,
      ].join('\n'),
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
    subject: `${args.businessName} is listed on TrustIndex — claim it`,
    text: [
      `We added ${args.businessName} (${args.city}) to TrustIndex and put this address down as its owner.`,
      `${site()}/company/${args.slug}`,
      '',
      'Sign in with this email to claim it — you can then edit the listing, reply to reviews and print a QR card that asks customers for one.',
      `${site()}/login`,
    ].join('\n'),
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
  }
}
