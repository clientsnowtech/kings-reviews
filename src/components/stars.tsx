import { cn } from '@/lib/utils'

const SIZES = { sm: 14, md: 18, lg: 24, xl: 32 } as const

export function Stars({
  value,
  size = 'md',
  className,
}: {
  value: number
  size?: keyof typeof SIZES
  className?: string
}) {
  const px = SIZES[size]
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span
      className={cn('relative inline-block leading-none align-middle', className)}
      style={{ width: px * 5 + 4 * 4, height: px }}
      aria-label={`${value.toFixed(1)} out of 5`}
      role="img"
    >
      <StarRow px={px} color="var(--star-empty)" />
      <span
        className="absolute left-0 top-0 overflow-hidden"
        style={{ width: `${pct}%`, height: px }}
      >
        <StarRow px={px} color="var(--star)" />
      </span>
    </span>
  )
}

function StarRow({ px, color }: { px: number; color: string }) {
  return (
    <span className="flex" style={{ gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={px} height={px} viewBox="0 0 24 24" fill={color} aria-hidden>
          <path d="M12 2l2.9 6.26 6.1.53-4.6 4.01 1.38 6.7L12 16.9 6.22 19.5 7.6 12.8 3 8.79l6.1-.53z" />
        </svg>
      ))}
    </span>
  )
}
