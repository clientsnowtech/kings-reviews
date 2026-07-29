import { Skeleton, LoadingLabel } from '@/components/skeleton'

export default function MyReviewsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LoadingLabel>Loading your reviews…</LoadingLabel>

      <Skeleton className="h-8 w-48" />

      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border bg-surface p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="mt-3 h-4 w-24 rounded-sm" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
