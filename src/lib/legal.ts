/**
 * Single source of truth for the legal pages.
 *
 * The DPDP Act requires the same fiduciary identity and the same grievance
 * contact wherever they appear, so privacy / terms / grievance all read these
 * rather than each hard-coding a copy that drifts on the next edit.
 */

import { BRAND_EMAIL, BRAND_NAME } from './brand'

export const LEGAL_ENTITY = process.env.NEXT_PUBLIC_APP_NAME ?? BRAND_NAME

/** Grievance Officer under IT Rules 2021 + contact for DPDPA data-principal requests. */
export const GRIEVANCE = {
  name: 'Grievance Officer',
  email: BRAND_EMAIL,
  phone: '+91 89680 27027',
  /** tel: href — no spaces, country code included */
  phoneHref: '+918968027027',
  /** IT Rules 2021, r.3(2)(a): acknowledge in 24 hours, dispose in 15 days. */
  ackHours: 24,
  resolveDays: 15,
} as const

/**
 * Registered office. Kept in parts as well as one line, because schema.org
 * PostalAddress wants the parts and the pages want the line.
 */
export const OFFICE = {
  line1: 'D-606, 607 & 608, Titanium Business Park',
  line2: 'Near Makarba Under Bridge, Makarba',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '380051',
  country: 'India',
  full: 'D-606, 607 & 608, Titanium Business Park, near Makarba Under Bridge, Makarba, Ahmedabad, Gujarat 380051',
} as const

export const OFFICE_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  OFFICE.full,
)}`

/** Shown on every legal page so a reader can tell which version they agreed to. */
export const LEGAL_UPDATED = '7 August 2026'
