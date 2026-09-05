import type { MetadataRoute } from 'next'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Kings Reviews'

/**
 * Web app manifest — what Android uses when someone adds the site to their home
 * screen, and what fills in the install prompt.
 *
 * The icon is the SVG copy in /public rather than app/icon.svg: the metadata
 * convention serves that one from a hashed URL, which a manifest cannot name.
 * One vector at `sizes: 'any'` covers every launcher density.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — business reviews and ratings`,
    short_name: 'Kings',
    description:
      'Discover and review businesses across India. Honest customer ratings and reviews for restaurants, hotels, services and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0c785d',
    lang: 'en-IN',
    categories: ['business', 'shopping', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      // Chrome only offers 'Install app' once it has a 192 and a 512 raster,
      // and Play reads the maskable one for the listing. All three are written
      // by `npm run android:assets`.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // The Play listing of the Android shell in android/. Chrome shows this in
    // the install prompt once the app is published; until then it is ignored.
    related_applications: [
      {
        platform: 'play',
        id: 'com.kingsreviews.app',
        url: 'https://play.google.com/store/apps/details?id=com.kingsreviews.app',
      },
    ],
  }
}
