import { Skeleton, BusinessCardSkeleton, LoadingLabel } from '@/components/skeleton'

export default function HomeLoading() {
  return (
    <div>
      <LoadingLabel>Loading homepage…</LoadingLabel>

      {/* hero */}
      <section className="hero-wash border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Skeleton className="h-6 w-64 rounded-full" />
            <Skeleton className="mt-5 h-12 w-4/5 sm:h-14" />
            <Skeleton className="mt-3 h-12 w-3/5 sm:h-14" />
            <Skeleton className="mt-3 h-12 w-2/3 sm:h-14" />
            <Skeleton className="mt-5 h-5 w-full max-w-md" />
            <Skeleton className="mt-2 h-5 w-3/4 max-w-md" />
            <Skeleton className="mt-8 h-14 w-full max-w-md rounded-full" />
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>

          <div className="relative mx-auto hidden h-[440px] w-full max-w-md lg:block">
            <Skeleton className="absolute inset-x-0 top-6 h-64 rounded-3xl" />
            <Skeleton className="absolute -left-4 bottom-8 h-32 w-60 rounded-2xl" />
            <Skeleton className="absolute -right-4 top-0 h-40 w-52 rounded-2xl" />
          </div>
        </div>
      </section>

      {/* stats band */}
      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border shadow-soft sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 bg-white px-4 py-6">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="mt-1 h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </section>

      {/* why */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-2xl border bg-surface p-6 shadow-soft">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="mt-4 h-5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border bg-surface shadow-soft">
              <Skeleton className="h-28 w-full rounded-none" />
              <div className="flex items-center justify-between px-4 py-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* recent reviews */}
      <section className="border-y bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Skeleton className="mb-8 h-8 w-80" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="mt-3 h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-4/5" />
                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* top rated */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="mb-8 h-8 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <BusinessCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
