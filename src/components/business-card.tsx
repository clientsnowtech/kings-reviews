import Link from 'next/link'
import { MapPin, BadgeCheck } from 'lucide-react'
import { Stars } from './stars'
import { colorFrom, initials } from '@/lib/utils'

export type CardBusiness = {
  slug: string
  name: string
  city: string
  state: string
  logo: string | null
  verifiedAt: Date | null
  ratingAvg: number | string | { toString(): string }
  ratingCount: number
  category?: { name: string; slug: string } | null
}

export function BusinessCard({ b }: { b: CardBusiness }) {
  const avg = Number(b.ratingAvg.toString())
  return (
    <Link
      href={`/company/${b.slug}`}
      /* min-w-0 on the card itself is the one that counts: as a grid item its
         min-width defaults to auto, so the track was floored at the card's own
         min-content — 421px on a 390px phone — no matter how freely the rows
         inside it were allowed to shrink. */
      className="group flex min-w-0 gap-4 rounded-2xl border bg-surface p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand hover:shadow-float"
    >
      {b.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.logo}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-lg font-bold text-white"
          style={{ background: colorFrom(b.slug) }}
        >
          {initials(b.name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {/* min-w-0 on every flex item down the chain, not just the outer one.
            `truncate` sets white-space: nowrap, and a flex item's default
            min-width is auto — its own min-content — so a name like "Sai
            Financial Services/Shree Sairam Consultancy Pvt Ltd" reported 436px
            as its floor and pushed that all the way up. A grid track sizes to
            the widest item's min-content, so one long listing gave every phone
            a sideways scroll; the ellipsis only appears once every item in the
            chain is allowed to shrink. */}
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="min-w-0 truncate font-semibold group-hover:text-brand">{b.name}</h3>
          {b.verifiedAt && <BadgeCheck size={16} className="shrink-0 text-brand" />}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <Stars value={avg} size="sm" />
          <span className="text-sm font-medium">{avg.toFixed(1)}</span>
          <span className="text-xs text-muted">({b.ratingCount})</span>
        </div>

        <div className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-muted">
          <MapPin size={13} className="shrink-0" />
          <span className="min-w-0 truncate">
            {b.city}, {b.state}
          </span>
          {b.category && <span className="ml-1 min-w-0 truncate">· {b.category.name}</span>}
        </div>
      </div>
    </Link>
  )
}
