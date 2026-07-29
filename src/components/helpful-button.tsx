'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp } from 'lucide-react'
import { toggleHelpful } from '@/lib/actions'
import { cn } from '@/lib/utils'

export function HelpfulButton({
  reviewId,
  initialCount,
  initialVoted,
}: {
  reviewId: string
  initialCount: number
  initialVoted: boolean
}) {
  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(initialVoted)
  const [pending, start] = useTransition()

  function onClick() {
    const prevCount = count
    const prevVoted = voted
    const nextVoted = !prevVoted
    // optimistic
    setVoted(nextVoted)
    setCount(prevCount + (nextVoted ? 1 : -1))

    start(async () => {
      try {
        const res = await toggleHelpful(reviewId)
        setVoted(res.voted)
        setCount(res.helpfulCount)
      } catch {
        setVoted(prevVoted)
        setCount(prevCount)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={voted}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition disabled:opacity-60',
        voted
          ? 'border-brand bg-brand/10 text-brand'
          : 'text-muted hover:border-brand hover:text-brand',
      )}
    >
      <ThumbsUp size={13} /> Helpful{count > 0 && <span className="tabular-nums">· {count}</span>}
    </button>
  )
}
