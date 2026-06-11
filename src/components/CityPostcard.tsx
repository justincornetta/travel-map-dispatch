import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImageOff } from "lucide-react";

import { countryFlagUrl } from "@/lib/flags";
import type { Stop } from "@/lib/types";
import { formatDateRange } from "@/lib/utils";

// A vintage-postcard rendering of the selected city, shown beside the map in
// place of the old "open feed" panel. Headline photo on the left, a short
// summary (the city's teaser) on the right, and a country-flag "stamp" with a
// faux postmark in the top-right corner.
export function CityPostcard({ stop }: { stop: Stop }) {
  const photo = stop.photos[0];
  const hasFeed = stop.posts.length > 0;
  const dates = formatDateRange(stop.arrivalDate, stop.departureDate);
  const year = (stop.arrivalDate ?? stop.departureDate ?? "").slice(0, 4);

  const card = (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-stone-300 bg-[#f4eddd] p-4 shadow-sm">
      {/* faint paper grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(120,90,40,0.06), transparent 40%), radial-gradient(circle at 85% 80%, rgba(120,90,40,0.06), transparent 45%)",
        }}
      />

      <Stamp flagUrl={countryFlagUrl(stop.country)} city={stop.city} year={year} />

      {/* Headline */}
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        Postcard from
      </p>
      <h2 className="relative mt-1 pr-20 font-serif text-2xl font-semibold leading-[1.1] text-stone-900">
        {stop.city}, {stop.country}
      </h2>
      <p className="relative mt-1.5 text-xs font-medium text-stone-500">{dates}</p>

      {/* Body: headline photo on the left, summary on the right */}
      <div className="relative mt-4 flex gap-3.5">
        <div className="relative aspect-[3/4] w-28 flex-none overflow-hidden rounded-sm bg-stone-200 shadow-sm ring-1 ring-stone-300">
          {photo ? (
            <Image
              key={photo.id}
              src={photo.url}
              alt={photo.altText}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-stone-400">
              <ImageOff className="h-6 w-6" aria-hidden="true" />
              <span className="text-[10px] font-medium">No photo yet</span>
            </div>
          )}
        </div>

        <p className="min-w-0 flex-1 text-sm leading-6 text-stone-700">
          {stop.teaser || "A new stop on the journey."}
        </p>
      </div>

      {/* Footer */}
      <div className="relative mt-auto pt-4">
        {hasFeed ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 transition-colors group-hover:text-emerald-950">
            Open feed
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <p className="text-sm text-stone-500">This city is planned. Posts will appear here.</p>
        )}
      </div>
    </article>
  );

  if (!hasFeed) {
    return <aside className="lg:h-full">{card}</aside>;
  }

  return (
    <Link href={`/stops/${stop.slug}`} className="group block lg:h-full" aria-label={`Open ${stop.city} feed`}>
      {card}
    </Link>
  );
}

// A postage-stamp built from the country flag, with a circular postmark.
function Stamp({ flagUrl, city, year }: { flagUrl: string | null; city: string; year: string }) {
  return (
    <div className="absolute right-3 top-3 z-10">
      <div className="rotate-3 rounded-[3px] border-2 border-dotted border-stone-400/70 bg-white p-1 shadow-md">
        <div className="h-14 w-11 overflow-hidden bg-stone-200">
          {flagUrl ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${flagUrl})` }}
            />
          ) : null}
        </div>
      </div>

      {/* Faux postmark, overlapping the stamp's lower-left corner. */}
      <div className="absolute -bottom-2 -left-5 flex h-12 w-12 -rotate-12 items-center justify-center rounded-full border-2 border-stone-700/35">
        <div className="text-center text-[6px] font-bold uppercase leading-[1.15] tracking-wide text-stone-700/55">
          <div className="truncate">{city}</div>
          <div className="mx-auto my-0.5 h-px w-6 bg-stone-700/35" />
          <div>{year || "—"}</div>
        </div>
      </div>
    </div>
  );
}
