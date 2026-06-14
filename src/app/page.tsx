import { Compass } from "lucide-react";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { ExploreSection } from "@/components/ExploreSection";
import { TripStats } from "@/components/TripStats";
import { getPublicStops } from "@/lib/data";

export default async function Home({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const stops = await getPublicStops();
  const { focus } = await searchParams;
  const current = stops.find((stop) => stop.status === "current");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
        <section className="mb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-stone-300 bg-[#fbfaf6] px-3 py-2 text-sm font-medium text-stone-700">
            <Compass className="h-4 w-4 text-emerald-800" aria-hidden="true" />
            City-level updates from the road
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
            Welcome to the Travel Blog. Follow the trip through each city.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
            Tap around the map to see where the journey has been, where it is now, and what is
            coming next. Each city has its own feed of posts and photos.
          </p>
        </section>

        <TripStats stops={stops} />
        <ExploreSection stops={stops} focusSlug={focus} />

        {current ? (
          <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-amber-900">Current city</p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{current.locationLabel}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">{current.teaser}</p>
          </section>
        ) : null}
      </main>
      <AppFooter />
    </>
  );
}
