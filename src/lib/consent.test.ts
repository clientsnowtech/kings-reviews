import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONSENT_MAX_AGE,
  CONSENT_REJECT_MAX_AGE,
  CONSENT_VERSION,
  DENIED_SIGNALS,
  DENY_ALL,
  GRANT_ALL,
  consentMaxAge,
  googleConsentSignals,
  isAllowed,
  parseConsent,
} from './consent'

function cookieValue(payload: unknown): string {
  return encodeURIComponent(JSON.stringify(payload))
}

const AT = '2026-01-01T00:00:00.000Z'

test('reads back a record it wrote', () => {
  const raw = cookieValue({ ...GRANT_ALL, v: CONSENT_VERSION, at: AT })
  assert.deepEqual(parseConsent(raw), { ...GRANT_ALL, v: CONSENT_VERSION, at: AT })
})

test('treats missing, malformed and half-written values as unanswered', () => {
  for (const raw of [
    undefined,
    null,
    '',
    'not json',
    cookieValue({ v: CONSENT_VERSION, at: AT }),
    // a category that is present but not a boolean is not an answer
    cookieValue({ ...DENY_ALL, analytics: 'yes', v: CONSENT_VERSION, at: AT }),
  ]) {
    assert.equal(parseConsent(raw), null, `expected null for ${JSON.stringify(raw)}`)
  }
})

test('an older notice version counts as unanswered so the banner asks again', () => {
  const raw = cookieValue({ ...GRANT_ALL, v: CONSENT_VERSION - 1, at: AT })
  assert.equal(parseConsent(raw), null)
})

test('nothing is allowed without a stored grant', () => {
  const denied = parseConsent(cookieValue({ ...DENY_ALL, v: CONSENT_VERSION, at: AT }))
  const granted = parseConsent(cookieValue({ ...GRANT_ALL, v: CONSENT_VERSION, at: AT }))

  assert.equal(isAllowed(null, 'analytics'), false)
  assert.equal(isAllowed(denied, 'analytics'), false)
  assert.equal(isAllowed(granted, 'analytics'), true)
})

test('a blanket refusal is kept for a day, anything else for the full term', () => {
  assert.equal(consentMaxAge(DENY_ALL), CONSENT_REJECT_MAX_AGE)
  assert.equal(CONSENT_REJECT_MAX_AGE, 60 * 60 * 24)

  assert.equal(consentMaxAge(GRANT_ALL), CONSENT_MAX_AGE)
  // one category is enough — only a refusal of everything gets the short life
  for (const category of ['preferences', 'analytics', 'marketing'] as const) {
    assert.equal(consentMaxAge({ ...DENY_ALL, [category]: true }), CONSENT_MAX_AGE, category)
  }
})

test('an unanswered banner denies every Google signal', () => {
  assert.deepEqual(googleConsentSignals(null), DENIED_SIGNALS)
})

test('measurement follows analytics, the three ad signals follow marketing', () => {
  const record = (choices: Partial<typeof GRANT_ALL>) =>
    parseConsent(
      encodeURIComponent(JSON.stringify({ ...DENY_ALL, ...choices, v: CONSENT_VERSION, at: AT })),
    )

  assert.deepEqual(googleConsentSignals(record({ analytics: true })), {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })

  // marketing alone must not switch measurement on behind the visitor's back
  assert.deepEqual(googleConsentSignals(record({ marketing: true })), {
    analytics_storage: 'denied',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  })
})
