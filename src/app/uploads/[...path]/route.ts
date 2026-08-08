import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import path from 'path'

/**
 * Serves user uploads.
 *
 * `public/` only carries what was there when the build ran — a file written
 * after that is never served, which is exactly what every uploaded logo, cover
 * and review photo is. So the bytes are streamed from disk here instead, and
 * the stored `/uploads/...` paths keep working as written.
 */
const ROOT = path.join(process.cwd(), 'public', 'uploads')

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params

  // A stored path is data like any other: it does not get to climb out of the
  // uploads folder, whatever the database or the URL says.
  const file = path.resolve(ROOT, ...parts)
  if (!file.startsWith(ROOT + path.sep)) return new Response('Not found', { status: 404 })

  const type = TYPES[path.extname(file).toLowerCase()]
  if (!type) return new Response('Not found', { status: 404 })

  let size: number
  try {
    const info = await stat(file)
    if (!info.isFile()) return new Response('Not found', { status: 404 })
    size = info.size
  } catch {
    return new Response('Not found', { status: 404 })
  }

  // Names carry a timestamp and a random suffix, so a given URL is one file for
  // ever — worth caching hard rather than re-reading it on every page view.
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
