"use client";

import type { Stop } from "@/lib/types";
import TravelMap from "@/components/TravelMap";

export function MapSection({ stops, focusSlug }: { stops: Stop[]; focusSlug?: string }) {
  return <TravelMap stops={stops} focusSlug={focusSlug} />;
}
