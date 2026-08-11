'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  MessageSquareText,
  Flag,
  Users,
  Tags,
  BadgeCheck,
  ScrollText,
  ShieldBan,
  Mail,
  DatabaseBackup,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/verifications', label: 'Verifications', icon: BadgeCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/words', label: 'Blocked words', icon: ShieldBan },
  { href: '/admin/communication', label: 'Communication', icon: Mail },
  { href: '/admin/backups', label: 'Backups', icon: DatabaseBackup },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
]

export function AdminSidebar({
  openReports,
  pendingBusinesses = 0,
}: {
  openReports: number
  /** listings nobody has approved yet — invisible to the public until then */
  pendingBusinesses?: number
}) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              active
                ? 'bg-brand text-white'
                : 'text-muted hover:bg-mint hover:text-foreground',
            )}
          >
            <Icon size={17} />
            <span>{label}</span>
            {href === '/admin/businesses' && pendingBusinesses > 0 && (
              <span
                className={cn(
                  'ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-white/25 text-white' : 'bg-amber-500 text-white',
                )}
                title={`${pendingBusinesses} waiting for approval`}
              >
                {pendingBusinesses}
              </span>
            )}
            {href === '/admin/reports' && openReports > 0 && (
              <span
                className={cn(
                  'ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-white/25 text-white' : 'bg-danger text-white',
                )}
              >
                {openReports}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
