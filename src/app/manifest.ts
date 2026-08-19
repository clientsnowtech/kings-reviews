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
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
