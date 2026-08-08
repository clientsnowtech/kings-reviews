'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Img = { id: number | string; path: string; alt?: string }

export function PhotoLightbox({
  images,
  thumbClass,
}: {
  images: Img[]
  thumbClass?: string
}) {
  const [idx, setIdx] = useState<number | null>(null)
  const open = idx !== null

  const close = useCallback(() => setIdx(null), [])
  const prev = useCallback(
    () => setIdx((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length],
  )
  const next = useCallback(
    () => setIdx((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, prev, next])

  return (
    <>
      {images.map((img, i) => (
        <button
          key={img.id}
          type="button"
          onClick={() => setIdx(i)}
          className="shrink-0 cursor-zoom-in overflow-hidden rounded-lg"
          aria-label="Open photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.path}
            alt={img.alt ?? ''}
            className={cn('object-cover transition duration-300 hover:scale-105 hover:opacity-90', thumbClass)}
          />
        </button>
      ))}

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              aria-label="Previous photo"
              className="absolute left-2 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:left-4"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            // keyed on the index so stepping through the gallery replays the
            // entry animation — otherwise arrow keys just hard-cut the src
            key={idx}
            src={images[idx].path}
            alt={images[idx].alt ?? ''}
            className="animate-scale-in max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              aria-label="Next photo"
              className="absolute right-2 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:right-4"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {images.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {idx + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  )
}
