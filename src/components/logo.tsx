import Link from 'next/link'

const SIZES = {
  sm: { tile: 28, star: 15, radius: 8, text: 'text-base' },
  md: { tile: 32, star: 17, radius: 9, text: 'text-lg' },
} as const

type LogoProps = {
  size?: keyof typeof SIZES
  href?: string | null
  showText?: boolean
  className?: string
}

/** Brand mark + wordmark. Minimal gradient tile, crisp star, tight wordmark. */
export function Logo({ size = 'md', href = '/', showText = true, className = '' }: LogoProps) {
  const s = SIZES[size]

  const mark = (
    <svg
      width={s.tile}
      height={s.tile}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="TrustIndex"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="ti-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12876d" />
          <stop offset="1" stopColor="#0a5b49" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx={s.radius} fill="url(#ti-brand)" />
      {/* soft top highlight for depth */}
      <rect width="32" height="16" rx={s.radius} fill="#ffffff" opacity="0.10" />
      {/* crisp centered checkmark */}
      <path
        d="M9.5 16.4l4 4 9-9.4"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* subtle inset edge */}
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx={s.radius - 0.5}
        stroke="#ffffff"
        strokeOpacity="0.14"
      />
    </svg>
  )

  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      {showText && (
        <>
          <span
            className="flex flex-col justify-center leading-none"
            style={{ height: s.tile }}
          >
            <span className={`inline-flex items-baseline gap-1 font-bold tracking-tight ${s.text}`}>
              <span className="text-foreground">Trust</span>
              <span className="text-brand">Index</span>
            </span>
            <span className="-mt-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.35em] text-muted">
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              India
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </span>
          </span>
        </>
      )}
    </span>
  )

  if (href === null) return inner

  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label="TrustIndex home">
      {inner}
    </Link>
  )
}
