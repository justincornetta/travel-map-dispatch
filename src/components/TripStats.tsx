import { CalendarDays, Camera, Globe2, MapPin, NotebookPen } from "lucide-react";

import type { Stop } from "@/lib/types";

function daysOnTheRoad(stops: Stop[]): number | null {
  const times: number[] = [];
  for (const stop of stops) {
    if (stop.arrivalDate) times.push(new Date(`${stop.arrivalDate}T12:00:00`).getTime());
    if (stop.departureDate) times.push(new Date(`${stop.departureDate}T12:00:00`).getTime());
  }
  if (times.length === 0) return null;

  const earliest = Math.min(...times);
  // If the trip is still in progress, count through today; otherwise the last known date.
  const hasCurrent = stops.some((stop) => stop.status === "current");
  const latest = hasCurrent ? Date.now() : Math.max(...times);
  const days = Math.round((latest - earliest) / 86_400_000) + 1;
  return days > 0 ? days : null;
}

export function TripStats({ stops }: { stops: Stop[] }) {
  if (stops.length === 0) return null;

  const cities = stops.length;
  const countries = new Set(stops.map((s) => s.country).filter(Boolean)).size;
  const posts = stops.reduce((sum, s) => sum + s.posts.length, 0);
  const photos = stops.reduce((sum, s) => sum + s.photos.length, 0);
  const days = daysOnTheRoad(stops);

  const items = [
    { icon: MapPin, value: cities, label: cities === 1 ? "City" : "Cities" },
    { icon: Globe2, value: countries, label: countries === 1 ? "Country" : "Countries" },
    { icon: NotebookPen, value: posts, label: posts === 1 ? "Post" : "Posts" },
    { icon: Camera, value: photos, label: photos === 1 ? "Photo" : "Photos" },
    ...(days ? [{ icon: CalendarDays, value: days, label: days === 1 ? "Day on the road" : "Days on the road" }] : []),
  ];

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 animate-[fade-in_300ms_ease-out] sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-lg border border-stone-300 bg-[#fbfaf6] px-4 py-3 shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-800/10 text-emerald-800">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-semibold leading-none text-stone-950">{value}</span>
            <span className="mt-1 block truncate text-xs font-medium text-stone-600">{label}</span>
          </span>
        </div>
      ))}
    </section>
  );
}
