'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquareText, User, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/my/reviews', label: 'My reviews', icon: MessageSquareText },
  { href: '/my/profile', label: 'Profile', icon: User },
  { href: '/my/security', label: 'Security', icon: ShieldCheck },
]

export function AccountTabs() {
  const pathname = usePathname()

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
