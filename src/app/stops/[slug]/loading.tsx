export default function LoadingCityFeed() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header skeleton */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
        </div>
      </header>

      {/* Feed skeleton */}
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mb-8">
            <div className="mb-2 h-3 w-16 animate-pulse rounded bg-white/10" />
            <div className="mb-3 h-4 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-white/10" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
