import { db } from '@/lib/db'
import { verificationReadiness, type Readiness } from '@/lib/verification'

/**
 * Database-backed half of the verification checklist. Kept apart from the pure
 * rules so the rules stay importable — and testable — without booting Prisma.
 */

/** Same checklist, read straight from the database. Server callers only. */
export async function businessReadiness(businessId: string): Promise<Readiness | null> {
  const b = await db.business.findUnique({
    where: { id: businessId },
    select: {
      logo: true,
      cover: true,
      description: true,
      website: true,
      address: true,
      pincode: true,
      mapUrl: true,
      _count: { select: { hours: true, images: true } },
    },
  })
  if (!b) return null

  return verificationReadiness({
    logo: b.logo,
    cover: b.cover,
    description: b.description,
    website: b.website,
    address: b.address,
    pincode: b.pincode,
    mapUrl: b.mapUrl,
    hours: b._count.hours,
    images: b._count.images,
  })
}
