import { Skeleton, BusinessGridSkeleton, ChipRowSkeleton, LoadingLabel } from '@/components/skeleton'

export default function BusinessesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <LoadingLabel>Loading businesses…</LoadingLabel>

      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />

      {/* search */}
      <Skeleton className="mt-6 h-12 w-full rounded-full" />

      {/* category chips */}
      <div className="mt-5">
        <ChipRowSkeleton count={8} />
      </div>

      {/* sort + city */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="ml-auto h-9 w-40 rounded-full" />
      </div>

      <div className="mt-6">
        <BusinessGridSkeleton count={12} />
      </div>
    </div>
  )
}
