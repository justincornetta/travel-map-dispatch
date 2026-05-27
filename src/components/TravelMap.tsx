"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { Stop, StopStatus } from "@/lib/types";
import { formatDateRange } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

const statusColors: Record<StopStatus, string> = {
  visited: "#047857",
  current: "#d97706",
  upcoming: "#475569",
};

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;

export default function TravelMap({ stops, focusSlug }: { stops: Stop[]; focusSlug?: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Initial selection priority: ?focus= param → current → first
  const focused = focusSlug ? stops.find((s) => s.slug === focusSlug) : undefined;
  const [selectedId, setSelectedId] = useState(
    focused?.id ?? stops.find((stop) => stop.status === "current")?.id ?? stops[0]?.id,
  );
  const selectedStop = stops.find((stop) => stop.id === selectedId) ?? stops[0];

  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    let disposed = false;
    let map: LeafletMap | null = null;

    async function loadMap() {
      const L: LeafletModule = await import("leaflet");
      if (disposed || !mapRef.current) return;

      const leafletMap = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([stops[0].latitude, stops[0].longitude], 4);
      map = leafletMap;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(leafletMap);

      const path = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
      L.polyline(path, { color: "#334155", opacity: 0.45, weight: 3 }).addTo(leafletMap);

      stops.forEach((stop) => {
        L.circleMarker([stop.latitude, stop.longitude], {
          radius: stop.id === selectedId ? 12 : 9,
          color: "#ffffff",
          fillColor: statusColors[stop.status],
          fillOpacity: 0.95,
          opacity: 1,
          weight: stop.id === selectedId ? 4 : 3,
        })
          .addTo(leafletMap)
          .bindTooltip(stop.city, { direction: "top", offset: [0, -8] })
          .bindPopup(`<strong>${stop.city}</strong><br><span>${stop.country}</span>`)
          .on("click", () => setSelectedId(stop.id));
      });

      // If we have a focus target, zoom in tight on it. Otherwise fit all pins.
      if (focused) {
        leafletMap.setView([focused.latitude, focused.longitude], 11);
      } else if (stops.length === 1) {
        leafletMap.setView([stops[0].latitude, stops[0].longitude], 6);
      } else {
        leafletMap.fitBounds(path, { padding: [34, 34] });
      }
    }

    loadMap();

    return () => {
      disposed = true;
      map?.remove();
    };
    // Re-run when the selection or focus changes so we can re-render markers/styles.
  }, [selectedId, stops, focused]);

  return (
    <section className="grid min-h-[640px] gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="map-panel overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
        <div ref={mapRef} className="h-[440px] w-full lg:h-full" />
      </div>

      <aside className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-4 shadow-sm">
        {selectedStop ? (
          <div className="flex h-full flex-col">
            <div className="relative overflow-hidden rounded-md bg-stone-200">
              {selectedStop.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedStop.photos[0].url}
                  alt={selectedStop.photos[0].altText}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 items-center justify-center bg-stone-200 text-sm text-stone-600">
                  Photos coming soon
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <StatusBadge status={selectedStop.status} />
              <span className="text-xs font-medium text-stone-500">
                {formatDateRange(selectedStop.arrivalDate, selectedStop.departureDate)}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-stone-950">
              {selectedStop.city}
            </h2>
            <p className="mt-1 text-sm font-medium text-stone-600">{selectedStop.country}</p>
            <p className="mt-4 text-sm leading-6 text-stone-700">{selectedStop.teaser}</p>
            {selectedStop.posts.length > 0 ? (
              <Link
                href={`/stops/${selectedStop.slug}`}
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Open feed
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <p className="mt-5 text-sm text-stone-500">This city is planned. Posts will appear here.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-600">No cities have been published yet.</p>
        )}
      </aside>
    </section>
  );
}
