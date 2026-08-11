/**
 * The branded HTML shell every notification is poured into.
 *
 * Mail clients are not browsers: no external stylesheet, no flexbox worth
 * trusting, and Outlook still lays out through tables. So this is tables and
 * inline styles on purpose — the ugliest thing here is also the only thing that
 * renders the same in Gmail, Outlook and Apple Mail.
 *
 * The palette is the site's, hard-coded rather than read from globals.css: a
 * mail cannot resolve a CSS variable, and a notification that arrives unstyled
 * six months from now is worse than one that cannot follow a rebrand.
 *
 * Every builder still writes a plain-text body as well. Text is not a fallback
 * we tolerate — some people read mail that way, and a spam filter trusts a
 * message more when both parts say the same thing.
 */

const BRAND = '#0e7a63'
const BRAND_STRONG = '#0a5b49'
const INK = '#0f1b17'
const MUTED = '#5c6b66'
const BORDER = '#e6ebe8'
const MINT = '#e7f5ef'
const CREAM = '#fbfaf3'

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const site = () => process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? ''

/**
 * Business names, cities and rejection reasons are typed by strangers and land
 * inside this HTML, so everything interpolated goes through here. A listing
 * called "Bob's <b>Best</b> Shop" is a broken mail at best and an injected link
 * at worst.
 */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A paragraph, at the size and leading the rest of the mail uses. */
export function p(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK};">${html}</p>`
}

/** The quieter line — reasons, disclaimers, "ignore this if". */
export function small(html: string): string {
  return `<p style="margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};">${html}</p>`
}

/**
 * The one thing the mail wants done. Rendered as a table so Outlook gives it
 * padding, and followed by a plain link wherever the destination matters — a
 * button whose background a client strips still has to be clickable.
 */
export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr><td align="center" bgcolor="${BRAND}" style="border-radius:8px;">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
  </td></tr>
</table>`
}

/** A secondary destination, worth a line but not a button. */
export function linkLine(label: string, href: string): string {
  return `<p style="margin:0 0 12px;font-family:${FONT};font-size:15px;line-height:24px;color:${MUTED};">${esc(
    label,
  )} <a href="${esc(href)}" style="color:${BRAND};text-decoration:underline;">${esc(
    href.replace(/^https?:\/\//, ''),
  )}</a></p>`
}

/** The mint box — one fact the reader must not scroll past. */
export function panel(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr><td style="padding:16px 18px;background:${MINT};border-radius:10px;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">${html}</td></tr>
</table>`
}

/** Several listings, or several steps — anything that reads as a list. */
export function bullets(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:0 0 8px;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};"><span style="color:${BRAND};">&#9679;</span>&nbsp;&nbsp;${item}</td></tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${rows}</table>`
}

/** Stars as characters, because an image of five stars is an image that got blocked. */
export function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)))
  return `<span style="font-size:18px;letter-spacing:2px;color:${BRAND};">${'&#9733;'.repeat(
    filled,
  )}<span style="color:${BORDER};">${'&#9733;'.repeat(5 - filled)}</span></span>`
}

/**
 * The wordmark, drawn rather than fetched. A logo image would be blocked by
 * every client that hides remote content by default, and the first impression
 * of a notification should not depend on the reader clicking "show images".
 */
function header(): string {
  const home = site() || '#'
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr>
    <td width="34" style="padding:0 10px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="34"><tr>
        <td align="center" bgcolor="${BRAND}" height="34" style="border-radius:9px;font-family:${FONT};font-size:19px;line-height:34px;color:#ffffff;font-weight:700;">&#10003;</td>
      </tr></table>
    </td>
    <td style="font-family:${FONT};">
      <a href="${esc(home)}" style="text-decoration:none;">
        <span style="font-size:19px;font-weight:700;color:${INK};letter-spacing:-0.2px;">Trust</span><span style="font-size:19px;font-weight:700;color:${BRAND};letter-spacing:-0.2px;">Index</span>
        <span style="display:block;font-size:10px;font-weight:600;letter-spacing:3px;color:${MUTED};">INDIA</span>
      </a>
    </td>
  </tr>
</table>`
}

function footer(): string {
  const home = site()
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:20px;color:${MUTED};">
    Sent by TrustIndex India${
      home
        ? ` &middot; <a href="${esc(home)}" style="color:${MUTED};text-decoration:underline;">${esc(
            home.replace(/^https?:\/\//, ''),
          )}</a>`
        : ''
    }<br>
    You are getting this because this address is on a TrustIndex listing or review.
  </td></tr>
</table>`
}

/**
 * Wraps the blocks in the shell.
 *
 * `preheader` is the grey line the inbox shows beside the subject. Left empty it
 * fills itself with whatever the first tag happens to be — usually a style
 * attribute — so every mail sets one.
 */
export function shell(args: {
  subject: string
  preheader: string
  heading: string
  body: string
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(args.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${CREAM};">${esc(
    args.preheader,
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};">
  <tr>
    <td align="center" style="padding:28px 12px 40px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr><td>${header()}</td></tr>
        <tr>
          <td style="padding:32px 28px 20px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;">
            <h1 style="margin:0 0 18px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${BRAND_STRONG};">${esc(
              args.heading,
            )}</h1>
            ${args.body}
          </td>
        </tr>
        <tr><td>${footer()}</td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
