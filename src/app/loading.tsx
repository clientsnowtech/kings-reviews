import { Skeleton, LoadingLabel } from '@/components/skeleton'

/** Neutral fallback for any segment without its own loading.tsx. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <LoadingLabel />

      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />

      <div className="mt-8 space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  )
}
