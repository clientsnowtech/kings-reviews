import { Skeleton, BusinessGridSkeleton, LoadingLabel } from '@/components/skeleton'

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <LoadingLabel>Searching…</LoadingLabel>

      <Skeleton className="h-7 w-80 max-w-full" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-6">
        <BusinessGridSkeleton count={9} />
      </div>
    </div>
  )
}
