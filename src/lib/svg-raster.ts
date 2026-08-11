/**
 * SVG → PNG on the server, with the fonts we ship rather than the host's.
 *
 * sharp draws SVG text through rsvg/pango, which asks fontconfig for a family.
 * A desktop answers with Segoe UI or Nirmala UI; the cPanel box answers with
 * nothing at all, and every glyph in the mailed QR card came out as a box. So
 * fontconfig is pointed at `assets/fonts` and nowhere else: the same four Noto
 * files decide the picture on a laptop and on the server, and Devanagari has a
 * face that can actually draw it.
 *
 * The environment has to be set before sharp loads — pango reads fontconfig
 * once, on first use — which is why sharp is imported inside the call.
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `assets/fonts`, found from the working directory or from this file — a cron
 * line that forgets to cd is otherwise a mail full of boxes again.
 */
const FONT_DIR = [
  join(process.cwd(), 'assets', 'fonts'),
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'fonts'),
].find(existsSync)

/** The family names the SVGs ask for. Keep in step with `review-qr.ts`. */
export const RASTER_FONT = 'Noto Sans'
export const RASTER_FONT_HI = 'Noto Sans Devanagari'

function xml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Write a fontconfig file that knows only our font directory, and point the
 * process at it. Unknown families (`system-ui`, `Segoe UI`) then resolve to
 * Noto Sans instead of to nothing, so a stack that misses still draws letters.
 */
async function bundledFonts(): Promise<void> {
  if (!FONT_DIR) return

  const dir = join(tmpdir(), 'trustindex-fontconfig')
  const cache = join(dir, 'cache')
  await mkdir(cache, { recursive: true })

  const file = join(dir, 'fonts.conf')
  await writeFile(
    file,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${xml(FONT_DIR)}</dir>
  <cachedir>${xml(cache)}</cachedir>
  <match target="pattern">
    <test qual="any" name="family"><string>sans-serif</string></test>
    <edit name="family" mode="prepend" binding="strong"><string>${RASTER_FONT}</string></edit>
  </match>
</fontconfig>
`,
    'utf8',
  )

  process.env.FONTCONFIG_FILE = file
  process.env.FONTCONFIG_PATH = dir
}

let fonts: Promise<void> | null = null

/** Draw an SVG string as a PNG buffer. Throws if sharp is not installed. */
export async function svgToPng(svg: string): Promise<Buffer> {
  fonts ??= bundledFonts()
  await fonts
  const sharp = (await import('sharp')).default
  return sharp(Buffer.from(svg)).png().toBuffer()
}