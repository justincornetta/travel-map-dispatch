"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import type { Stop } from "@/lib/types";
import { formatDateRange } from "@/lib/utils";

export function JourneyTimeline({
  stops,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  stops: Stop[];
  selectedId?: string;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const firstRun = useRef(true);

  // When the selection changes (e.g. via a map-marker click), scroll the matching
  // card into view — but skip the initial mount so we don't yank the page on load.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-stone-950">Journey timeline</h2>
        <span className="text-sm text-stone-600">{stops.length} cit{stops.length === 1 ? "y" : "ies"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stops.map((stop, index) => {
          const isSelected = stop.id === selectedId;
          const isHovered = stop.id === hoveredId;
          return (
            <article
              key={stop.id}
              ref={(el) => {
                if (el) cardRefs.current.set(stop.id, el);
                else cardRefs.current.delete(stop.id);
              }}
              onClick={() => onSelect?.(stop.id)}
              onMouseEnter={() => onHover?.(stop.id)}
              onMouseLeave={() => onHover?.(null)}
              className={`cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isSelected
                  ? "border-emerald-600 ring-2 ring-emerald-600/40"
                  : isHovered
                    ? "border-emerald-400 ring-1 ring-emerald-400/40"
                    : "border-stone-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-500">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  City {index + 1}
                </div>
                <StatusBadge status={stop.status} />
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-snug text-stone-950">{stop.city}</h3>
              <p className="mt-1 text-sm font-medium text-stone-600">{stop.country}</p>
              <p className="mt-2 text-xs font-medium text-stone-500">
                {formatDateRange(stop.arrivalDate, stop.departureDate)}
              </p>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-stone-700">{stop.teaser}</p>
              {stop.posts.length > 0 ? (
                <Link
                  href={`/stops/${stop.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 inline-flex text-sm font-semibold text-emerald-800 transition-colors hover:text-emerald-950"
                >
                  Open feed · {stop.posts.length} post{stop.posts.length === 1 ? "" : "s"}
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
