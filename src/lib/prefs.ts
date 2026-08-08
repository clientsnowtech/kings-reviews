/**
 * Small browser-only preferences. Storage can throw (private mode, blocked
 * cookies), so every call is best-effort and never breaks the auth flow.
 *
 * Only the email is ever kept — passwords stay with the browser's own manager.
 *
 * This is the "Preferences" category of the cookie notice, so it answers to the
 * same consent record the tracking tags do: a visitor who turned preferences
 * off gets no stored email, however convenient it would have been.
 */

import { isAllowed, readConsent } from '@/lib/consent'

const LAST_EMAIL_KEY = 'ti:last-email'

function preferencesAllowed(): boolean {
  return isAllowed(readConsent(), 'preferences')
}

export function readRememberedEmail(): string {
  if (!preferencesAllowed()) return ''
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberEmail(email: string) {
  if (!preferencesAllowed()) return
  try {
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email)
  } catch {
    /* storage blocked */
  }
}

export function forgetEmail() {
  try {
    localStorage.removeItem(LAST_EMAIL_KEY)
  } catch {
    /* storage blocked */
  }
}
