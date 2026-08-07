import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * RFC 6238 TOTP, written against node's crypto so two-factor costs no
 * dependency. The defaults match what Google Authenticator, Authy, 1Password
 * and the rest assume when an otpauth:// URI omits them: SHA-1, 6 digits, a
 * 30-second step.
 */
const STEP_SECONDS = 30
const DIGITS = 6
/** How many steps either side of "now" still count, to absorb clock drift. */
const WINDOW = 1

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** A fresh 20-byte (160-bit) secret, base32 encoded the way apps expect it. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8)
  // the counter is well under 2^53, so split it across the two 32-bit halves
  msg.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  msg.writeUInt32BE(counter >>> 0, 4)

  const digest = createHmac('sha1', secret).update(msg).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const bin =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0')
}

/** The code an app would be showing right now. */
export function currentCode(secretB32: string, at = Date.now()): string {
  return hotp(base32Decode(secretB32), Math.floor(at / 1000 / STEP_SECONDS))
}

/** Constant-time compare, so a wrong code leaks nothing through timing. */
function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function verifyCode(secretB32: string, code: string, at = Date.now()): boolean {
  const digits = (code ?? '').replace(/\D/g, '')
  if (digits.length !== DIGITS) return false

  const secret = base32Decode(secretB32)
  if (secret.length === 0) return false

  const step = Math.floor(at / 1000 / STEP_SECONDS)
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (sameString(hotp(secret, step + i), digits)) return true
  }
  return false
}

/** The string an authenticator app scans. `label` is what shows inside the app. */
export function otpauthUrl({
  secret,
  label,
  issuer = 'TrustIndex',
}: {
  secret: string
  label: string
  issuer?: string
}): string {
  const account = encodeURIComponent(`${issuer}:${label}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${account}?${params}`
}

// ---------------------------------------------------------------- backup codes

const BACKUP_COUNT = 8

/** One-time codes like "4H7K-2QW9". Shown once at setup, then only hashes stay. */
export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_COUNT }, () => {
    const raw = base32Encode(randomBytes(6)).slice(0, 8)
    return `${raw.slice(0, 4)}-${raw.slice(4)}`
  })
}

/** Codes are high-entropy random, so sha256 is enough — no bcrypt cost needed. */
export function hashBackupCode(code: string): string {
  return createHash('sha256')
    .update(code.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .digest('hex')
}

export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode)
}

/**
 * Spend one backup code. Returns the remaining hashes when it matched and null
 * when it did not — a used code must never work a second time.
 */
export function spendBackupCode(hashes: string[], code: string): string[] | null {
  const hash = hashBackupCode(code)
  const idx = hashes.indexOf(hash)
  if (idx < 0) return null
  return hashes.filter((_, i) => i !== idx)
}

export function parseBackupCodes(stored: string | null | undefined): string[] {
  if (!stored) return []
  try {
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : []
  } catch {
    return []
  }
}
