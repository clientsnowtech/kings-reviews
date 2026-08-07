import { db } from './db'
import { hasWord, reviewTextError } from './moderation'

/**
 * Admin-managed blocklist on top of the built-in rules.
 *
 * Abuse vocabulary changes faster than releases, so the extra words live in the
 * database. They are read on every review submission, which is why the list is
 * cached — it is a few dozen rows that change once a month at most.
 */
const TTL_MS = 60_000
let cache: { words: string[]; at: number } | null = null

export async function blockedWords(): Promise<string[]> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.words

  try {
    const rows = await db.blockedWord.findMany({ select: { word: true } })
    cache = { words: rows.map((r) => r.word), at: now }
  } catch {
    // never let a moderation lookup take down a submission — the built-in
    // rules have already run by the time we get here
    cache = { words: cache?.words ?? [], at: now }
  }
  return cache.words
}

/** Drops the cache so an admin edit takes effect on the next submission. */
export function forgetBlockedWords() {
  cache = null
}

/**
 * Full check: built-in rules first (cheap, no I/O), then the admin list.
 * Returns the reason, or null when the text is fine.
 */
export async function checkText(text: string): Promise<string | null> {
  const builtin = reviewTextError(text)
  if (builtin) return builtin
  return hasWord(text, await blockedWords())
    ? 'Please rewrite this without abusive language.'
    : null
}
