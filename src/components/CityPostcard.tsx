import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImageOff, Play } from "lucide-react";

import { countryFlagUrl } from "@/lib/flags";
import type { Stop } from "@/lib/types";
import { formatDateRange } from "@/lib/utils";

// A vintage-postcard rendering of the selected city, shown beside the map in
// place of the old "open feed" panel. Headline photo on the left, a short
// summary (the city's teaser) on the right, and a country-flag "stamp" with a
// faux postmark in the top-right corner.
export function CityPostcard({ stop }: { stop: Stop }) {
  // Prefer a real photo for the headline; fall back to the first media (which
  // may be a video) if there are no images.
  const photo = stop.photos.find((m) => m.mediaType !== "video") ?? stop.photos[0];
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

      {/* Large headline photo — fills the bulk of the postcard. The full image
          is shown (object-contain); any letterbox space uses the postcard's
          own paper colour so the photo sits seamlessly on the card. */}
      <div className="relative mt-3 min-h-[15rem] flex-1 overflow-hidden rounded-sm bg-[#f4eddd]">
        {photo ? (
          photo.mediaType === "video" ? (
            <>
              {photo.posterUrl ? (
                <Image
                  key={photo.id}
                  src={photo.posterUrl}
                  alt={photo.altText}
                  fill
                  sizes="(max-width: 1024px) 100vw, 360px"
                  priority
                  className="object-contain"
                />
              ) : (
                <video
                  src={photo.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/55 p-3 text-white">
                <Play className="h-6 w-6" aria-hidden="true" />
              </span>
            </>
          ) : (
            <Image
              key={photo.id}
              src={photo.url}
              alt={photo.altText}
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
              priority
              className="object-contain"
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-stone-500">
            <ImageOff className="h-7 w-7" aria-hidden="true" />
            <span className="text-xs font-medium">No photo yet</span>
          </div>
        )}
      </div>

      {/* Summary + open feed, stacked underneath the photo. */}
      <p className="relative mt-3 text-sm leading-6 text-stone-700">
        {stop.teaser || "A new stop on the journey."}
      </p>
      <div className="relative mt-3">
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
