import { Skeleton, StatTileSkeleton, LoadingLabel } from '@/components/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <LoadingLabel>Loading business panel…</LoadingLabel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>

      <section>
        <Skeleton className="mb-3 h-3.5 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="rounded-xl border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-5 w-36 rounded-sm" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="mb-3 h-3.5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border bg-surface p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
              <Skeleton className="mt-3 h-4 w-24 rounded-sm" />
              <Skeleton className="mt-2 h-3.5 w-1/2" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
