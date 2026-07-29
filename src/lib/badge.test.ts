import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BADGE_SIZES,
  CREDIT_URL,
  badgeAltText,
  nextTier,
  parseTheme,
  parseVariant,
  renderBadgeSvg,
  tierFor,
  type BadgeInput,
} from './badge'

const base: BadgeInput = {
  name: 'Sharma Electronics',
  ratingAvg: 4.6,
  ratingCount: 240,
  verified: false,
  variant: 'card',
  theme: 'light',
}

test('tier ladder needs both volume and rating', () => {
  assert.equal(tierFor(0, 0).key, 'rated')
  assert.equal(tierFor(99, 5).key, 'rated')
  assert.equal(tierFor(100, 1).key, 'silver', 'silver has no rating gate')
  assert.equal(tierFor(500, 4).key, 'gold')
  assert.equal(tierFor(500, 3.9).key, 'silver', 'volume alone must not buy gold')
  assert.equal(tierFor(2000, 4.5).key, 'diamond')
  assert.equal(tierFor(50_000, 4.4).key, 'gold', 'a poor average caps the tier')
})

test('nextTier reports what is still missing', () => {
  const fromBase = nextTier(10, 4.9)
  assert.equal(fromBase?.tier.key, 'silver')
  assert.equal(fromBase?.needed, 90)
  assert.equal(fromBase?.ratingNeeded, 0)

  const ratingBlocked = nextTier(900, 3.5)
  assert.equal(ratingBlocked?.tier.key, 'gold')
  assert.equal(ratingBlocked?.needed, 0, 'review count already cleared')
  assert.equal(ratingBlocked?.ratingNeeded, 4)

  assert.equal(nextTier(9000, 5), null, 'diamond is the top rung')
})

test('base tier never claims verification', () => {
  assert.equal(tierFor(0, 0).label, 'Rated')
  assert.ok(!renderBadgeSvg(base).includes('VERIFIED'))
})

test('verified listings get a tick and say so in alt text', () => {
  const svg = renderBadgeSvg({ ...base, verified: true })
  assert.ok(svg.includes('#0e7a63'), 'tick disc uses the brand teal')
  assert.ok(badgeAltText({ ...base, verified: true }).includes('verified business'))
  assert.ok(!badgeAltText(base).includes('verified'))
})

test('every variant renders a well-formed, self-contained svg', () => {
  for (const variant of ['card', 'strip', 'micro'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      const svg = renderBadgeSvg({ ...base, variant, theme })
      const size = BADGE_SIZES[variant]
      assert.ok(svg.startsWith('<svg '), `${variant}/${theme} starts with an svg tag`)
      assert.ok(svg.trimEnd().endsWith('</svg>'))
      assert.ok(svg.includes(`width="${size.width}"`))
      assert.ok(svg.includes(`height="${size.height}"`))
      assert.ok(!svg.includes('xlink:href'), 'no external refs')
      assert.ok(svg.includes(CREDIT_URL), 'build credit travels with the artwork')
      assert.equal(
        (svg.match(/<svg /g) ?? []).length,
        1,
        `${variant}/${theme} renders exactly one root`,
      )
    }
  }
})

test('ids are namespaced so two inlined badges cannot collide', () => {
  const a = renderBadgeSvg(base)
  const z = renderBadgeSvg({ ...base, ratingCount: 4200, ratingAvg: 4.8 })
  const idOf = (svg: string) => /id="(ti-tier-[a-z0-9]+)"/.exec(svg)?.[1]
  assert.ok(idOf(a))
  assert.notEqual(idOf(a), idOf(z))
  assert.equal(idOf(a), idOf(renderBadgeSvg(base)), 'same input, same id')
})

test('user input cannot break out of the markup', () => {
  const svg = renderBadgeSvg({ ...base, name: '<script>alert("x")</script> & Sons' })
  assert.ok(!svg.includes('<script>'))
  assert.ok(svg.includes('&amp;') || svg.includes('&lt;'))
})

test('query params fall back instead of throwing', () => {
  assert.equal(parseVariant('strip'), 'strip')
  assert.equal(parseVariant('nonsense'), 'card')
  assert.equal(parseVariant(null), 'card')
  assert.equal(parseTheme('dark'), 'dark')
  assert.equal(parseTheme('neon'), 'light')
})

test('ratings are clamped before they reach the star clip', () => {
  for (const ratingAvg of [-3, 0, 7]) {
    const svg = renderBadgeSvg({ ...base, ratingAvg })
    const clip = /<clipPath id="ti-stars[^"]*"><rect [^>]*width="([\d.]+)"/.exec(svg)
    assert.ok(clip, 'star clip exists')
    const width = Number(clip[1])
    assert.ok(width >= 0 && width <= 120, `clip width ${width} stays inside the row`)
  }
})
