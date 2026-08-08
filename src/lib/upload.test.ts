import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sniffImageType } from './upload'

/** Pad a signature out past the 12-byte minimum the sniffer needs. */
function withHeader(...bytes: number[]) {
  const out = new Uint8Array(32)
  out.set(bytes)
  return out
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

test('recognises the four formats we accept', () => {
  assert.equal(sniffImageType(withHeader(0xff, 0xd8, 0xff, 0xe0)), 'jpg')
  assert.equal(sniffImageType(withHeader(0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a)), 'png')
  assert.equal(sniffImageType(withHeader(...ascii('GIF89a'))), 'gif')
  assert.equal(sniffImageType(withHeader(...ascii('GIF87a'))), 'gif')
  // RIFF, then a four-byte length, then the WEBP fourcc
  assert.equal(sniffImageType(withHeader(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP'))), 'webp')
})

test('rejects a payload wearing an image content type', () => {
  // The exact case the client-supplied type could not catch: a script POSTing
  // HTML while claiming image/png.
  assert.equal(sniffImageType(withHeader(...ascii('<!doctype html><script>'))), null)
  assert.equal(sniffImageType(withHeader(...ascii('%PDF-1.7'))), null)
  // RIFF, but a WAVE rather than a WEBP
  assert.equal(sniffImageType(withHeader(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE'))), null)
})

test('rejects anything too short to carry a signature', () => {
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff])), null)
  assert.equal(sniffImageType(new Uint8Array()), null)
})
