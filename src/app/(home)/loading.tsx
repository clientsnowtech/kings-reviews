import { Skeleton, BusinessCardSkeleton, LoadingLabel } from '@/components/skeleton'

export default function HomeLoading() {
  return (
    <div>
      <LoadingLabel>Loading homepage…</LoadingLabel>

      {/* hero — centred, the same column the page draws: badge, a two-line
          headline, the strap, the search bar, then the rating row */}
      <section className="hero-wash border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            <Skeleton className="h-7 w-60 rounded-full" />
            <Skeleton className="mt-5 h-12 w-full max-w-xl sm:h-14" />
            <Skeleton className="mt-3 h-12 w-4/5 max-w-lg sm:h-14" />
            <Skeleton className="mt-5 h-5 w-full max-w-md" />
            <Skeleton className="mt-2 h-5 w-2/3 max-w-md" />
            <Skeleton className="mt-8 h-14 w-full max-w-xl rounded-full" />
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-40" />
            </div>
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

      {/* categories — heading on the left, "View all" on the right */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <Skeleton className="h-4 w-16" />
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

      {/* recent reviews — the heading carries an icon beside it */}
      <section className="border-y bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-8 w-80" />
          </div>
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
        <div className="mb-8 flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <BusinessCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* how it works — centred heading, three numbered cards */}
      <section className="border-t bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Skeleton className="mx-auto h-8 w-72" />
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-7 shadow-soft">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="mt-5 h-5 w-1/2" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* popular cities — a row of pills */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="mb-6 h-7 w-52" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-full" />
          ))}
        </div>
      </section>

      {/* business CTA — one solid block, the only thing on the page that is
          brand-coloured rather than a card */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Skeleton className="h-56 w-full rounded-[2rem] sm:h-48" />
      </section>
    </div>
  )
}
