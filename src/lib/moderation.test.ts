import test from 'node:test'
import assert from 'node:assert/strict'
import { hasLink, hasPhone, hasAbuse, hasWord, reviewTextError } from './moderation'

const LINKS = [
  'Visit https://spam.example for cheaper rates',
  'check www.cheapdeals.in now',
  'order from bestdeals.com, much better',
  'their page is example.in/offers',
  'mail me at ravi.kumar@example.com',
  'go to bestdeals (dot) com',
]

const CLEAN = [
  'Great service, the staff were patient and the work was done in a day.',
  'Terrible.Online booking never worked and nobody picked up the phone.',
  'Good.in fact better than the shop next door.',
  'They charged 2.5x what was quoted.',
]

const ABUSE = [
  'the manager is a complete asshole',
  'total f.u.c.k up, avoid',
  'ch00tiya staff, took my money',
  'MADARCHOD service',
]

const RUDE_BUT_ALLOWED = [
  'Rude, slow and overpriced. Worst experience I have had.',
  'The class was a shambles and the assistant was hitting the wrong keys.',
]

test('links and contact details are caught', () => {
  for (const s of LINKS) assert.equal(hasLink(s), true, s)
})

test('ordinary reviews are not mistaken for links', () => {
  for (const s of CLEAN) assert.equal(hasLink(s), false, s)
})

test('phone numbers are caught, prices and amounts are not', () => {
  for (const s of ['call me on 98765 43210', 'whatsapp 9876543210', '+91-98765-43210'])
    assert.equal(hasPhone(s), true, s)
  for (const s of ['paid ₹2,500 for 2 hours', 'waited 45 minutes on 12 March 2026'])
    assert.equal(hasPhone(s), false, s)
})

test('abuse is caught through spacing and leetspeak', () => {
  for (const s of ABUSE) assert.equal(hasAbuse(s), true, s)
})

test('harsh criticism is left alone', () => {
  for (const s of RUDE_BUT_ALLOWED) assert.equal(hasAbuse(s), false, s)
})

test('admin-added words match with the same tolerance', () => {
  assert.equal(hasWord('what a bewakoof shop', ['bewakoof']), true)
  assert.equal(hasWord('b.e.w.a.k.o.o.f staff', ['bewakoof']), true)
  assert.equal(hasWord('perfectly fine review', ['bewakoof']), false)
  assert.equal(hasWord('anything at all', []), false)
})

test('reviewTextError reports the reason, or nothing', () => {
  assert.match(reviewTextError('see www.spam.com')!, /Links/)
  assert.match(reviewTextError('what a bunch of bastards')!, /abusive/)
  assert.equal(reviewTextError('Clean, quick and fairly priced.'), null)
})
