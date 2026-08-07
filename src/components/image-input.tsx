'use client'

import { useState } from 'react'
import { compressInput } from '@/lib/image-compress'

/**
 * A file input that shrinks what it is given before the form is submitted.
 *
 * Server-rendered forms cannot attach an onChange handler, and the server drops
 * anything over 1 MB — so every image field on the site goes through here.
 */
export function ImageInput({
  name,
  multiple,
  required,
  className,
  hint,
}: {
  name: string
  multiple?: boolean
  required?: boolean
  className?: string
  hint?: string
}) {
  const [busy, setBusy] = useState(false)

  return (
    <>
      <input
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        required={required}
        className={className}
        onChange={async (e) => {
          setBusy(true)
          await compressInput(e.target)
          setBusy(false)
        }}
      />
      {(busy || hint) && <p className="mt-1 text-xs text-muted">{busy ? 'Shrinking…' : hint}</p>}
    </>
  )
}
