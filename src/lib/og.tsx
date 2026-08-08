import type { ReactElement } from 'react'
import { SITE_URL } from './seo'

/**
 * Shared chrome for the generated Open Graph cards.
 *
 * These render through Satori (`next/og`), which understands flexbox and a
 * subset of CSS only — no grid, and every element with more than one child
 * needs an explicit `display: flex`.
 *
 * Glyphs are the other trap: the bundled fallback font has no ★ (U+2605), so a
 * text star renders as a blank box. Shapes are drawn as inline SVG instead,
 * the same way components/logo.tsx and app/apple-icon.tsx do it.
 */

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const BRAND = '#0e7a63'
const BRAND_DARK = '#0a5b49'
const INK = '#0f1b17'
const MUTED = '#5c6b66'
const CREAM = '#fbfaf3'
const MINT = '#e7f5ef'
// same gold as --star in globals.css and the badge
const STAR = '#f5a623'
const STAR_EMPTY = '#d7dde0'

const STAR_PATH =
  'M12 2.4l2.94 6.03 6.66.94-4.83 4.66 1.15 6.6L12 17.5l-5.92 3.13 1.15-6.6L2.4 9.37l6.66-.94z'

/** Five stars, filled to the nearest whole star — enough precision for a card. */
function StarRow({ rating, size = 46 }: { rating: number; size?: number }) {
  const filled = Math.round(rating)
  const gap = 8
  const width = 5 * size + 4 * gap

  return (
    <svg width={width} height={size} viewBox={`0 0 ${width} ${size}`} fill="none">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${i * (size + gap)},0)`}>
          <rect width={size} height={size} rx="6" fill={i < filled ? STAR : STAR_EMPTY} />
          <path d={STAR_PATH} transform={`scale(${size / 24})`} fill="#ffffff" />
        </g>
      ))}
    </svg>
  )
}

type CardInput = {
  /** small uppercase line above the title */
  eyebrow?: string
  title: string
  subtitle?: string
  /** renders the star row + numeric average when above zero */
  rating?: number
  /** short stat pills along the bottom */
  chips?: string[]
}

/**
 * One card layout for every OG image on the site, so a link looks the same
 * whichever page it was shared from.
 */
export function ogCard({ eyebrow, title, subtitle, rating, chips = [] }: CardInput): ReactElement {
  // Long business names have to shrink or they run off the card.
  const titleSize = title.length > 46 ? 56 : title.length > 30 ? 68 : 82

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: CREAM,
        padding: '60px 72px',
      }}
    >
      {/* brand rule down the left edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 14,
          height: '100%',
          backgroundColor: BRAND,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="og-brand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#12876d" />
              <stop offset="1" stopColor={BRAND_DARK} />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="9" fill="url(#og-brand)" />
          <path
            d="M9.5 16.4l4 4 9-9.4"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: 'flex', marginLeft: 18, fontSize: 34, fontWeight: 700 }}>
          <span style={{ color: INK }}>Trust</span>
          <span style={{ color: BRAND }}>Index</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {eyebrow ? (
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              letterSpacing: 6,
              color: BRAND,
              marginBottom: 18,
            }}
          >
            {eyebrow.toUpperCase()}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            fontSize: titleSize,
            fontWeight: 700,
            color: INK,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 20 }}>
            {subtitle}
          </div>
        ) : null}

        {typeof rating === 'number' && rating > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 28 }}>
            <StarRow rating={rating} />
            <div
              style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: INK, marginLeft: 20 }}
            >
              {rating.toFixed(1)}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          {chips.map((c) => (
            <div
              key={c}
              style={{
                display: 'flex',
                fontSize: 24,
                color: BRAND_DARK,
                backgroundColor: MINT,
                borderRadius: 999,
                padding: '10px 22px',
                marginRight: 14,
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>
          {SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </div>
      </div>
    </div>
  )
}
