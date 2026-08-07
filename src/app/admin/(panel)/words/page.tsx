import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { addBlockedWord, deleteBlockedWord } from '@/lib/admin-actions'
import { SubmitButton } from '@/components/submit-button'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function WordsPage() {
  await requireAdmin()
  const words = await db.blockedWord.findMany({ orderBy: { word: 'asc' } })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Blocked words</h1>
        <p className="mt-1 text-sm text-muted">
          Extra words rejected in reviews and replies, on top of the built-in list. Matching
          already ignores spacing, repeats and leetspeak, so add the plain spelling only — and
          keep it to words that are abusive in every context.
        </p>
      </div>

      <form action={addBlockedWord} className="flex flex-wrap gap-2">
        <input
          name="word"
          required
          minLength={2}
          maxLength={60}
          placeholder="Add a word"
          className="h-10 w-64 rounded-lg border bg-background px-3 text-sm outline-none focus:border-brand"
        />
        <SubmitButton
          pendingLabel="Adding…"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Add
        </SubmitButton>
      </form>

      {words.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">
          No extra words yet — the built-in list is doing the work.
        </p>
      ) : (
        <div className="divide-y rounded-xl border bg-surface">
          {words.map((w) => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-mono text-sm">{w.word}</span>
              <span className="text-xs text-muted">added {formatDate(w.createdAt)}</span>
              <form action={deleteBlockedWord} className="ml-auto">
                <input type="hidden" name="id" value={w.id} />
                <SubmitButton
                  pendingLabel="Removing…"
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50"
                >
                  Remove
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
