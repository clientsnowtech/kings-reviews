/**
 * Digital Asset Links: the site's half of the handshake with the Android app.
 *
 * The app (android/) declares that it trusts this origin; this file declares
 * that the origin trusts the app, named by package and by the SHA-256 of the
 * certificate it was signed with. When both halves agree, Chrome opens the
 * site inside the app without an address bar, and Android hands
 * https://www.kingsreviews.com/... links to the app instead of the browser.
 *
 * Fingerprints come from the environment rather than the source, because there
 * are usually two: the upload key used locally (`keytool -list -v` on the
 * keystore in android/) and the key Google re-signs with under Play App
 * Signing, shown in Play Console → App integrity. List both, comma-separated.
 */

const PACKAGE = process.env.ANDROID_APP_ID ?? 'com.kingsreviews.app'

function fingerprints(): string[] {
  return (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f))
}

export function GET() {
  const prints = fingerprints()
  if (prints.length === 0) {
    // Nothing to vouch for yet. A 404 here is honest; an empty list would
    // look like a deliberate "trust nobody".
    return Response.json({ error: 'ANDROID_CERT_SHA256 is not set' }, { status: 404 })
  }

  return Response.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: PACKAGE,
          sha256_cert_fingerprints: prints,
        },
      },
    ],
    {
      headers: {
        // Chrome and the Play verifier re-fetch this rarely; an hour is plenty
        // for a key rotation to land without a redeploy being needed.
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
