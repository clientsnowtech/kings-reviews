/**
 * Small browser-only preferences. Storage can throw (private mode, blocked
 * cookies), so every call is best-effort and never breaks the auth flow.
 *
 * Only the email is ever kept — passwords stay with the browser's own manager.
 */

const LAST_EMAIL_KEY = 'ti:last-email'

export function readRememberedEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberEmail(email: string) {
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
