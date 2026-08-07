'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquareText, Building2, BarChart3, Award, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/business/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/business/dashboard/reviews', label: 'Reviews', icon: MessageSquareText },
  { href: '/business/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/business/dashboard/badge', label: 'Trust badge', icon: Award },
  { href: '/business/dashboard/businesses', label: 'My businesses', icon: Building2 },
]

export function BusinessSidebar({
  unreplied,
  newReviews = 0,
  pendingReviews = 0,
}: {
  unreplied: number
  newReviews?: number
  /** reviews waiting for the owner to approve them — nothing is public yet */
  pendingReviews?: number
}) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              active ? 'bg-brand text-white' : 'text-muted hover:bg-mint hover:text-foreground',
            )}
          >
            <Icon size={17} />
            <span>{label}</span>
            {href === '/business/dashboard/reviews' && newReviews > 0 && (
              <span
                className="h-2 w-2 rounded-full bg-star"
                title={`${newReviews} new since last visit`}
              />
            )}
            {/* approvals outrank replies: an unapproved review is invisible to
                everyone until the owner acts on it */}
            {href === '/business/dashboard/reviews' && pendingReviews > 0 && (
              <span
                className={cn(
                  'ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-white/25 text-white' : 'bg-amber-500 text-white',
                )}
                title={`${pendingReviews} awaiting your approval`}
              >
                {pendingReviews}
              </span>
            )}
            {href === '/business/dashboard/reviews' && pendingReviews === 0 && unreplied > 0 && (
              <span
                className={cn(
                  'ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-white/25 text-white' : 'bg-brand text-white',
                )}
              >
                {unreplied}
              </span>
            )}
          </Link>
        )
      })}

      <Link
        href="/business/dashboard/businesses/new"
        className="mt-1 flex shrink-0 items-center gap-2.5 rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-muted transition hover:border-brand hover:text-brand"
      >
        <Plus size={17} />
        <span>Add business</span>
      </Link>
    </nav>
  )
}
