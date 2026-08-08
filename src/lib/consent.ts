/**
 * Cookie consent — the one place that knows what a stored choice looks like.
 *
 * The DPDP Act treats a cookie that is not needed to run the service as
 * processing that needs consent: freely given, specific, informed, and as easy
 * to withdraw as to give. So nothing here defaults to "on", the choice is
 * stored per category, and it lives in a first-party cookie rather than
 * localStorage — a cookie rides along with the request, so the server can read
 * the same answer the browser is acting on.
 */

export const CONSENT_COOKIE = 'ti_consent'

/**
 * Bumped when the categories change or the notice changes materially. A record
 * from an older version counts as no answer at all, so the banner comes back
 * and asks again instead of silently reusing stale consent.
 */
export const CONSENT_VERSION = 2

/** Six months. Long enough not to nag, short enough that consent stays current. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182

/**
 * A blanket refusal is kept for a day, then the banner asks once more.
 *
 * Shorter than a grant on purpose, and that asymmetry is exactly why the
 * privacy notice states it outright instead of leaving it to be discovered. The
 * refusal is honoured in full for its whole life — nothing loads, nothing is
 * stored — and turning a single category on earns the full six months.
 */
export const CONSENT_REJECT_MAX_AGE = 60 * 60 * 24

/** How long this particular answer is kept. */
export function consentMaxAge(choices: ConsentChoices): number {
  const refusedEverything = OPTIONAL_CATEGORIES.every((category) => !choices[category])
  return refusedEverything ? CONSENT_REJECT_MAX_AGE : CONSENT_MAX_AGE
}

/** Fired on `window` after every save, with the new record as `detail`. */
export const CONSENT_CHANGED_EVENT = 'ti:consent-changed'

/** Fired on `window` to re-open the preferences dialog from anywhere. */
export const CONSENT_OPEN_EVENT = 'ti:consent-open'

export type ConsentCategory = 'preferences' | 'analytics' | 'marketing'

export type ConsentChoices = Record<ConsentCategory, boolean>

export type ConsentRecord = ConsentChoices & {
  v: number
  /** ISO timestamp — a fiduciary has to be able to show when consent was taken. */
  at: string
}

export const OPTIONAL_CATEGORIES: ConsentCategory[] = ['preferences', 'analytics', 'marketing']

/**
 * Shown in the preferences dialog. The strictly necessary row is listed too,
 * because "we only use what we need" is only believable if you can see the list.
 */
export const CONSENT_CATEGORIES: {
  key: ConsentCategory | 'necessary'
  title: string
  body: string
  examples: string
  required?: boolean
}[] = [
  {
    key: 'necessary',
    title: 'Strictly necessary',
    body: 'Keeps you signed in, protects forms against cross-site request forgery, and remembers this consent choice. The site cannot work without them.',
    examples: 'Session, CSRF token, ti_consent',
    required: true,
  },
  {
    key: 'preferences',
    title: 'Preferences',
    body: 'Remembers the small choices you make — the email you last signed in with, recent searches — so you do not set them again on every visit.',
    examples: 'Remembered email (ti:last-email)',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    body: 'Counts of which pages and categories get used, plus anonymised recordings of how people move through the site — where they scroll, what they click, where a page confuses them. Used to decide what to improve, never to identify you personally.',
    examples: 'Google Analytics (_ga, _ga_*), Microsoft Clarity (_clck, _clsk)',
  },
  {
    key: 'marketing',
    title: 'Marketing',
    body: 'Measures whether a campaign brought you here, and lets us show relevant ads elsewhere. Off unless you turn it on.',
    examples: 'Google Ads (_gcl_*), Meta Pixel (_fbp, _fbc)',
  },
]

export const DENY_ALL: ConsentChoices = { preferences: false, analytics: false, marketing: false }
export const GRANT_ALL: ConsentChoices = { preferences: true, analytics: true, marketing: true }

/**
 * Third-party cookies we drop ourselves when consent is withdrawn. Withdrawal
 * has to actually take effect, and a vendor script that has already run will
 * not clean up after itself. Matched by prefix; never touches our own cookies.
 */
/**
 * Our own browser storage, by the category that pays for it. Third-party tags
 * are not the only thing a withdrawal has to switch off — anything we put in
 * localStorage under an optional category has to go the same way.
 */
const FIRST_PARTY_STORAGE: Partial<Record<ConsentCategory, string[]>> = {
  preferences: ['ti:last-email'],
}

