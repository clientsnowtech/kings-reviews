'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Star } from 'lucide-react'
import { Modal } from '@/components/modal'
import { LoginPanel } from '@/components/login-panel'
import { ReviewForm } from '@/components/review-form'

type Existing = { rating: number; title: string; body: string } | null

/**
 * Google's flow: the stars and the button open one dialog. Signed out, it
 * carries the login panel; signed in, the review form — so nobody loses the
 * page they were reading to go and log in.
 */
export function ReviewDialog({
  businessId,
  businessName,
  slug,
  signedIn,
  existing,
  variant = 'button',
}: {
  businessId: string
  businessName: string
  slug: string
  signedIn: boolean
  existing?: Existing
  variant?: 'button' | 'card'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  // Google sign-in leaves the page, so the dialog re-opens on the way back.
  const [signedInNow, setSignedInNow] = useState(signedIn)

  useEffect(() => setSignedInNow(signedIn), [signedIn])

  // read from location rather than useSearchParams: this component sits inside
  // a server page that would otherwise need a Suspense boundary around it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('review')) return

    const stars = Number(params.get('review'))
    if (stars >= 1 && stars <= 5) setRating(stars)
    setOpen(true)

    params.delete('review')
    const q = params.toString()
    window.history.replaceState(null, '', `/company/${slug}${q ? `?${q}` : ''}`)
  }, [slug])

  const close = useCallback(() => setOpen(false), [])

  // where Google should land after it takes over the whole window
  const callback = `/company/${slug}?review=${rating || 5}`

  const dialog = (
    <Modal
      open={open}
      onClose={close}
      title={
        signedInNow
          ? existing
            ? 'Edit your review'
            : `Review ${businessName}`
          : 'Log in to review'
      }
    >
      {signedInNow ? (
        <ReviewForm
          bare
          businessId={businessId}
          existing={existing}
          initialRating={rating}
          onDone={() => {
            close()
            router.refresh()
          }}
        />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">
            Reviews come from real accounts, so log in first — it takes a moment and you stay on
            this page.
          </p>
          <LoginPanel next={callback} onSuccess={() => setSignedInNow(true)} />
        </>
      )}
    </Modal>
  )

  if (variant === 'card') {
    const lit = hover || existing?.rating || 0
    return (
      <div className="rounded-xl border bg-surface p-6 text-center shadow-soft">
        <h3 className="font-semibold">{existing ? 'Your review' : `Rate ${businessName}`}</h3>
        <p className="mt-1 text-sm text-muted">
          {existing ? 'Change your rating or wording any time.' : 'Tell others how it went.'}
        </p>

        <div className="mt-3 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star`}
              onClick={() => {
                setRating(n)
                setOpen(true)
              }}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
            >
              <Star
                size={30}
                className={n <= lit ? 'text-star' : 'text-star-empty'}
                fill={n <= lit ? 'var(--star)' : 'var(--star-empty)'}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-sm font-medium text-white transition hover:bg-brand-strong"
        >
          <PenLine size={16} /> {existing ? 'Edit your review' : 'Write a review'}
        </button>

        {dialog}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand-strong"
      >
        <PenLine size={15} /> Write a review
      </button>
      {dialog}
    </>
  )
}
