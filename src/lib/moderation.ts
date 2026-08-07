/**
 * Review content rules: no links or contact details, no abuse.
 *
 * This is a first filter, not a verdict — everything a user writes still waits
 * for a human (owner or admin) to approve it. So the checks aim to catch the
 * obvious cases without blocking honest reviews: a wrongly-blocked reviewer
 * simply gives up, which costs more than a spam review an owner can reject.
 */

/** TLDs safe to flag on their own. Anything that doubles as an English word is
 *  kept out: reviewers skip the space after a full stop, and "bad.Online
 *  booking too" must not read as a domain. */
const BARE_TLDS = 'com|net|org|io|xyz|biz|club'

/** The rest only count with a scheme, a www., or a path: "example.in/offer". */
const PATH_TLDS =
  'in|co|me|us|uk|ru|cn|is|it|to|ly|gg|tv|cc|info|shop|store|online|site|app|dev|tech|link|live|space|website|pro|top'

const LINK_PATTERNS: RegExp[] = [
  /\bhttps?:\/\//i,
  /\bwww\.[a-z0-9-]/i,
  new RegExp(String.raw`\b[a-z0-9][a-z0-9-]*\.(?:${BARE_TLDS})\b`, 'i'),
  new RegExp(String.raw`\b[a-z0-9][a-z0-9-]*\.(?:${PATH_TLDS})/`, 'i'),
  // "example dot com" / "example(dot)com" — the usual way around a link filter
  /\b[a-z0-9-]+\s*[([{]?\s*dot\s*[)\]}]?\s*(?:com|net|org|in|io)\b/i,
  // an email address is a contact channel, same as a link
  /\b[a-z0-9._%+-]+\s*(?:@|\[at\]|\(at\))\s*[a-z0-9-]+\.[a-z]{2,}\b/i,
]

/**
 * Phone numbers, the other way people advertise in a review. Ten digits with
 * optional +91/0 and the usual spacing or dashes. Prices, years and amounts
 * are far shorter, so the ten-digit floor keeps "₹2500 for 2 hours" clear.
 */
const PHONE_PATTERNS: RegExp[] = [
  /(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){10,}/,
  /\b(?:whats\s?app|whtsp|wa)\b[^.\n]{0,20}?\d{5,}/i,
]

/**
 * Words that are abusive in every context. Mild insults are left out on
 * purpose — a rude-but-real review is the moderator's call, not the filter's.
 */
const ABUSIVE_WORDS = [
  // english
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit', 'bitch',
  'bastard', 'asshole', 'arsehole', 'dickhead', 'cunt', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'retard', 'rapist',
  // hindi / gujarati romanised
  'chutiya', 'chutiye', 'chutia', 'chootiya', 'madarchod', 'maderchod', 'behenchod',
  'bhenchod', 'bhosdi', 'bhosdike', 'bhosda', 'gaandu', 'gandu', 'lawda',
  'lauda', 'randi', 'harami', 'haramkhor', 'kutiya', 'bhadwa', 'chodu',
  'madharchod', 'bakchod',
]

/** Digits and symbols people swap in for letters. */
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's', '!': 'i', '|': 'i',
}

/** Lower-cases and un-leets, so "ch00tiya" reads as "chootiya". */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[0134578@$!|]/g, (c) => LEET[c] ?? c)
}

/**
 * Matches the word through the usual dodges: one filler character between
 * letters (`f.u.c.k`, `f u c k`), stretched letters (`fuuuck`), and the common
 * English endings so "bastards" is not a way around the list.
 */
function spacedPattern(word: string): RegExp {
  const letters = word
    .split('')
    .map((c) => `${c.replace(/[^a-z0-9]/g, '\\$&')}+`)
    .join('[^a-z0-9]?')
  return new RegExp(String.raw`\b${letters}(?:s|es|ed|ing|z)?\b`, 'i')
}

const ABUSIVE_PATTERNS = ABUSIVE_WORDS.map(spacedPattern)

export function hasLink(text: string): boolean {
  return LINK_PATTERNS.some((re) => re.test(text))
}

export function hasPhone(text: string): boolean {
  return PHONE_PATTERNS.some((re) => re.test(text))
}

export function hasAbuse(text: string): boolean {
  const clean = normalise(text)
  return ABUSIVE_PATTERNS.some((re) => re.test(clean))
}

/** True when `text` contains any of the admin-managed extra words. */
export function hasWord(text: string, words: string[]): boolean {
  if (!words.length) return false
  const clean = normalise(text)
  return words.some((w) => {
    const word = normalise(w.trim())
    return word.length > 1 && spacedPattern(word).test(clean)
  })
}

/** Returns the reason a piece of review text is rejected, or null if it passes. */
export function reviewTextError(text: string): string | null {
  if (hasLink(text)) return 'Links, websites and contact details are not allowed in a review.'
  if (hasPhone(text)) return 'Phone numbers are not allowed in a review.'
  if (hasAbuse(text)) return 'Please rewrite this without abusive language.'
  return null
}
