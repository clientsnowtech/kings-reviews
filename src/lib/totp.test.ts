import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  base32Encode,
  base32Decode,
  currentCode,
  verifyCode,
  generateSecret,
  generateBackupCodes,
  hashBackupCodes,
  spendBackupCode,
  otpauthUrl,
  parseBackupCodes,
} from './totp'

/** RFC 6238 appendix B uses the ASCII seed "12345678901234567890". */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

test('base32 survives a round trip', () => {
  const buf = Buffer.from('12345678901234567890')
  assert.deepEqual(base32Decode(base32Encode(buf)), buf)
  // apps print the key in groups, so spaces and case must not matter
  assert.deepEqual(base32Decode('gezd gnbv gy3t qojq'), base32Decode('GEZDGNBVGY3TQOJQ'))
})

test('matches the RFC 6238 SHA-1 vectors', () => {
  assert.equal(currentCode(RFC_SECRET, 59_000), '287082')
  assert.equal(currentCode(RFC_SECRET, 1_111_111_109_000), '081804')
  assert.equal(currentCode(RFC_SECRET, 1_234_567_890_000), '005924')
})

test('accepts one step of clock drift either way, not two', () => {
  const now = 1_234_567_890_000
  const code = currentCode(RFC_SECRET, now)
  assert.ok(verifyCode(RFC_SECRET, code, now))
  assert.ok(verifyCode(RFC_SECRET, code, now + 30_000))
  assert.ok(verifyCode(RFC_SECRET, code, now - 30_000))
  assert.equal(verifyCode(RFC_SECRET, code, now + 90_000), false)
})

test('rejects junk without throwing', () => {
  assert.equal(verifyCode(RFC_SECRET, ''), false)
  assert.equal(verifyCode(RFC_SECRET, '12345'), false)
  assert.equal(verifyCode(RFC_SECRET, 'abcdef'), false)
  assert.equal(verifyCode('', '123456'), false)
})

test('generated secrets are 160-bit and usable', () => {
  const secret = generateSecret()
  assert.equal(base32Decode(secret).length, 20)
  assert.ok(verifyCode(secret, currentCode(secret)))
})

test('a backup code works once and then never again', () => {
  const codes = generateBackupCodes()
  assert.equal(codes.length, 8)

  const hashes = hashBackupCodes(codes)
  const left = spendBackupCode(hashes, codes[0])
  assert.ok(left)
  assert.equal(left.length, 7)
  assert.equal(spendBackupCode(left, codes[0]), null)

  // the dash and the case are cosmetic
  assert.ok(spendBackupCode(hashes, codes[1].replace('-', '').toLowerCase()))
  assert.equal(spendBackupCode(hashes, 'ZZZZ-ZZZZ'), null)
})

test('parseBackupCodes shrugs off anything that is not our JSON', () => {
  assert.deepEqual(parseBackupCodes(null), [])
  assert.deepEqual(parseBackupCodes('not json'), [])
  assert.deepEqual(parseBackupCodes('{"a":1}'), [])
  assert.deepEqual(parseBackupCodes('["a", 2, "b"]'), ['a', 'b'])
})

test('the otpauth URI carries what an authenticator app reads', () => {
  const url = otpauthUrl({ secret: RFC_SECRET, label: 'asha@example.com' })
  // the space in the brand name is percent-encoded in the label, not literal
  assert.ok(url.startsWith('otpauth://totp/Kings%20Reviews%3Aasha%40example.com?'))
  const params = new URLSearchParams(url.split('?')[1])
  assert.equal(params.get('secret'), RFC_SECRET)
  assert.equal(params.get('issuer'), 'Kings Reviews')
  assert.equal(params.get('digits'), '6')
  assert.equal(params.get('period'), '30')
})
