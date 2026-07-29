'use client'

import { useActionState } from 'react'
import { replyToReview, type ActionState } from '@/lib/actions'

const initial: ActionState = {}

export function ReplyForm({
  reviewId,
  existing,
}: {
  reviewId: string
  existing?: string | null
}) {
  const [state, action, pending] = useActionState(replyToReview, initial)

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <textarea
        name="body"
        defaultValue={existing ?? ''}
        rows={2}
        placeholder="Write a public reply…"
        className="w-full rounded-lg border bg-background p-2 text-sm outline-none focus:border-brand"
      />
      {state.fieldErrors?.body && <p className="text-sm text-danger">{state.fieldErrors.body}</p>}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="mt-1 flex items-center gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? 'Saving…' : existing ? 'Update reply' : 'Reply'}
        </button>
        {state.ok && <span className="text-sm text-brand">Saved</span>}
      </div>
    </form>
  )
}
