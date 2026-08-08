'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Star, ImagePlus, AlertTriangle } from 'lucide-react'
import { createReview, type ActionState } from '@/lib/actions'
import { reviewTextError } from '@/lib/moderation'
import { compressInput } from '@/lib/image-compress'

const initial: ActionState = {}

/** matches the server-side cap in saveImages() */
const MAX_IMAGES = 4

export function ReviewForm({
  businessId,
  existing,
  initialRating,
  bare,
  onDone,
}: {
  businessId: string
  existing?: { rating: number; title: string; body: string } | null
  /** star the user clicked before the form opened */
  initialRating?: number
  /** drop the card chrome — the dialog draws its own */
  bare?: boolean
  /** called once the review is saved, so a dialog can close itself */
  onDone?: () => void
}) {
  const [state, action, pending] = useActionState(createReview, initial)
  const [rating, setRating] = useState(initialRating || existing?.rating || 0)
  const [hover, setHover] = useState(0)
  const [previews, setPreviews] = useState<string[]>([])
  const [dropped, setDropped] = useState(0)
  const [shrinking, setShrinking] = useState(false)

  // Held here rather than left to the DOM: React resets an uncontrolled form
  // once its action returns, so a rejected review used to take the writing with
  // it — the one moment someone least wants to start again.
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')

  // The server runs the same rules, but telling someone their link is a problem
  // only after a round-trip reads like a rejection — say it while they type.
  const [liveErrors, setLiveErrors] = useState<{ title?: string; body?: string }>({})
  const check = (field: 'title' | 'body') => (e: { target: { value: string } }) =>
    setLiveErrors((old) => ({ ...old, [field]: reviewTextError(e.target.value) ?? undefined }))
  const blocked = !!(liveErrors.title || liveErrors.body)

  // object URLs are leaked memory until revoked — keep the live list in a ref
  // so the unmount cleanup can release whatever is still open
  const live = useRef<string[]>([])
  live.current = previews
  useEffect(() => () => live.current.forEach(URL.revokeObjectURL), [])

  // held in a ref so a parent that re-renders on every keystroke cannot make
  // this fire twice
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (state.ok) done.current?.()
  }, [state.ok])

  // The reset that clears the text also empties the file input, which would
  // leave the thumbnails on screen and the photos out of the next attempt. The
  // shrunk files are kept and put back so what you can see is what gets sent.
  const fileInput = useRef<HTMLInputElement>(null)
  const chosenFiles = useRef<File[]>([])
  useEffect(() => {
    const input = fileInput.current
    if (state.ok || !input || input.files?.length || !chosenFiles.current.length) return
    const dt = new DataTransfer()
    chosenFiles.current.forEach((f) => dt.items.add(f))
    input.files = dt.files
  }, [state])

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
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

    // a phone photo is several megabytes; shrink it here rather than have the
    // server drop it for being too big
    setShrinking(true)
    const files = await compressInput(input)
    setShrinking(false)
    chosenFiles.current = files

    setPreviews((old) => {
      old.forEach(URL.revokeObjectURL)
      return files.map((f) => URL.createObjectURL(f))
    })
  }

  if (state.ok) {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
        <p className="font-medium text-brand">Thanks! Your review has been submitted.</p>
        <p className="mt-1 text-sm text-muted">
          It goes live once the business or our team approves it — usually within a day.
        </p>
      </div>
    )
  }

  const shown = hover || rating

  return (
    <form action={action} className={bare ? '' : 'rounded-xl border bg-surface p-6'}>
      {!bare && (
        <h3 className="text-lg font-bold">{existing ? 'Edit your review' : 'Write a review'}</h3>
      )}

      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="rating" value={rating} />

      <div className={`flex gap-1 ${bare ? '' : 'mt-4'}`}>
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
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              check('title')(e)
            }}
            placeholder="Summarise your experience"
            className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
          />
          {(liveErrors.title || state.fieldErrors?.title) && (
            <Err msg={liveErrors.title ?? state.fieldErrors!.title} />
          )}
        </div>
        <div>
          <textarea
            name="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              check('body')(e)
            }}
            rows={5}
            placeholder="Tell others about your experience — what happened, what was good or bad?"
            className="w-full rounded-lg border bg-background p-3 outline-none focus:border-brand"
          />
          {(liveErrors.body || state.fieldErrors?.body) && (
            <Err msg={liveErrors.body ?? state.fieldErrors!.body} />
          )}
          <p className="mt-1 text-xs text-muted">
            No links, websites or contact details, and no abusive language. Reviews are checked
            before they appear.
          </p>
        </div>
      </div>

      {/* photos */}
      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted hover:border-brand hover:text-brand">
          <ImagePlus size={16} />
          Add photos
          <input
            ref={fileInput}
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFiles}
          />
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
          {shrinking
            ? 'Shrinking photos…'
            : `Up to ${MAX_IMAGES} images · JPG, PNG, WebP · large photos are shrunk automatically`}
        </p>
        {dropped > 0 && (
          <p className="mt-1 text-xs text-danger">
            {dropped} extra {dropped === 1 ? 'photo was' : 'photos were'} left out — only the
            first {MAX_IMAGES} are uploaded.
          </p>
        )}
      </div>

      {state.error && <Err msg={state.error} />}

      {blocked && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-danger/40 bg-red-50 p-3 text-sm text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            This review cannot be submitted yet — no links, websites or email addresses, and no
            abusive language.
          </span>
        </p>
      )}

      <button
        disabled={pending || blocked || shrinking}
        className="mt-4 h-11 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Posting…' : existing ? 'Update review' : 'Post review'}
      </button>
    </form>
  )
}

function Err({ msg }: { msg: string }) {
  return <p className="mt-1 text-sm text-danger">{msg}</p>
}
