import { test } from 'node:test'
import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import { brandedQrSvg, reviewPosterSvg } from './review-qr'

const URL = 'https://www.trustindexindia.com/company/clients-now-technologies?review=ask'

/** Dark modules outside the three finder eyes and the centre hole. */
function expectedDots(url: string): number {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const size = modules.size
  const hole = (Math.round(size * 0.21) | 1) + 1
  const from = (size - hole) / 2
  const to = from + hole

  let n = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!modules.data[r * size + c]) continue
      const finder = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
      if (finder || (r >= from && r < to && c >= from && c < to)) continue
      n++
    }
  }
  return n
}

test('draws every dark module except the eyes and the logo hole', () => {
  const svg = brandedQrSvg(URL)
  const dots = svg.match(/width="1" height="1"/g)?.length ?? 0
  assert.equal(dots, expectedDots(URL))
})

test('the logo hole stays small enough for level H to recover', () => {
  const { modules } = QRCode.create(URL, { errorCorrectionLevel: 'H' })
  const size = modules.size
  const hole = (Math.round(size * 0.21) | 1) + 1
  // level H recovers 30% — a hole past ~10% of the area leaves no margin for
  // a smudged print, so this is the line the design may not cross
  assert.ok((hole * hole) / (size * size) < 0.1)
})

test('the poster carries the brand, the name and the code', () => {
  const svg = reviewPosterSvg({ name: 'Clients Now Technologies', url: URL })
  assert.match(svg, /TrustIndex/)
  assert.match(svg, /INDIA/)
  assert.match(svg, /Clients Now Technologies/)
  assert.match(svg, /width="1" height="1"/)
  // the printed link is for typing by hand — the review flag only opens a dialog
  assert.ok(!svg.includes('?review=ask'))
})

test('a name with markup characters cannot break the svg', () => {
  const svg = reviewPosterSvg({ name: 'Kumar & Sons "Best" <Bakery>', url: URL })
  assert.match(svg, /Kumar &amp; Sons &quot;Best&quot; &lt;Bakery&gt;/)
})

test('two codes on one page get their own gradient ids', () => {
  const a = brandedQrSvg(URL, 'qr-one')
  const b = brandedQrSvg(URL, 'qr-two')
  assert.match(a, /id="qr-one-mark"/)
  assert.match(b, /id="qr-two-mark"/)
})
