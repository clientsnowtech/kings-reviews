'use client'

import { useState } from 'react'

export type CategoryGroup = {
  id: number
  name: string
  children: { id: number; name: string }[]
}

/**
 * Two-level category selector: pick a parent Category, then a Sub-category.
 * The sub-category <select> carries `name` (default "categoryId") — that leaf id
 * is what the business is stored against.
 */
export function CategoryPicker({
  groups,
  defaultCategoryId,
  error,
  name = 'categoryId',
}: {
  groups: CategoryGroup[]
  defaultCategoryId?: number
  error?: string
  name?: string
}) {
  const initialParent =
    defaultCategoryId != null
      ? (groups.find((g) => g.children.some((c) => c.id === defaultCategoryId))?.id ?? '')
      : ''

  const [parent, setParent] = useState<number | ''>(initialParent)
  const children = groups.find((g) => g.id === parent)?.children ?? []

  const select = 'h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand'

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium">
          Category <span className="text-danger">*</span>
        </label>
        <select
          value={parent}
          onChange={(e) => setParent(e.target.value ? Number(e.target.value) : '')}
          className={select}
        >
          <option value="" disabled>
            Select a category
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Sub-category <span className="text-danger">*</span>
        </label>
        {/* key forces a fresh default when the parent changes */}
        <select
          key={parent}
          name={name}
          defaultValue={defaultCategoryId != null ? String(defaultCategoryId) : ''}
          disabled={!parent}
          className={`${select} disabled:opacity-60`}
        >
          <option value="" disabled>
            {parent ? 'Select a sub-category' : 'Pick a category first'}
          </option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    </div>
  )
}
