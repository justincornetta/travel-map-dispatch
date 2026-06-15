"use client";

import { useState } from "react";

import type { CityProgress, Stop } from "@/lib/types";
import TravelMap from "@/components/TravelMap";
import { JourneyTimeline } from "@/components/JourneyTimeline";

export function ExploreSection({
  stops,
  focusSlug,
  progress = {},
  resumeStopId = null,
}: {
  stops: Stop[];
  focusSlug?: string;
  progress?: Record<string, CityProgress>;
  resumeStopId?: string | null;
}) {
  // Initial selection priority: ?focus= param → resume (next unread / latest
  // read) → current city → first stop.
  const focused = focusSlug ? stops.find((s) => s.slug === focusSlug) : undefined;
  const resumed = resumeStopId ? stops.find((s) => s.id === resumeStopId) : undefined;
  const [selectedId, setSelectedId] = useState<string | undefined>(
    focused?.id ?? resumed?.id ?? stops.find((stop) => stop.status === "current")?.id ?? stops[0]?.id,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      <JourneyTimeline
        stops={stops}
        progress={progress}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={setSelectedId}
        onHover={setHoveredId}
      />
      <TravelMap
        stops={stops}
        focusSlug={focusSlug}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={setSelectedId}
        onHover={setHoveredId}
      />
    </>
  );
}
