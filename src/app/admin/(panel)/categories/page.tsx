import { Plus, Trash2, Save } from 'lucide-react'
import { db } from '@/lib/db'
import { ConfirmButton } from '@/components/admin-ui'
import { SubmitButton } from '@/components/submit-button'
import { createCategory, updateCategory, deleteCategory } from '@/lib/admin-actions'

export const dynamic = 'force-dynamic'

export default async function AdminCategories() {
  const categories = await db.category.findMany({
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { businesses: true } },
      parent: { select: { name: true } },
    },
  })
  const parents = categories.filter((c) => c.parentId === null)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Categories</h2>

      {/* create */}
      <form
        action={createCategory}
        className="grid gap-3 rounded-2xl border bg-surface p-5 sm:grid-cols-[1fr_120px_1fr_auto]"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Name</label>
          <input
            name="name"
            required
            minLength={2}
            placeholder="e.g. Restaurants"
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
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Parent (optional)</label>
          <select
            name="parentId"
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
          >
            <option value="">— none (top level) —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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

      {/* list / edit */}
      <div className="overflow-x-auto rounded-2xl border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b bg-background text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Icon</th>
              <th className="px-4 py-3 w-20">Sort</th>
              <th className="px-4 py-3">Parent</th>
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
                      className="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:border-brand"
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
                <td className="px-4 py-2 text-muted">{c.parent?.name ?? '—'}</td>
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
