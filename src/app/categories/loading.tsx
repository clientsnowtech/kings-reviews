import { Skeleton, ChipRowSkeleton, LoadingLabel } from '@/components/skeleton'

export default function CategoriesLoading() {
  return (
    <div>
      <LoadingLabel>Loading categories…</LoadingLabel>

      {/* header band */}
      <section className="hero-wash border-b">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-6 w-56 rounded-full" />
          <Skeleton className="mt-4 h-12 w-[22rem] max-w-full" />
          <Skeleton className="mt-4 h-5 w-96 max-w-full" />

          <div className="mt-8 flex flex-wrap gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[62px] w-52 rounded-2xl" />
            ))}
          </div>

          <div className="mt-8">
            <ChipRowSkeleton count={6} />
          </div>
        </div>
      </section>

      {/* explorer */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-12 w-full rounded-full sm:max-w-sm" />
          <Skeleton className="h-4 w-36" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl border bg-surface p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <ChipRowSkeleton count={4 + (i % 3)} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
