'use client'

import { useState } from 'react'

const CLAMP = 360 // characters before we collapse

export function ReviewBody({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > CLAMP

  if (!long) {
    return (
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{text}</p>
    )
  }

  return (
    <div className="mt-1">
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {open ? text : text.slice(0, CLAMP).trimEnd() + '…'}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-sm font-medium text-brand hover:underline"
      >
        {open ? 'Show less' : 'Read more'}
      </button>
    </div>
  )
}
