import { createHash, randomBytes } from 'crypto'
import { db } from './db'

/**
 * One-time links that let an account set its first password.
 *
 * Listings added by an admin get an owner account with no password at all, so
 * their owner can only ever sign in through Google — and half of them use a
 * mailbox Google has never heard of. The welcome mail carries a link built
 * here instead, which is the only way into those accounts.
 *
 * Rows live in NextAuth's VerificationToken table (unused otherwise), and only
 * the hash of the token is stored: a leaked database still cannot log anyone in.
 */
const PREFIX = 'set-password:'

/** Long enough that an owner who opens the mail a week later is not locked out. */
export const SET_PASSWORD_TTL_DAYS = 14

const digest = (token: string) => createHash('sha256').update(token).digest('hex')

/** Mints a link token for an email, retiring any earlier one it had. */
export async function issueSetPasswordToken(email: string): Promise<string> {
  const identifier = PREFIX + email
  const token = randomBytes(32).toString('base64url')

  // one live link per address — a second mail must not leave the first working
  await db.verificationToken.deleteMany({ where: { identifier } })
  await db.verificationToken.create({
    data: {
      identifier,
      token: digest(token),
      expires: new Date(Date.now() + SET_PASSWORD_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  return token
}

/** The address a link belongs to, or null when it is unknown or expired. */
export async function emailForSetPasswordToken(token: string): Promise<string | null> {
  if (!token) return null
  const hashed = digest(token)

  const row = await db.verificationToken.findUnique({ where: { token: hashed } })
  if (!row || !row.identifier.startsWith(PREFIX)) return null

  if (row.expires.getTime() < Date.now()) {
    await db.verificationToken.deleteMany({ where: { token: hashed } })
    return null
  }
  return row.identifier.slice(PREFIX.length)
}

/** Same check, but the link is spent — a set password must not be re-settable. */
export async function consumeSetPasswordToken(token: string): Promise<string | null> {
  const email = await emailForSetPasswordToken(token)
  if (email) await db.verificationToken.deleteMany({ where: { token: digest(token) } })
  return email
}

/**
 * Throws away an address's link. The mail that carried it never arrived, so
 * the invite must not count as sent — otherwise the next run skips this owner
 * and nobody ever gets in.
 */
export async function revokeSetPasswordToken(email: string): Promise<void> {
  await db.verificationToken.deleteMany({ where: { identifier: PREFIX + email } })
}

/** Which of these addresses already hold a link that still works. */
export async function alreadyInvited(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()

  const rows = await db.verificationToken.findMany({
    where: {
      identifier: { in: emails.map((e) => PREFIX + e) },
      expires: { gt: new Date() },
    },
    select: { identifier: true },
  })
  return new Set(rows.map((r) => r.identifier.slice(PREFIX.length)))
}

/** The page an owner opens from the mail. */
export function setPasswordUrl(token: string): string {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? ''
  return `${site}/set-password/${token}`
}
