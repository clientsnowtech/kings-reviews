import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireAdmin()

  const rows = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { businesses: true, reviews: true } } },
  })

  const header = ['Name', 'Email', 'Role', 'Businesses', 'Reviews', 'Joined']
  const lines = [header.join(',')]
  for (const u of rows) {
    lines.push(
      [
        u.name ?? '',
        u.email,
        u.role,
        u._count.businesses,
        u._count.reviews,
        u.createdAt.toISOString().slice(0, 10),
      ]
        .map(csvCell)
        .join(','),
    )
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users.csv"',
    },
  })
}
