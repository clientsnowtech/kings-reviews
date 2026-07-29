'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Star, ImagePlus } from 'lucide-react'
import { createReview, type ActionState } from '@/lib/actions'

const initial: ActionState = {}

/** matches the server-side cap in saveImages() */
const MAX_IMAGES = 4

export function ReviewForm({
  businessId,
  existing,
}: {
  businessId: string
  existing?: { rating: number; title: string; body: string } | null
}) {
  const [state, action, pending] = useActionState(createReview, initial)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [previews, setPreviews] = useState<string[]>([])
  const [dropped, setDropped] = useState(0)

  // object URLs are leaked memory until revoked — keep the live list in a ref
  // so the unmount cleanup can release whatever is still open
  const live = useRef<string[]>([])
  live.current = previews
  useEffect(() => () => live.current.forEach(URL.revokeObjectURL), [])

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const picked = Array.from(input.files ?? [])

    // trim the input itself, otherwise the extras are uploaded and then
    // silently discarded by the server cap
    if (picked.length > MAX_IMAGES) {
      const dt = new DataTransfer()
      picked.slice(0, MAX_IMAGES).forEach((f) => dt.items.add(f))
      input.files = dt.files
    }
    setDropped(Math.max(0, picked.length - MAX_IMAGES))

    const next = Array.from(input.files ?? []).map((f) => URL.createObjectURL(f))
    setPreviews((old) => {
      old.forEach(URL.revokeObjectURL)
      return next
    })
  }

  if (state.ok) {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
        <p className="font-medium text-brand">Thanks! Your review has been posted.</p>
      </div>
    )
  }

  const shown = hover || rating

  return (
    <form action={action} className="rounded-xl border bg-surface p-6">
      <h3 className="text-lg font-bold">{existing ? 'Edit your review' : 'Write a review'}</h3>

      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="mt-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
            aria-label={`${n} star`}
          >
            <Star
              size={30}
              className={n <= shown ? 'text-star' : 'text-star-empty'}
              fill={n <= shown ? 'var(--star)' : 'var(--star-empty)'}
            />
          </button>
        ))}
      </div>
      {state.fieldErrors?.rating && <Err msg={state.fieldErrors.rating} />}

      <div className="mt-4 space-y-3">
        <div>
          <input
            name="title"
            defaultValue={existing?.title}
            placeholder="Summarise your experience"
            className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
          />
          {state.fieldErrors?.title && <Err msg={state.fieldErrors.title} />}
        </div>
        <div>
          <textarea
            name="body"
            defaultValue={existing?.body}
            rows={5}
            placeholder="Tell others about your experience — what happened, what was good or bad?"
            className="w-full rounded-lg border bg-background p-3 outline-none focus:border-brand"
          />
          {state.fieldErrors?.body && <Err msg={state.fieldErrors.body} />}
        </div>
      </div>

      {/* photos */}
      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted hover:border-brand hover:text-brand">
          <ImagePlus size={16} />
          Add photos
          <input type="file" name="images" accept="image/*" multiple className="hidden" onChange={onFiles} />
        </label>
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <span key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-16 w-16 rounded-lg border object-cover" />
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-muted">
          Up to {MAX_IMAGES} images · JPG, PNG, WebP · 5 MB each
        </p>
        {dropped > 0 && (
          <p className="mt-1 text-xs text-danger">
            {dropped} extra {dropped === 1 ? 'photo was' : 'photos were'} left out — only the
            first {MAX_IMAGES} are uploaded.
          </p>
        )}
      </div>

      {state.error && <Err msg={state.error} />}

      <button
        disabled={pending}
        className="mt-4 h-11 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? 'Posting…' : existing ? 'Update review' : 'Post review'}
      </button>
    </form>
  )
}

function Err({ msg }: { msg: string }) {
  return <p className="mt-1 text-sm text-danger">{msg}</p>
}
