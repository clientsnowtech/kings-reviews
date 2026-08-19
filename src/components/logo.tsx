import Image from 'next/image'
import Link from 'next/link'

import { BRAND_COLORS, BRAND_NAME, EMBLEM_PARTS, EMBLEM_VIEWBOX } from '@/lib/brand'

/** Lockup aspect from logo.svg (770.12 × 248.47); the trimmed one shares it. */
const LOCKUP_RATIO = 770.12 / 248.47

/**
 * Two cuts of the same artwork. `/logo.svg` is the file as supplied, strapline
 * and all; `/logo-wordmark.svg` is that file with the strapline group removed,
 * because at nav height those letters are under four pixels tall and read as
 * grey noise under the wordmark.
 */
const LOCKUPS = {
  wordmark: '/logo-wordmark.svg',
  full: '/logo.svg',
} as const

// tall enough that "REVIEWS" under the K is still a word, not texture
const SIZES = {
  sm: { lockup: 38, tile: 28, radius: 8 },
  md: { lockup: 44, tile: 32, radius: 9 },
} as const

type LogoProps = {
  size?: keyof typeof SIZES
  href?: string | null
  showText?: boolean
  /** 'full' keeps the strapline — only worth it where the lockup can be large */
  lockup?: keyof typeof LOCKUPS
  className?: string
}

/**
 * A white crown on its gold field — the supplied logo squared off for places
 * the wordmark cannot survive: a 28px nav slot with no room, a favicon, an
 * avatar. The same tile the badges, the QR card and the favicons carry.
 */
export function BrandMark({ size = 32, radius }: { size?: number; radius?: number }) {
  const box = EMBLEM_VIEWBOX
  const pad = size * 0.16
  const inner = size - pad * 2
  const k = inner / box.width
  const ty = pad + (inner - box.height * k) / 2
  const r = radius ?? size * 0.28

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      role="img"
      aria-label={BRAND_NAME}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="kr-field" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND_COLORS.goldLight} />
          <stop offset="0.55" stopColor={BRAND_COLORS.goldMid} />
          <stop offset="1" stopColor={BRAND_COLORS.gold} />
        </linearGradient>
        <linearGradient id="kr-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={r} fill="url(#kr-field)" />
      {/* light falling across the tile — a gradient, so there is no seam */}
      <rect width={size} height={size} rx={r} fill="url(#kr-gloss)" />
      <g transform={`translate(${pad - box.x * k} ${ty - box.y * k}) scale(${k})`}>
        {EMBLEM_PARTS.map((p) => (
          <path
            key={p.d.slice(0, 24)}
            d={p.d}
            fill={p.paint === 'white' ? BRAND_COLORS.goldMid : '#ffffff'}
          />
        ))}
      </g>
      <rect
        x="0.5"
        y="0.5"
        width={size - 1}
        height={size - 1}
        rx={r - 0.5}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.14"
      />
    </svg>
  )
}

/**
 * Brand lockup. With room for it, this is logo.svg itself — crest, wordmark and
 * strapline as drawn — rather than a rebuild of it in markup. Where there is no
 * room, it falls back to the crest alone.
 */
export function Logo({
  size = 'md',
  href = '/',
  showText = true,
  lockup = 'wordmark',
  className = '',
}: LogoProps) {
  const s = SIZES[size]
  const height = lockup === 'full' ? Math.round(s.lockup * 1.3) : s.lockup

  const inner = showText ? (
    <Image
      src={LOCKUPS[lockup]}
      alt={BRAND_NAME}
      width={Math.round(height * LOCKUP_RATIO)}
      height={height}
      priority
      unoptimized
      className={`shrink-0 ${className}`}
    />
  ) : (
    <span className={`inline-flex items-center ${className}`}>
      <BrandMark size={s.tile} radius={s.radius} />
    </span>
  )

  if (href === null) return inner

  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label={`${BRAND_NAME} home`}>
      {inner}
    </Link>
  )
}