const THIRD_PARTY_PREFIXES = [
  '_ga',
  '_gid',
  '_gat',
  '_gcl',
  '_fbp',
  '_fbc',
  '_uetsid',
  '_uetvid',
  // Microsoft Clarity. Its CLID/MUID live on Microsoft's own domains, which no
  // amount of document.cookie can reach — these two are the first-party pair.
  '_clck',
  '_clsk',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Parses the raw cookie value. Returns `null` for anything we cannot trust —
 * missing, malformed, or written by an older version of the notice — which the
 * UI reads as "not answered yet".
 */
export function parseConsent(raw: string | undefined | null): ConsentRecord | null {
  if (!raw) return null

  let data: unknown
  try {
    data = JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }

  if (!isRecord(data) || data.v !== CONSENT_VERSION) return null

  const choices = {} as ConsentChoices
  for (const key of OPTIONAL_CATEGORIES) {
    if (typeof data[key] !== 'boolean') return null
    choices[key] = data[key]
  }

  return { ...choices, v: CONSENT_VERSION, at: typeof data.at === 'string' ? data.at : '' }
}

/** Whether a category is allowed. Unanswered means denied — no implied consent. */
export function isAllowed(record: ConsentRecord | null, category: ConsentCategory): boolean {
  return record?.[category] === true
}

export type GoogleConsentSignals = {
  analytics_storage: 'granted' | 'denied'
  ad_storage: 'granted' | 'denied'
  ad_user_data: 'granted' | 'denied'
  ad_personalization: 'granted' | 'denied'
}

/**
 * What every Google tag starts from. The default has to be on the page before
 * any tag is configured — a tag that finds no signal at all behaves as though
 * it had been granted one.
 */
export const DENIED_SIGNALS: GoogleConsentSignals = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}

/**
 * Google Consent Mode v2 signals, derived from the record instead of written
 * out by hand at each tag, so the banner and the tags cannot drift apart.
 * Measurement storage follows the analytics category; the three advertising
 * signals follow marketing, because that is what they are for.
 */
export function googleConsentSignals(record: ConsentRecord | null): GoogleConsentSignals {
  const analytics = isAllowed(record, 'analytics') ? 'granted' : 'denied'
  const marketing = isAllowed(record, 'marketing') ? 'granted' : 'denied'
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  }
}

/* -------------------------------------------------------------------------- */
/* Browser side                                                               */
/* -------------------------------------------------------------------------- */

function rawConsentCookie(): string | null {
  if (typeof document === 'undefined') return null
  return document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))?.[1] ?? null
}

/**
 * The cookie is an external store, so components read it through
 * `useSyncExternalStore` rather than copying it into state. That needs a
 * snapshot that keeps its identity between calls or the component re-renders
 * forever — hence the cache, refreshed only when the raw cookie text changes.
 */
let lastRaw: string | null = null
let lastRecord: ConsentRecord | null = null

export function getConsentSnapshot(): ConsentRecord | null {
  const raw = rawConsentCookie()
  if (raw !== lastRaw) {
    lastRaw = raw
    lastRecord = parseConsent(raw)
  }
  return lastRecord
}

/**
 * `undefined` — meaning "not known yet" — on the server and through hydration,
 * so the markup never guesses. React swaps in the client snapshot once
 * hydration is done, which is the only moment we can tell consented visitors
 * from new ones without making every route dynamic.
 */
export function getServerConsentSnapshot(): undefined {
  return undefined
}

export function subscribeConsent(onStoreChange: () => void): () => void {
  window.addEventListener(CONSENT_CHANGED_EVENT, onStoreChange)
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onStoreChange)
}

/** Imperative read, for the places that need the value outside of render. */
export function readConsent(): ConsentRecord | null {
  return getConsentSnapshot()
}

/**
 * Writes the choice and tells the page about it. `SameSite=Lax` because the
 * cookie is only ever read on top-level navigations to our own pages, and
 * `Secure` only on https so it still works on the local http dev server.
 */
export function writeConsent(choices: ConsentChoices): ConsentRecord {
  const record: ConsentRecord = { ...choices, v: CONSENT_VERSION, at: new Date().toISOString() }

  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(record),
  )}; Max-Age=${consentMaxAge(choices)}; Path=/; SameSite=Lax${secure}`

  // Anything just switched off should stop working now, not at the next visit.
  if (!choices.analytics || !choices.marketing) clearThirdPartyCookies()
  clearWithdrawnStorage(choices)

  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_CHANGED_EVENT, { detail: record }))
  return record
}

/** Re-opens the preferences dialog — used by the footer and the privacy notice. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
}

/** Drops the localStorage a category paid for, the moment it is switched off. */
function clearWithdrawnStorage(choices: ConsentChoices) {
  for (const category of OPTIONAL_CATEGORIES) {
    if (choices[category]) continue
    for (const key of FIRST_PARTY_STORAGE[category] ?? []) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* storage blocked — nothing was stored either */
      }
    }
  }
}

/**
 * Best effort: a cookie can only be deleted from a matching domain and path,
 * and we cannot know which the vendor used, so we try the plausible ones.
 */
function clearThirdPartyCookies() {
  const host = location.hostname
  const domains = [host, `.${host}`]
  // ...and the registrable domain, which is what Google's tags actually set
  const parts = host.split('.')
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`)

  for (const entry of document.cookie.split('; ')) {
    const name = entry.split('=')[0]
    if (!THIRD_PARTY_PREFIXES.some((prefix) => name.startsWith(prefix))) continue

    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}`
    }
    document.cookie = `${name}=; Max-Age=0; Path=/`
  }
}
