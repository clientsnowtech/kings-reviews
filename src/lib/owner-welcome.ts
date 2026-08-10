import { db } from './db'
import { sendMail, ownerWelcomeMail } from './mail'
import {
  alreadyInvited,
  issueSetPasswordToken,
  revokeSetPasswordToken,
  setPasswordUrl,
  SET_PASSWORD_TTL_DAYS,
} from './password-token'

/**
 * The welcome mail an owner gets for a listing they did not add themselves.
 *
 * Three callers share this: the moment a listing goes live, the admin panel's
 * bulk button, and the one-off script. They must not drift — an owner mailed by
 * one path has to count as mailed to the others, which is what the live
 * set-password link stands in for.
 */
export type WelcomeOutcome = 'sent' | 'skipped' | 'failed'

export type WelcomeOptions = {
  /** mail again even if a live link was already issued */
  force?: boolean
  /**
   * Only mail accounts with no password. Those are the ones that cannot log in
   * at all, so the mail is doing real work; everyone else would be getting an
   * unasked-for password link. The script turns this off deliberately.
   */
  lockedOnly?: boolean
}

/** Mails one owner. Never throws — a dead mail server must not fail a save. */
export async function welcomeOwner(
  email: string,
  { force = false, lockedOnly = true }: WelcomeOptions = {},
): Promise<WelcomeOutcome> {
  if (!email) return 'skipped'

  const owner = await db.user.findUnique({
    where: { email },
    select: {
      password: true,
      businesses: {
        where: { status: 'LIVE' },
        orderBy: { createdAt: 'asc' },
        select: { name: true, city: true, slug: true },
      },
    },
  })
  if (!owner) return 'skipped'

  // nothing of theirs is public yet — the mail would link to a 404
  if (owner.businesses.length === 0) return 'skipped'

  const locked = owner.password === null
  if (!locked && lockedOnly) return 'skipped'
  if (locked && !force && (await alreadyInvited([email])).has(email)) return 'skipped'

  const token = locked ? await issueSetPasswordToken(email) : null
  const res = await sendMail(
    ownerWelcomeMail({
      to: email,
      businesses: owner.businesses,
      url: token ? setPasswordUrl(token) : null,
      days: SET_PASSWORD_TTL_DAYS,
    }),
  )

  if (!res.ok) {
    // the link went nowhere, so it must not count as an invite — otherwise the
    // next run skips this owner and nobody ever gets in
    if (locked) await revokeSetPasswordToken(email)
    return 'failed'
  }
  return 'sent'
}

/** Same thing, addressed by listing — what the go-live paths have to hand. */
export async function welcomeOwnerOfBusiness(
  businessId: string,
  options?: WelcomeOptions,
): Promise<WelcomeOutcome> {
  const biz = await db.business.findUnique({
    where: { id: businessId },
    select: { owner: { select: { email: true } } },
  })
  return biz?.owner?.email ? welcomeOwner(biz.owner.email, options) : 'skipped'
}

/** Every owner the mail is meant for, oldest account first. */
export async function welcomeCandidates(lockedOnly = true): Promise<string[]> {
  const owners = await db.user.findMany({
    where: {
      ...(lockedOnly ? { password: null } : {}),
      businesses: { some: { status: 'LIVE' } },
    },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  })
  return owners.map((o) => o.email).filter(Boolean)
}
