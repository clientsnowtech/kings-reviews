import { Skeleton, ReviewCardSkeleton, LoadingLabel } from '@/components/skeleton'

export default function CompanyLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <LoadingLabel>Loading business profile…</LoadingLabel>

      {/* breadcrumb */}
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* header card */}
      <div className="overflow-hidden rounded-2xl border bg-surface shadow-soft">
        <Skeleton className="h-40 w-full rounded-none sm:h-56" />

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end">
          <Skeleton className="-mt-16 h-24 w-24 shrink-0 rounded-2xl border-4 border-surface" />

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-2/3" />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          {/* score box */}
          <div className="shrink-0 overflow-hidden rounded-xl border text-center max-sm:w-full">
            <Skeleton className="h-1.5 w-full rounded-none" />
            <div className="px-5 py-3">
              <Skeleton className="mx-auto h-9 w-16" />
              <Skeleton className="mx-auto mt-2 h-5 w-28 rounded-sm" />
              <Skeleton className="mx-auto mt-2 h-3 w-20" />
            </div>
          </div>
        </div>

        {/* contact chips */}
        <div className="flex flex-wrap gap-2 border-t bg-background/40 px-6 py-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* description */}
      <div className="mt-6 rounded-2xl border bg-surface p-6 shadow-soft">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="mt-2 h-3.5 w-full" />
        <Skeleton className="mt-2 h-3.5 w-3/4" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* reviews column */}
        <div className="order-2 lg:order-1">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <ReviewCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* write-review sidebar */}
        <aside className="order-1 lg:order-2">
          <div className="rounded-2xl border bg-surface p-5 shadow-soft">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-4 h-8 w-40 rounded-sm" />
            <Skeleton className="mt-4 h-10 w-full rounded-lg" />
            <Skeleton className="mt-3 h-24 w-full rounded-lg" />
            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
          </div>
        </aside>
      </div>
    </div>
  )
}
