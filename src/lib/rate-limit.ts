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
