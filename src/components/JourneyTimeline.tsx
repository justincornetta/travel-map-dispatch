"use client";

import { useEffect, useRef } from "react";
import { Check, MapPin } from "lucide-react";

import type { CityProgress, Stop, StopStatus } from "@/lib/types";
import { formatDateRange } from "@/lib/utils";

// Small colored dot per status, mirroring the map marker palette.
const statusDot: Record<StopStatus, string> = {
  visited: "bg-emerald-700",
  current: "bg-amber-600",
  upcoming: "bg-slate-500",
};

// Small reading-progress badge shown on each tile: Viewed ✓ when complete,
// "n/total" while partway through, plus a "New" marker when posts arrived after
// the user last read this city. Nothing for unread or empty cities.
function ProgressBadge({ progress }: { progress?: CityProgress }) {
  if (!progress || progress.state === "none" || progress.state === "empty") return null;

  if (progress.state === "viewed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
        <Check className="h-3 w-3" aria-hidden="true" /> Viewed
      </span>
    );
  }

  // partial
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
        {progress.viewed}/{progress.total}
      </span>
      {progress.isNew ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" /> New posts
        </span>
      ) : null}
    </span>
  );
}

export function JourneyTimeline({
  stops,
  progress = {},
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  stops: Stop[];
  progress?: Record<string, CityProgress>;
  selectedId?: string;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const firstRun = useRef(true);

  // When the selection changes (e.g. via a map-marker click), scroll the matching
  // chip into view horizontally — but skip the initial mount so we don't yank on load.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedId]);

  if (stops.length === 0) return null;

  return (
    <section className="mt-8" aria-label="Journey timeline">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-stone-950">Journey timeline</h2>
        <span className="text-sm text-stone-600">
          {stops.length} cit{stops.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {stops.map((stop, index) => {
          const isSelected = stop.id === selectedId;
          const isHovered = stop.id === hoveredId;
          const postCount = stop.posts.length;
          return (
            <button
              key={stop.id}
              type="button"
              ref={(el) => {
                if (el) cardRefs.current.set(stop.id, el);
                else cardRefs.current.delete(stop.id);
              }}
              onClick={() => onSelect?.(stop.id)}
              onMouseEnter={() => onHover?.(stop.id)}
              onMouseLeave={() => onHover?.(null)}
              aria-pressed={isSelected}
              className={`w-[200px] flex-none snap-start rounded-lg border bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isSelected
                  ? "border-emerald-600 ring-2 ring-emerald-600/40"
                  : isHovered
                    ? "border-emerald-400 ring-1 ring-emerald-400/40"
                    : "border-stone-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Stop {index + 1}
                </span>
                <span
                  className={`h-2.5 w-2.5 flex-none rounded-full ${statusDot[stop.status]}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 truncate text-base font-semibold leading-tight text-stone-950">
                {stop.city}
              </p>
              <p className="truncate text-xs font-medium text-stone-600">{stop.country}</p>
              <p className="mt-2 text-[11px] font-medium text-stone-500">
                {formatDateRange(stop.arrivalDate, stop.departureDate)}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-emerald-800">
                  {postCount} post{postCount === 1 ? "" : "s"}
                </p>
                <ProgressBadge progress={progress[stop.id]} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
