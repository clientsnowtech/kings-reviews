/**
 * Browser-side image shrinking, so a 6 MB phone photo becomes a ~200 KB upload.
 *
 * The server caps uploads at 1 MB (MAX_UPLOAD_BYTES). Rejecting big files there
 * would just punish people for owning a modern camera, so the picture is
 * resized and re-encoded here first — no dependency, canvas is enough.
 */

/** Longest edge after resizing. Enough for a full-width photo on a 2x screen. */
const MAX_EDGE = 1600
const TARGET_BYTES = 900 * 1024 // stay under the 1 MB server cap with room to spare
const QUALITIES = [0.82, 0.7, 0.6, 0.5]

/** Animated GIFs would lose their animation on a canvas — leave them alone. */
const SKIP = new Set(['image/gif'])

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('not an image'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * Returns a smaller version of `file`, or the original when it is already small
 * or cannot be processed. Never throws — a failed shrink must not stop someone
 * from posting, and the server still has the final say.
 */
export async function compressImage(file: File): Promise<File> {
  if (SKIP.has(file.type) || !file.type.startsWith('image/')) return file
  if (file.size <= TARGET_BYTES) return file
  if (typeof document === 'undefined') return file

  try {
    const img = await loadImage(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // step the quality down until it fits; transparency is lost to JPEG, which
    // is the trade every photo upload makes anyway
    for (const q of QUALITIES) {
      const blob = await toBlob(canvas, q)
      if (!blob) break
      if (blob.size <= TARGET_BYTES || q === QUALITIES[QUALITIES.length - 1]) {
        if (blob.size >= file.size) return file
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
        return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
      }
    }
    return file
  } catch {
    return file
  }
}

/** Compresses a picked file list and writes it back onto the input element. */
export async function compressInput(input: HTMLInputElement): Promise<File[]> {
  const picked = Array.from(input.files ?? [])
  if (!picked.length) return []

  const done = await Promise.all(picked.map(compressImage))
  const dt = new DataTransfer()
  done.forEach((f) => dt.items.add(f))
  input.files = dt.files
  return done
}
