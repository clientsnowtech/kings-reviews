# Kings Reviews for Android

A Trusted Web Activity (TWA): the Play Store app is a thin shell that opens
https://www.kingsreviews.com in Chrome, full screen, with the app's icon, name
and splash. Everything the app does, the website does — including Google
sign-in, which an embedded WebView would break (`disallowed_useragent`).

There is no app code to maintain. A site deploy is an app update.

## Layout

| Path | What |
|---|---|
| `app/build.gradle` | the one place the domain, colours and version live |
| `app/src/main/AndroidManifest.xml` | TWA wiring from the android-browser-helper template |
| `app/src/main/res/values/strings.xml` | the app's Digital Asset Links statement |
| `app/src/main/res/mipmap-*`, `drawable-*` | icons and splash, written by `npm run android:assets` |
| `kingsreviews-upload.keystore` | **gitignored** upload key |
| `keystore.properties` | **gitignored** keystore passwords, read by the release build |
| `local.properties` | **gitignored** `sdk.dir` for this machine |

## Build

Needs JDK 17 and the Android SDK (platform 36, build-tools 36). Gradle 9.4.1
and AGP 9.2.1 download themselves on first run.

```bash
cd android
./gradlew assembleRelease bundleRelease
```

Outputs:

- `app/build/outputs/apk/release/kingsreviews-v1.0.0.apk` — sideload / testing
- `app/build/outputs/bundle/release/app-release.aab` — upload to Play

Both come out signed when `keystore.properties` is present. Without it they
build unsigned. Bump `versionCode` and `versionName` in `app/build.gradle`
before every Play upload.

## The trust handshake (why the address bar shows, if it does)

Chrome hides its UI only when both sides vouch for each other:

1. **App → site**: `strings.xml` names `https://www.kingsreviews.com`. Done.
2. **Site → app**: the site serves `/.well-known/assetlinks.json` naming the
   package `com.kingsreviews.app` and the SHA-256 of the signing certificate.
   The route lives at `src/app/.well-known/assetlinks.json/route.ts` and reads
   `ANDROID_CERT_SHA256` from the server's env.

The upload key's fingerprint:

```
88:DB:8C:F3:FC:BE:36:D7:F3:DE:B9:87:26:1D:90:A1:FC:CE:06:D4:37:01:92:F8:01:EC:AF:21:95:54:D0:B0
```

Play re-signs every app it distributes with its own key (Play App Signing, on
by default for new apps). Once the app is created in Play Console, copy the
**app signing key** SHA-256 from Test and release → App integrity, and set
both on the server, comma-separated:

```
ANDROID_CERT_SHA256="88:DB:...:D0:B0,<play app signing key sha256>"
```

Then check https://www.kingsreviews.com/.well-known/assetlinks.json returns
200 with both fingerprints. Without the Play one, installs from the store show
Chrome's address bar; sideloaded builds signed with the upload key work either
way.

To re-read the upload key's fingerprint at any time:

```bash
keytool -list -v -keystore kingsreviews-upload.keystore -alias kingsreviews
```

## Play Console checklist

- Package: `com.kingsreviews.app`. Cannot change after the first upload.
- Store icon: `public/icon-maskable-512.png` (512 × 512, full bleed).
- Feature graphic: 1024 × 500, make one from the wordmark.
- Screenshots: at least two phone screenshots of the live site.
- Data safety: the app collects what the website collects (account, reviews).
  Privacy policy URL: https://www.kingsreviews.com/privacy.
- Content rating questionnaire: user-generated content (reviews), yes.

## Keep the keystore

`kingsreviews-upload.keystore` and `keystore.properties` are gitignored on
purpose. Back them up somewhere private. If the upload key is lost, Play can
issue a new one through support, but only for an app enrolled in Play App
Signing — which is one more reason to keep that enabled.

## Changing icons or colours

Icons: edit `src/lib/brand.ts` (the crest is drawn from there), then
`npm run android:assets` rewrites every PNG here and in `public/`.
Colours and URLs: the `twa` map at the top of `app/build.gradle`.
