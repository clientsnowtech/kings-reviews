import { db } from '@/lib/db'
import { Pagination } from '@/components/pagination'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PER_PAGE = 40

export default async function AdminAudit({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageRaw } = await searchParams
  const page = Math.max(1, Number(pageRaw) || 1)

  const [total, logs] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])
  const pageCount = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Audit log</h2>
      <p className="text-sm text-muted">Every admin action, most recent first.</p>

      {logs.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">No actions logged yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b bg-background text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-2">{l.actorEmail}</td>
                  <td className="px-4 py-2">
                    <code className="rounded bg-background px-1.5 py-0.5 text-xs">{l.action}</code>
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {l.entity} <span className="text-xs opacity-60">{l.entityId.slice(0, 12)}</span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2 text-muted">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/audit" page={page} pageCount={pageCount} total={total} />
    </div>
  )
}
