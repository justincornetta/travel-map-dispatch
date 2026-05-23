"use client";

import type { Stop } from "@/lib/types";
import TravelMap from "@/components/TravelMap";

export function MapSection({ stops }: { stops: Stop[] }) {
  return <TravelMap stops={stops} />;
}
