import type { Metadata } from 'next'

import { BRAND_NAME } from './brand'

/**
 * SEO helpers shared by the category pages.
 *
 * Canonicals are written relative — `metadataBase` in the root layout turns
 * them absolute, so the host lives in exactly one place.
 */

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? BRAND_NAME
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3300'

/** Trim to a length search engines actually render, without cutting mid-word. */
export function clampDescription(text: string, max = 158) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`
}

/** "Mumbai, Delhi and Pune" — reads like a sentence, not a CSV. */
export function humanList(items: string[], max = 3) {
  const list = items.slice(0, max)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

type CategoryMetaInput = {
  name: string
  slug: string
  /** live listings in this category, after the city filter */
  count: number
  /** cities with a listing, most relevant first */
  cities: string[]
  /** the ?city= filter in play, if any */
  city?: string
  /** true when a non-default sort is applied — those views are duplicates */
  filteredView?: boolean
  reviewCount?: number
  averageRating?: number
}

/**
 * Full head for a category page: title, description, keywords, canonical,
 * Open Graph and Twitter.
 *
 * City views get their own canonical because "plumbers in Pune" is a genuinely
 * different page. Sort views do not — the same listings in another order is a
 * duplicate, so they canonicalise back and stay out of the index.
 */
export function categoryMetadata({
  name,
  slug,
  count,
  cities,
  city,
  filteredView,
  reviewCount,
  averageRating,
}: CategoryMetaInput): Metadata {
  const place = city ?? 'India'
  const title = `Best ${name} in ${place} — Reviews & Ratings`

  const scope = count > 0 ? `${count} verified ${name.toLowerCase()}` : name.toLowerCase()
  const ratings =
    reviewCount && reviewCount > 0
      ? ` Read ${reviewCount.toLocaleString('en-IN')} genuine customer reviews${
          averageRating ? ` averaging ${averageRating.toFixed(1)}★` : ''
        }.`
      : ' Read genuine customer reviews before you choose.'
  // Comma list, not humanList(): "A, B and C and more" reads like a typo.
  const where = city
    ? ` in ${city}`
    : cities.length
      ? ` across ${cities.slice(0, 3).join(', ')}${cities.length > 3 ? ' and more' : ''}`
      : ''

  const description = clampDescription(
    `Compare ${scope}${where} on ${SITE_NAME}.${ratings} Ratings, contact details and photos — free to browse.`,
  )

  const path = `/category/${slug}`
  const canonical = city ? `${path}?city=${encodeURIComponent(city)}` : path

  return {
    title,
    description,
    keywords: [
      name,
      `best ${name}`,
      `${name} reviews`,
      `${name} in ${place}`,
      `top rated ${name}`,
      `${name} near me`,
      ...cities.slice(0, 5).map((c) => `${name} in ${c}`),
    ],
    alternates: { canonical },
    // A re-sorted list is the same content — index one copy, follow the links.
    robots: filteredView ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: canonical,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

type CityMetaInput = {
  /** the city as it is written on the listings */
  name: string
  slug: string
  /** live listings in this city, after the category filter */
  count: number
  /** the states this name appears in */
  states: string[]
  /** the ?category= filter in play, by name */
  category?: string
  /** true when a non-default sort or a later page is showing */
  filteredView?: boolean
}

/**
 * Head for a city page.
 *
 * "Businesses in Ahmedabad" is what people type, and the only URL that answered
 * it was a query string on /businesses — which no crawler was ever given a
 * reason to follow. A category inside a city gets its own canonical for the
 * same reason a city inside a category does; sorts and later pages canonicalise
 * back, because reordering the same listings is not a new page.
 */
export function cityMetadata({
  name,
  slug,
  count,
  states,
  category,
  filteredView,
}: CityMetaInput): Metadata {
  const region = states.length === 1 ? `${name}, ${states[0]}` : name
  const title = category
    ? `Best ${category} in ${name} — Reviews & Ratings`
    : `Businesses in ${name} — Reviews & Ratings`

  const description = clampDescription(
    `Browse ${count.toLocaleString('en-IN')} verified ${
      category ? `${category.toLowerCase()} ` : ''
    }listing${count === 1 ? '' : 's'} in ${region} on ${SITE_NAME}. Ratings, contact details and genuine customer reviews — free to browse.`,
  )

  const path = `/city/${slug}`
  const canonical = category ? `${path}?category=${encodeURIComponent(category)}` : path

  return {
    title,
    description,
    keywords: [
      `businesses in ${name}`,
      `companies in ${name}`,
      `${name} business directory`,
      `top rated businesses in ${name}`,
      ...(category ? [`${category} in ${name}`, `best ${category} in ${name}`] : []),
    ],
    alternates: { canonical },
    robots: filteredView ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: 'website', siteName: SITE_NAME, url: canonical, title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

type ListedBusiness = {
  slug: string
  name: string
}

/**
 * CollectionPage + ItemList + BreadcrumbList for a category.
 *
 * The ItemList carries positions, names and URLs only — ratings belong on each
 * business page, and repeating AggregateRating on a list page is the kind of
 * markup Google treats as spam.
 */
export function categoryJsonLd({
  name,
  slug,
  description,
  businesses,
  city,
}: {
  name: string
  slug: string
  description: string
  businesses: ListedBusiness[]
  city?: string
}) {
  const url = `${SITE_URL}/category/${slug}${city ? `?city=${encodeURIComponent(city)}` : ''}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: city ? `${name} in ${city}` : name,
        description,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Categories', item: `${SITE_URL}/categories` },
            { '@type': 'ListItem', position: 3, name, item: `${SITE_URL}/category/${slug}` },
          ],
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#listings`,
        name: city ? `${name} in ${city}` : `${name} in India`,
        numberOfItems: businesses.length,
        itemListElement: businesses.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/company/${b.slug}`,
          name: b.name,
        })),
      },
    ],
  }
}

/**
 * CollectionPage + ItemList + BreadcrumbList for a city.
 *
 * Same shape as the category graph, and the same restraint: names and URLs
 * only, because repeating a rating on a list page is markup Google reads as
 * spam. The place itself is stated once, so the page is about a location rather
 * than about the word.
 */
export function cityJsonLd({
  name,
  slug,
  states,
  description,
  businesses,
  category,
}: {
  name: string
  slug: string
  states: string[]
  description: string
  businesses: ListedBusiness[]
  category?: string
}) {
  const url = `${SITE_URL}/city/${slug}${category ? `?category=${encodeURIComponent(category)}` : ''}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: category ? `${category} in ${name}` : `Businesses in ${name}`,
        description,
        about: {
          '@type': 'City',
          name,
          ...(states.length === 1
            ? { containedInPlace: { '@type': 'AdministrativeArea', name: states[0] } }
            : {}),
        },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Cities', item: `${SITE_URL}/cities` },
            { '@type': 'ListItem', position: 3, name, item: `${SITE_URL}/city/${slug}` },
          ],
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#listings`,
        name: category ? `${category} in ${name}` : `Businesses in ${name}`,
        numberOfItems: businesses.length,
        itemListElement: businesses.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/company/${b.slug}`,
          name: b.name,
        })),
      },
    ],
  }
}
