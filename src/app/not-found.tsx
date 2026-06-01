import Link from "next/link";
import { Compass, MapPin } from "lucide-react";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-24 text-center lg:px-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-stone-300 bg-[#fbfaf6] text-emerald-800">
          <Compass className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold text-stone-950 sm:text-4xl">
          This city isn&apos;t on the map.
        </h1>
        <p className="mt-3 max-w-md text-base leading-7 text-stone-600">
          The page you&apos;re looking for doesn&apos;t exist or hasn&apos;t been published yet.
          Head back to the map to see where the trip has been.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Back to the map
        </Link>
      </main>
      <AppFooter />
    </>
  );
}
