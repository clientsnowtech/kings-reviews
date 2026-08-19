import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { db } from './db'

/**
 * SMTP settings kept in the database and edited from Admin → Communication.
 *
 * The environment variables still work and are what sends mail until this row
 * is saved — but a key pasted into the panel beats a deploy, and on this host
 * a deploy is the only other way to change one.
 */
export type MailConfig = {
  host: string
  port: number
  username: string
  password: string
  fromName: string
  fromEmail: string
  enabled: boolean
}

/** What the admin form is allowed to see: everything but the key itself. */
export type MailSettingsView = Omit<MailConfig, 'password'> & {
  hasPassword: boolean
  updatedAt: Date | null
  /** false until a row exists — until then the environment is what sends mail */
  saved: boolean
}

/** Brevo's relay, which is what these settings exist for. */
export const BREVO_HOST = 'smtp-relay.brevo.com'
export const BREVO_PORT = 587

const ROW_ID = 1
const CIPHER = 'aes-256-gcm'
const PREFIX = 'v1'

/**
 * The key is derived from AUTH_SECRET rather than being a secret of its own: a
 * second one would need its own place to live, and anything that can read
 * AUTH_SECRET can already mint a session for any account here.
 */
function key(): Buffer {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set — refusing to store an SMTP key')
  // The salt is frozen at the old brand's name on purpose: it derives the key
  // that already encrypted every stored SMTP password, and renaming it would
  // make all of them undecryptable.
  return scryptSync(secret, 'trustindex-mail-v1', 32)
}

export function encryptSecret(plain: string): string {
  if (!plain) return ''
  const iv = randomBytes(12)
  const cipher = createCipheriv(CIPHER, key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [
    PREFIX,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    data.toString('base64'),
  ].join(':')
}

export function decryptSecret(stored: string): string {
  if (!stored) return ''
  // A value someone typed straight into the table stays usable — it is simply
  // not encrypted, and re-saving from the panel puts that right.
  if (!stored.startsWith(`${PREFIX}:`)) return stored
  const [, iv, tag, data] = stored.split(':')
  try {
    const decipher = createDecipheriv(CIPHER, key(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return (
      decipher.update(Buffer.from(data, 'base64')).toString('utf8') + decipher.final('utf8')
    )
  } catch {
    // wrong AUTH_SECRET, or a truncated column — better an empty key and a
    // failed send in the log than a half-working one nobody can explain
    console.error('[mail] stored SMTP key could not be decrypted')
    return ''
  }
}

/**
 * Held for a minute so a burst of notifications is not a row read each. Saving
 * the form clears it, so the panel never shows one thing while the mailer uses
 * another.
 */
const TTL_MS = 60 * 1000

let memo: { at: number; config: MailConfig | null } | null = null

export function forgetMailConfig() {
  memo = null
}

/** The saved settings, or null when nothing has been saved yet. */
export async function loadMailConfig(): Promise<MailConfig | null> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.config

  const row = await db.mailSetting.findUnique({ where: { id: ROW_ID } })
  const config: MailConfig | null =
    row && row.host
      ? {
          host: row.host,
          port: row.port,
          username: row.username,
          password: decryptSecret(row.password ?? ''),
          fromName: row.fromName,
          fromEmail: row.fromEmail,
          enabled: row.enabled,
        }
      : null

  memo = { at: Date.now(), config }
  return config
}

/** For the admin form — the key is reported as present, never returned. */
export async function mailSettingsView(): Promise<MailSettingsView> {
  const row = await db.mailSetting.findUnique({ where: { id: ROW_ID } })
  if (!row) {
    return {
      host: BREVO_HOST,
      port: BREVO_PORT,
      username: '',
      fromName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Kings Reviews',
      fromEmail: '',
      enabled: true,
      hasPassword: false,
      updatedAt: null,
      saved: false,
    }
  }
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    enabled: row.enabled,
    hasPassword: Boolean(row.password),
    updatedAt: row.updatedAt,
    saved: true,
  }
}

export type SaveMailInput = {
  host: string
  port: number
  username: string
  /** empty means "leave the stored key alone" — the form never echoes it back */
  password: string
  fromName: string
  fromEmail: string
  enabled: boolean
}

export async function saveMailConfig(input: SaveMailInput): Promise<void> {
  const existing = await db.mailSetting.findUnique({
    where: { id: ROW_ID },
    select: { password: true },
  })
  const password = input.password ? encryptSecret(input.password) : (existing?.password ?? null)

  const data = {
    host: input.host,
    port: input.port,
    username: input.username,
    password,
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    enabled: input.enabled,
  }

  await db.mailSetting.upsert({
    where: { id: ROW_ID },
    create: { id: ROW_ID, ...data },
    update: data,
  })
  forgetMailConfig()
}
