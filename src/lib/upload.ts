import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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
    if (file.size === 0 || file.size > MAX_BYTES) continue
    if (!ALLOWED.has(file.type)) continue

    if (!made) {
      await mkdir(dir, { recursive: true })
      made = true
    }
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const name = `${Date.now()}-${randomBytes(5).toString('hex')}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
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
