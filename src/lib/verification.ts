/**
 * What a listing has to look like before its owner may ask to be verified.
 *
 * The same list drives three surfaces — the completeness meter on the edit
 * page, the guard inside `requestVerification`, and the summary an admin sees
 * on the review queue — so a task can never be shown as optional in one place
 * and enforced in another.
 */

export const MIN_DESCRIPTION = 80
export const MIN_IMAGES = 3

export type ReadinessInput = {
  logo: string | null
  cover: string | null
  description: string | null
  website: string | null
  address: string | null
  pincode: string | null
  mapUrl: string | null
  hours: number
  images: number
}

export type ReadinessCheck = { key: string; label: string; ok: boolean }

export type Readiness = {
  checks: ReadinessCheck[]
  missing: ReadinessCheck[]
  done: number
  total: number
  pct: number
  /** every task cleared — the only state that may request verification */
  ready: boolean
}

function filled(v: string | null): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

export function verificationReadiness(b: ReadinessInput): Readiness {
  const checks: ReadinessCheck[] = [
    { key: 'logo', label: 'Add a logo', ok: filled(b.logo) },
    { key: 'cover', label: 'Add a cover image', ok: filled(b.cover) },
    {
      key: 'description',
      label: `Write a description (${MIN_DESCRIPTION}+ characters)`,
      ok: (b.description?.trim().length ?? 0) >= MIN_DESCRIPTION,
    },
    { key: 'website', label: 'Add your website', ok: filled(b.website) },
    { key: 'address', label: 'Add a street address', ok: filled(b.address) },
    { key: 'pincode', label: 'Add a pincode', ok: filled(b.pincode) },
    { key: 'map', label: 'Add your Google Maps link', ok: filled(b.mapUrl) },
    { key: 'hours', label: 'Set business hours', ok: b.hours > 0 },
    { key: 'images', label: `Upload at least ${MIN_IMAGES} photos`, ok: b.images >= MIN_IMAGES },
  ]

  const missing = checks.filter((c) => !c.ok)
  const done = checks.length - missing.length

  return {
    checks,
    missing,
    done,
    total: checks.length,
    pct: Math.round((done / checks.length) * 100),
    ready: missing.length === 0,
  }
}
