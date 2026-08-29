import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verificationReadiness, MIN_DESCRIPTION, MIN_IMAGES } from './verification'

const complete = {
  logo: '/u/logo.png',
  cover: '/u/cover.png',
  description: 'x'.repeat(MIN_DESCRIPTION),
  website: 'https://example.com',
  address: '12 Market Road',
  pincode: '390001',
  mapUrl: 'https://maps.google.com/?q=shop',
  hours: 7,
  images: MIN_IMAGES,
}

test('a finished listing may ask for verification', () => {
  const r = verificationReadiness(complete)
  assert.equal(r.ready, true)
  assert.equal(r.pct, 100)
  assert.deepEqual(r.missing, [])
})

test('every missing task keeps the request locked', () => {
  for (const key of Object.keys(complete) as (keyof typeof complete)[]) {
    const r = verificationReadiness({ ...complete, [key]: typeof complete[key] === 'number' ? 0 : null })
    assert.equal(r.ready, false, `${key} should be required`)
    assert.equal(r.missing.length, 1)
  }
})

test('whitespace is not a filled field', () => {
  const r = verificationReadiness({ ...complete, mapUrl: '   ' })
  assert.equal(r.ready, false)
  assert.equal(r.missing[0].key, 'map')
})

test('a short description does not count', () => {
  const r = verificationReadiness({ ...complete, description: 'x'.repeat(MIN_DESCRIPTION - 1) })
  assert.equal(r.missing[0].key, 'description')
})

test('too few photos does not count', () => {
  const r = verificationReadiness({ ...complete, images: MIN_IMAGES - 1 })
  assert.equal(r.missing[0].key, 'images')
  assert.equal(r.pct, Math.round(((r.total - 1) / r.total) * 100))
})
