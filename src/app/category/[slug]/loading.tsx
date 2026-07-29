import { Skeleton, BusinessGridSkeleton, ChipRowSkeleton, LoadingLabel } from '@/components/skeleton'

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <LoadingLabel>Loading category…</LoadingLabel>

      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
      </div>

      {/* sub-categories */}
      <div className="mt-5">
        <ChipRowSkeleton count={6} />
      </div>

      {/* sort + cities */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>

      <div className="mt-6">
        <BusinessGridSkeleton count={9} />
      </div>
    </div>
  )
}
