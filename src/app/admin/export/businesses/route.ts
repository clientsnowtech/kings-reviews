import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireAdmin()

  const rows = await db.business.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } }, owner: { select: { email: true } } },
  })

  const header = ['Name', 'Category', 'Status', 'City', 'State', 'Owner', 'Rating', 'Reviews', 'Created']
  const lines = [header.join(',')]
  for (const b of rows) {
    lines.push(
      [
        b.name,
        b.category.name,
        b.status,
        b.city,
        b.state,
        b.owner.email,
        Number(b.ratingAvg).toFixed(2),
        b.ratingCount,
        b.createdAt.toISOString().slice(0, 10),
      ]
        .map(csvCell)
        .join(','),
    )
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="businesses.csv"',
    },
  })
}
