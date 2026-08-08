import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

/** Hard ceiling per image. The browser shrinks pictures before they are sent
 *  (see src/lib/image-compress.ts), so this only catches what gets past that. */
export const MAX_UPLOAD_BYTES = 1024 * 1024 // 1 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export type ImageKind = 'jpg' | 'png' | 'gif' | 'webp'

/**
 * Identify an image by its leading bytes.
 *
 * `file.type` is whatever the browser chose to send, and a script can send
 * anything — so it decides nothing on its own. The signature does. Returns null
 * for anything that is not one of the four formats we accept.
 */
export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null

  const at = (i: number) => bytes[i]
  const ascii = (start: number, text: string) =>
    text.split('').every((ch, i) => at(start + i) === ch.charCodeAt(0))

  // FF D8 FF — every JPEG variant opens with this SOI plus a marker
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpg'

  // \x89PNG\r\n\x1a\n
  if (
    at(0) === 0x89 &&
    ascii(1, 'PNG') &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  ) {
    return 'png'
  }

  if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) return 'gif'

  // RIFF container carrying a WEBP fourcc — bytes 4-7 are the chunk length
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'webp'

  return null
}

/** Save uploaded image files to /public/uploads/<subdir> and return their web paths. */
export async function saveImages(
  files: File[],
  subdir: string,
  max = 4,
): Promise<string[]> {
  const dir = path.join(process.cwd(), 'public', 'uploads', subdir)
  const out: string[] = []
  let made = false

  for (const file of files) {
    if (out.length >= max) break
    if (!file || typeof file.arrayBuffer !== 'function') continue
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) continue
    if (!ALLOWED.has(file.type)) continue

    // The declared type only got it this far. The extension — which is what
    // decides the Content-Type these files are later served with — comes from
    // the bytes, so a disguised upload cannot pick its own.
    const buf = Buffer.from(await file.arrayBuffer())
    const ext = sniffImageType(buf)
    if (!ext) continue

    if (!made) {
      await mkdir(dir, { recursive: true })
      made = true
    }
    const name = `${Date.now()}-${randomBytes(5).toString('hex')}.${ext}`
    await writeFile(path.join(dir, name), buf)
    out.push(`/uploads/${subdir}/${name}`)
  }
  return out
}

/**
 * Remove files previously returned by saveImages(). Best-effort: a missing file
 * must not fail the surrounding action, and anything that is not one of our own
 * /uploads/ paths is ignored so a bad row can never reach outside the folder.
 */
export async function deleteUploads(paths: string[]): Promise<void> {
  const root = path.join(process.cwd(), 'public', 'uploads')

  await Promise.all(
    paths.map(async (p) => {
      if (!p?.startsWith('/uploads/')) return
      const abs = path.join(process.cwd(), 'public', p)
      if (!path.resolve(abs).startsWith(path.resolve(root))) return
      try {
        await unlink(abs)
      } catch {
        /* already gone */
      }
    }),
  )
}
