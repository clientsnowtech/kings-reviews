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
 * Only for listings an admin or a CSV import put here (addedByAdmin). Somebody
 * who registered their own business gets the plain decision mail instead — they
 * already have an account, and telling them to set a password for a listing
 * they just filed in reads as a stranger's mail.
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
   * Only mail accounts that cannot log in by any route — no password and no
   * Google sign-in behind them. For those the mail is doing real work;
   * everyone else would be getting an unasked-for password link. The script
   * turns this off deliberately.
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
      googleAt: true,
      businesses: {
        where: { status: 'LIVE', addedByAdmin: true },
        orderBy: { createdAt: 'asc' },
        select: { name: true, city: true, slug: true },
      },
    },
  })
  if (!owner) return 'skipped'

  // Nothing an admin put here is public yet — either the mail would link to a
  // 404, or every live listing of theirs is one they added themselves, and
  // those owners are not this mail's audience.
  if (owner.businesses.length === 0) return 'skipped'

  // Locked means there is no way in at all. A Google owner has no password
  // either, but signs in whenever they like — pushing a set-password link at
  // them reads as a stranger's account, so they count as unlocked.
  const locked = owner.password === null && owner.googleAt === null
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
      ...(lockedOnly ? { password: null, googleAt: null } : {}),
      businesses: { some: { status: 'LIVE', addedByAdmin: true } },
    },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  })
  return owners.map((o) => o.email).filter(Boolean)
}
