import { Skeleton, StatTileSkeleton, ListSkeleton, LoadingLabel } from '@/components/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <LoadingLabel>Loading admin panel…</LoadingLabel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>

      <section>
        <Skeleton className="mb-3 h-3.5 w-40" />
        <ListSkeleton rows={8} />
      </section>
    </div>
  )
}
