import Link from "next/link";
import { MapPin } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import type { Stop } from "@/lib/types";
import { formatDateRange } from "@/lib/utils";

export function JourneyTimeline({ stops }: { stops: Stop[] }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-stone-950">Journey timeline</h2>
        <span className="text-sm text-stone-600">{stops.length} stops</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stops.map((stop, index) => (
          <article key={stop.id} className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-500">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Stop {index + 1}
              </div>
              <StatusBadge status={stop.status} />
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-snug text-stone-950">{stop.title}</h3>
            <p className="mt-1 text-sm font-medium text-stone-600">{stop.locationLabel}</p>
            <p className="mt-2 text-xs font-medium text-stone-500">
              {formatDateRange(stop.arrivalDate, stop.departureDate)}
            </p>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-stone-700">{stop.teaser}</p>
            {stop.body ? (
              <Link
                href={`/stops/${stop.slug}`}
                className="mt-4 inline-flex text-sm font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Open dispatch
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
