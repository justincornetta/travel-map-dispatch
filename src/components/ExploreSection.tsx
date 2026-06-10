"use client";

import { useState } from "react";

import type { Stop } from "@/lib/types";
import TravelMap from "@/components/TravelMap";
import { JourneyTimeline } from "@/components/JourneyTimeline";

export function ExploreSection({ stops, focusSlug }: { stops: Stop[]; focusSlug?: string }) {
  // Initial selection priority: ?focus= param → current city → first stop.
  const focused = focusSlug ? stops.find((s) => s.slug === focusSlug) : undefined;
  const [selectedId, setSelectedId] = useState<string | undefined>(
    focused?.id ?? stops.find((stop) => stop.status === "current")?.id ?? stops[0]?.id,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      <JourneyTimeline
        stops={stops}
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
