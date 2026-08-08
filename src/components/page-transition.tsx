'use client'

import { usePathname } from 'next/navigation'

/**
 * Fades each route in on arrival. Keyed on the pathname so the wrapper remounts
 * per navigation and the animation actually replays — without the key React
 * swaps the children in place and nothing moves.
 *
 * Deliberately not keyed on search params: filter and paging changes repaint the
 * same page, and re-animating those makes a list feel slower than it is.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  )
}
