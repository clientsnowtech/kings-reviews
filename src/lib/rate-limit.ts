// Minimal in-process rate limiter (fixed window). Good enough for a single
// Node instance / dev. For multi-instance production, back this with Redis.
//
// NOTE: state lives in module memory, so it resets on redeploy and is NOT
// shared across serverless instances — treat it as best-effort abuse braking,
// not a hard security control.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { ok: boolean; remaining: number; retryAfter: number }

/**
 * @param key    unique caller key, e.g. `review:${userId}`
 * @param limit  max hits allowed per window
 * @param windowMs  window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 }
}

// Occasional sweep so the map doesn't grow unbounded on long-lived processes.
export function sweepRateLimits() {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

/**
 * Best-effort caller identity for anonymous endpoints. Behind the production
 * reverse proxy the real address arrives in x-forwarded-for; the first entry is
 * the client and the rest are proxies.
 */
export async function callerIp(headerList?: Headers): Promise<string> {
  const h = headerList ?? (await (await import('next/headers')).headers())
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || h.get('x-real-ip') || 'unknown'
}

/** Guesses allowed against one email address before it stops answering. */
const LOGIN_PER_EMAIL = 8
/** Guesses allowed from one address across all emails — catches spraying. */
const LOGIN_PER_IP = 30
const LOGIN_WINDOW_MS = 15 * 60_000

/**
 * Shared brake for every path that checks a password: the precheck the login
 * form calls first, and the credentials provider behind it.
 *
 * Both consume the *same* per-email bucket on purpose. Separate limits would
 * hand an attacker the sum of the two, and the provider endpoint is callable
 * directly — skipping the form entirely.
 *
 * Attempts are counted rather than failures, so someone who really does sign in
 * eight times inside a quarter of an hour waits it out. Cheaper trade than
 * leaving the endpoint open to unlimited guessing.
 */
export function loginAttempt(email: string, ip: string): boolean {
  const account = email.trim().toLowerCase()
  const byEmail = rateLimit(`login:${account}`, LOGIN_PER_EMAIL, LOGIN_WINDOW_MS)
  const byIp = rateLimit(`login-ip:${ip}`, LOGIN_PER_IP, LOGIN_WINDOW_MS)
  return byEmail.ok && byIp.ok
}
