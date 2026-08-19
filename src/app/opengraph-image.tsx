import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

/**
 * Default share card for the whole site.
 *
 * Sitting at the app root means every route inherits it, so a page without its
 * own card still shares as something other than a bare link. Static, so it is
 * rendered once at build time.
 */
export const alt = 'Kings Reviews — honest business reviews and ratings'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      eyebrow: 'Business reviews',
      title: 'Honest reviews of Indian businesses',
      subtitle: 'Compare ratings, read real customer experiences, write your own — free.',
      chips: ['Verified listings', 'Moderated reviews'],
    }),
    { ...size },
  )
}
