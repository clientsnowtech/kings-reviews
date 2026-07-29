import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  await requireAdmin()

  const rows = await db.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      business: { select: { name: true } },
    },
  })

  const header = ['Business', 'Reviewer', 'Email', 'Rating', 'Title', 'Body', 'Status', 'Created']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.business.name,
        r.user.name ?? '',
        r.user.email,
        r.rating,
        r.title,
        r.body,
        r.status,
        r.createdAt.toISOString().slice(0, 10),
      ]
        .map(csvCell)
        .join(','),
    )
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reviews.csv"',
    },
  })
}
