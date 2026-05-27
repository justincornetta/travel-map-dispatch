import Link from "next/link";
import { Compass, LockKeyhole, MessageSquareText } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { JourneyTimeline } from "@/components/JourneyTimeline";
import { MapSection } from "@/components/MapSection";
import { getPublicStops } from "@/lib/data";

export default async function Home({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const stops = await getPublicStops();
  const { focus } = await searchParams;
  const current = stops.find((stop) => stop.status === "current");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
        <section className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-stone-300 bg-[#fbfaf6] px-3 py-2 text-sm font-medium text-stone-700">
              <Compass className="h-4 w-4 text-emerald-800" aria-hidden="true" />
              City-level updates from the road
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
              Follow the trip through each city, photo, and dispatch.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
              Tap around the map to see where the journey has been, where it is now, and what is
              coming next. Each city has its own feed of posts and photos.
            </p>
          </div>
          <div className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-4">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-1 h-5 w-5 text-amber-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-stone-950">SMS subscribers</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Get a short SMS each time a new city goes live — with a link straight into the
                  feed.
                </p>
              </div>
            </div>
            <Link
              href="/subscribe"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              Get text updates
            </Link>
          </div>
        </section>

        <MapSection stops={stops} focusSlug={focus} />
        <JourneyTimeline stops={stops} />

        {current ? (
          <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-amber-900">Current city</p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{current.locationLabel}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">{current.teaser}</p>
          </section>
        ) : null}
      </main>
    </>
  );
}
