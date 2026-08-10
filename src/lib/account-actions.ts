'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { auth } from './auth'
import { saveImages, deleteUploads } from './upload'
import { callerIp, loginAttempt, rateLimit } from './rate-limit'
import { profileSchema, passwordChangeSchema, twoFactorCodeSchema } from './validations'
import { consumeSetPasswordToken } from './password-token'
import {
  generateSecret,
  verifyCode,
  generateBackupCodes,
  hashBackupCodes,
  parseBackupCodes,
  spendBackupCode,
} from './totp'

export type AccountState = {
  error?: string
  ok?: string
  fieldErrors?: Record<string, string>
  /** shown once, right after they are minted — only hashes are kept */
  backupCodes?: string[]
}

function firstErrors(err: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/** Every action here edits the signed-in account and nothing else. */
async function currentUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/my/profile')
  return db.user.findUnique({ where: { id: session.user.id } })
}

// ---------------------------------------------------------------- personal details

export async function updateProfile(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await currentUser()
  if (!user) redirect('/login')

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  const phone = parsed.data.phone?.trim() || null
  if (phone) {
    const clash = await db.user.findFirst({
      where: { phone, NOT: { id: user.id } },
      select: { id: true },
    })
    if (clash) return { fieldErrors: { phone: 'Already used by another account' } }
  }

  // avatar: a new file replaces the old one, the checkbox clears it
  const file = formData.get('avatar')
  const [saved] = file instanceof File && file.size > 0 ? await saveImages([file], 'avatars', 1) : []
  const clearing = formData.get('removeAvatar') === 'on'

  let image = user.image
  if (saved) image = saved
  else if (clearing) image = null

  if (image !== user.image && user.image?.startsWith('/uploads/')) {
    await deleteUploads([user.image])
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone, image },
  })

  revalidatePath('/my/profile')
  revalidatePath('/', 'layout')
  return { ok: 'Profile saved' }
}

// ---------------------------------------------------------------- password

export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await currentUser()
  if (!user) redirect('/login')

  if (!rateLimit(`pwd:${user.id}`, 5, 60_000).ok) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  // A Google-only account has no password yet, so there is nothing to confirm —
  // the live session is the proof. Everyone else types the old one first.
  if (user.password) {
    const ok = await bcrypt.compare(parsed.data.currentPassword ?? '', user.password)
    if (!ok) return { fieldErrors: { currentPassword: 'Wrong password' } }
    if (parsed.data.currentPassword === parsed.data.password) {
      return { fieldErrors: { password: 'Pick a different password' } }
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(parsed.data.password, 10) },
  })

  revalidatePath('/my/security')
  return { ok: user.password ? 'Password changed' : 'Password set' }
}

/**
 * First password, set from the link in the welcome mail.
 *
 * No session is involved: the token in the URL is the proof, which is why it is
 * spent here rather than left usable. Reaching the mailbox also proves the
 * address, so the account is marked verified on the way past.
 */
export async function setPasswordFromToken(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const token = String(formData.get('token') ?? '')

  // guessing a 32-byte token is hopeless, but the endpoint is public and must
  // not be free to hammer either
  if (!rateLimit(`setpwd:${await callerIp()}`, 10, 60_000).ok) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }

  const parsed = passwordChangeSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  const email = await consumeSetPasswordToken(token)
  if (!email) return { error: 'This link has expired or was already used. Ask us for a new one.' }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return { error: 'That account no longer exists.' }

  await db.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(parsed.data.password, 10), emailVerified: new Date() },
  })

  redirect('/login?ready=1')
}

// ---------------------------------------------------------------- two-factor

/** Mints a secret and parks it unconfirmed, so the page can draw the QR. */
export async function startTwoFactor(): Promise<void> {
  const user = await currentUser()
  if (!user || user.twoFactorEnabled) return

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: generateSecret() },
  })
  revalidatePath('/my/security')
}

export async function cancelTwoFactor(): Promise<void> {
  const user = await currentUser()
  if (!user || user.twoFactorEnabled) return

  await db.user.update({ where: { id: user.id }, data: { twoFactorSecret: null } })
  revalidatePath('/my/security')
}

export async function confirmTwoFactor(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (user.twoFactorEnabled) return { error: 'Two-factor is already on' }
  if (!user.twoFactorSecret) return { error: 'Start the setup again' }

  if (!rateLimit(`2fa:${user.id}`, 10, 60_000).ok) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }

  const parsed = twoFactorCodeSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  if (!verifyCode(user.twoFactorSecret, parsed.data.code)) {
    return { fieldErrors: { code: 'That code did not match — check your phone’s clock' } }
  }

  const codes = generateBackupCodes()
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorAt: new Date(),
      twoFactorCodes: JSON.stringify(hashBackupCodes(codes)),
    },
  })

  revalidatePath('/my/security')
  return { ok: 'Two-factor is on', backupCodes: codes }
}

/** Turning it off needs a live code — a borrowed session alone must not do it. */
export async function disableTwoFactor(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!user.twoFactorEnabled) return { error: 'Two-factor is not on' }

  if (!rateLimit(`2fa:${user.id}`, 10, 60_000).ok) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }

  const parsed = twoFactorCodeSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }

  const bySecret = user.twoFactorSecret ? verifyCode(user.twoFactorSecret, parsed.data.code) : false
  const byBackup = spendBackupCode(parseBackupCodes(user.twoFactorCodes), parsed.data.code)
  if (!bySecret && !byBackup) return { fieldErrors: { code: 'Wrong code' } }

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorAt: null,
      twoFactorCodes: null,
    },
  })

  revalidatePath('/my/security')
  return { ok: 'Two-factor is off' }
}

export async function regenerateBackupCodes(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!user.twoFactorEnabled || !user.twoFactorSecret) return { error: 'Two-factor is not on' }

  if (!rateLimit(`2fa:${user.id}`, 10, 60_000).ok) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }

  const parsed = twoFactorCodeSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) }
  if (!verifyCode(user.twoFactorSecret, parsed.data.code)) {
    return { fieldErrors: { code: 'Wrong code' } }
  }

  const codes = generateBackupCodes()
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorCodes: JSON.stringify(hashBackupCodes(codes)) },
  })

  revalidatePath('/my/security')
  return { ok: 'New backup codes — the old ones no longer work', backupCodes: codes }
}

// ---------------------------------------------------------------- login helper

/**
 * Tells the login form whether to ask for a second factor before it calls
 * signIn(). It only ever answers "twoFactor" for a correct password, so it
 * gives away nothing the password does not already give away.
 */
export async function loginPrecheck(
  email: string,
  password: string,
): Promise<'ok' | 'twoFactor' | 'invalid'> {
  const key = email.trim().toLowerCase()
  // Shares its allowance with the credentials provider — see loginAttempt().
  if (!loginAttempt(key, await callerIp())) return 'invalid'

  const user = await db.user.findUnique({
    where: { email: key },
    select: { password: true, twoFactorEnabled: true },
  })
  if (!user?.password) return 'invalid'
  if (!(await bcrypt.compare(password, user.password))) return 'invalid'
  return user.twoFactorEnabled ? 'twoFactor' : 'ok'
}
