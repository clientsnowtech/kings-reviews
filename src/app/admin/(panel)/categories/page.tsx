import Link from 'next/link'
import { Plus, Trash2, Save, Search } from 'lucide-react'
import { db } from '@/lib/db'
import { ConfirmButton } from '@/components/admin-ui'
import { SubmitButton } from '@/components/submit-button'
import { createCategory, updateCategory, deleteCategory } from '@/lib/admin-actions'

export const dynamic = 'force-dynamic'

/** ~4,000 categories ship with the app, so this page is paged, not a full dump. */
const PER_PAGE = 50

export default async function AdminCategories({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const sp = await searchParams
  const query = (sp.q ?? '').trim()
  const page = Math.max(1, Number(sp.page) || 1)
  const where = query ? { name: { contains: query } } : {}

  const [categories, total] = await Promise.all([
    db.category.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { businesses: true } } },
    }),
    db.category.count({ where }),
  ])
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE))

  const qs = (over: Record<string, string>) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    for (const [k, v] of Object.entries(over)) params.set(k, v)
    return `/admin/categories?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Categories</h2>

      {/* create */}
      <form
        action={createCategory}
        className="grid gap-3 rounded-2xl border bg-surface p-5 sm:grid-cols-[1fr_140px_auto]"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Name</label>
          <input
            name="name"
            required
            minLength={2}
            placeholder="e.g. Restaurant"
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Icon</label>
          <input
            name="icon"
            placeholder="utensils"
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex items-end">
          <SubmitButton
            pendingLabel="Adding…"
            className="h-9 gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong"
          >
            <Plus size={15} /> Add
          </SubmitButton>
        </div>
      </form>

      {/* search */}
      <form action="/admin/categories" className="flex items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border bg-surface px-3">
          <Search size={15} className="shrink-0 text-muted" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search categories"
            className="h-full w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button className="h-10 shrink-0 rounded-lg border px-4 text-sm font-medium hover:bg-mint">
          Search
        </button>
      </form>

      <p className="text-sm text-muted">
        {total.toLocaleString('en-IN')} {query ? `matching “${query}”` : 'categories'} — page {page} of{' '}
        {pageCount}
      </p>

      {/* list / edit */}
      <div className="overflow-x-auto rounded-2xl border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b bg-background text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Icon</th>
              <th className="px-4 py-3 w-20">Sort</th>
              <th className="px-4 py-3 text-center">Listings</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b align-middle last:border-0">
                <td className="px-4 py-2">
                  <form action={updateCategory} id={`cat-${c.id}`} className="contents">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="name"
                      defaultValue={c.name}
                      className="h-8 w-full min-w-48 rounded-md border bg-background px-2 text-sm outline-none focus:border-brand"
                    />
                  </form>
                </td>
                <td className="px-4 py-2">
                  <input
                    form={`cat-${c.id}`}
                    name="icon"
                    defaultValue={c.icon ?? ''}
                    placeholder="—"
                    className="h-8 w-28 rounded-md border bg-background px-2 text-sm outline-none focus:border-brand"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    form={`cat-${c.id}`}
                    name="sort"
                    type="number"
                    defaultValue={c.sort}
                    className="h-8 w-16 rounded-md border bg-background px-2 text-sm outline-none focus:border-brand"
                  />
                </td>
                <td className="px-4 py-2 text-center">{c._count.businesses}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      form={`cat-${c.id}`}
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-brand hover:bg-mint"
                    >
                      <Save size={13} /> Save
                    </button>
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton
                        message={
                          c._count.businesses > 0
                            ? `"${c.name}" has ${c._count.businesses} listings and cannot be deleted. Move them first.`
                            : `Delete category "${c.name}"?`
                        }
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-danger disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={qs({ page: String(page - 1) })} className="rounded-lg border px-3 py-2 hover:border-brand">
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-muted opacity-50">Previous</span>
          )}
          <span className="text-muted">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={qs({ page: String(page + 1) })} className="rounded-lg border px-3 py-2 hover:border-brand">
              Next
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-muted opacity-50">Next</span>
          )}
        </nav>
      )}

      <p className="text-xs text-muted">
        Icon uses a{' '}
        <a href="https://lucide.dev/icons" className="text-brand hover:underline" target="_blank" rel="noreferrer">
          lucide
        </a>{' '}
        icon name. Categories with listings can’t be deleted.
      </p>
    </div>
  )
}
