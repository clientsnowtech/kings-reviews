import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { db } from '@/lib/db'
import { BusinessImportForm } from '@/components/business-import-form'

export const dynamic = 'force-dynamic'

/** header → what it means, in the order the sample file uses */
const COLUMNS: [string, string][] = [
  ['name', 'Required. The listing name.'],
  ['category', 'Required. A category name or slug that already exists (see below).'],
  ['extra_categories', 'Other categories, separated by | — commas belong to the CSV itself.'],
  ['email', 'Required. The business’s own email — shown publicly.'],
  ['phone', 'Required.'],
  ['website', 'Full URL with https://'],
  ['address, city, state, pincode', 'City and state are required.'],
  ['description, tagline, founded_year', 'Optional profile fields.'],
  ['whatsapp, instagram, facebook, map_url', 'Optional. Public contact buttons.'],
  [
    'contact_name, contact_role',
    'The person behind the listing. Never shown on the public profile.',
  ],
  ['contact_email, contact_phone', 'How to reach that person. Also kept private.'],
  ['owner_email', "Who owns the listing. Blank uses the row's own email."],
  ['status', 'LIVE or PENDING. Blank uses the dropdown below.'],
]

export default async function AdminImportBusinesses() {
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    select: { name: true },
  })

  return (
    <div className="max-w-3xl space-y-5">
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to businesses
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Import businesses from CSV</h2>
          <p className="mt-1 text-sm text-muted">
            Every row is judged on its own — a bad row is reported by line number and the rest still
            land.
          </p>
        </div>
        <a
          href="/samples/businesses-sample.csv"
          download
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted hover:bg-mint"
        >
          <Download size={15} /> Sample CSV
        </a>
      </div>

      <BusinessImportForm />

      <details className="rounded-2xl border bg-surface p-5 text-sm">
        <summary className="cursor-pointer font-semibold">Columns</summary>
        <p className="mt-3 text-muted">
          Header names are matched loosely — <code>Founded Year</code>, <code>founded_year</code> and{' '}
          <code>foundedyear</code> are the same column, and extra columns are ignored.
        </p>
        <dl className="mt-3 space-y-2">
          {COLUMNS.map(([header, meaning]) => (
            <div key={header} className="sm:flex sm:gap-3">
              <dt className="font-mono text-xs sm:w-64 sm:shrink-0">{header}</dt>
              <dd className="text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </details>

      <details className="rounded-2xl border bg-surface p-5 text-sm">
        <summary className="cursor-pointer font-semibold">
          Category names you can use ({categories.length})
        </summary>
        <p className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span key={c.name} className="rounded-full border px-2 py-0.5 text-xs text-muted">
              {c.name}
            </span>
          ))}
        </p>
        <p className="mt-3 text-xs text-muted">
          A row naming anything else fails instead of guessing —{' '}
          <Link href="/admin/categories" className="text-brand hover:underline">
            add the category first
          </Link>
          .
        </p>
      </details>
    </div>
  )
}
