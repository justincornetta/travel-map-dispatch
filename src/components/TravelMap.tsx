"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Loader2, MapPinned } from "lucide-react";

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
type LeafletCircleMarker = import("leaflet").CircleMarker;

export default function TravelMap({
  stops,
  focusSlug,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  stops: Stop[];
  focusSlug?: string;
  selectedId?: string;
  hoveredId?: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletCircleMarker>>(new Map());
  const firstStyleRun = useRef(true);
  // Keep the latest callbacks reachable from the one-time init effect without re-running it.
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;

  const selectedStop =
    stops.find((stop) => stop.id === selectedId) ?? stops[0];
  const [ready, setReady] = useState(false);

  // Init effect — build the map once per `stops` change. Markers are stored in a
  // ref so the style effect can restyle them imperatively (no full re-init on hover).
  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    let disposed = false;
    setReady(false);
    firstStyleRun.current = true;

    async function loadMap() {
      const L: LeafletModule = await import("leaflet");
      if (disposed || !mapRef.current) return;

      const leafletMap = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([stops[0].latitude, stops[0].longitude], 4);
      mapInstanceRef.current = leafletMap;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(leafletMap);

      const path = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
      L.polyline(path, { color: "#334155", opacity: 0.45, weight: 3 }).addTo(leafletMap);

      const markers = markersRef.current;
      markers.clear();
      stops.forEach((stop) => {
        const marker = L.circleMarker([stop.latitude, stop.longitude], {
          radius: 9,
          color: "#ffffff",
          fillColor: statusColors[stop.status],
          fillOpacity: 0.95,
          opacity: 1,
          weight: 3,
        })
          .addTo(leafletMap)
          .bindTooltip(stop.city, { direction: "top", offset: [0, -8] })
          .bindPopup(`<strong>${stop.city}</strong><br><span>${stop.country}</span>`)
          .on("click", () => onSelectRef.current(stop.id))
          .on("mouseover", () => onHoverRef.current(stop.id))
          .on("mouseout", () => onHoverRef.current(null));
        markers.set(stop.id, marker);
      });

      const focused = focusSlug ? stops.find((s) => s.slug === focusSlug) : undefined;
      if (focused) {
        leafletMap.setView([focused.latitude, focused.longitude], 11);
      } else if (stops.length === 1) {
        leafletMap.setView([stops[0].latitude, stops[0].longitude], 6);
      } else {
        leafletMap.fitBounds(path, { padding: [34, 34] });
      }

      if (!disposed) setReady(true);
    }

    loadMap();

    return () => {
      disposed = true;
      markersRef.current.clear();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [stops, focusSlug]);

  // Style effect — restyle markers when selection/hover changes, and pan to the
  // selected stop on user-driven changes (skipping the very first run after init).
  useEffect(() => {
    const markers = markersRef.current;
    if (markers.size === 0) return;

    markers.forEach((marker, id) => {
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;
      marker.setRadius(isSelected ? 12 : isHovered ? 11 : 9);
      marker.setStyle({ weight: isSelected ? 4 : isHovered ? 4 : 3 });
      if (isSelected || isHovered) marker.bringToFront();
    });

    if (firstStyleRun.current) {
      firstStyleRun.current = false;
      return;
    }

    const map = mapInstanceRef.current;
    const target = stops.find((stop) => stop.id === selectedId);
    if (map && target) {
      map.panTo([target.latitude, target.longitude], { animate: true });
    }
    // `ready` is included so this re-runs once markers exist after the async map
    // init — that first run applies the initial selected/hover styling.
  }, [selectedId, hoveredId, stops, ready]);

  return (
    <section className="grid min-h-[640px] gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="map-panel relative overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
        <div ref={mapRef} className="h-[440px] w-full lg:h-full" />
        {!ready ? (
          <div className="absolute inset-0 z-[500] flex animate-pulse items-center justify-center gap-2 bg-[#d9dfd6] text-stone-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="text-sm font-medium">Loading map…</span>
          </div>
        ) : null}
      </div>

      <aside className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-4 shadow-sm">
        {selectedStop ? (
          <div className="flex h-full flex-col">
            <div className="relative overflow-hidden rounded-md bg-stone-200">
              {selectedStop.photos[0] ? (
                <img
                  src={selectedStop.photos[0].url}
                  alt={selectedStop.photos[0].altText}
                  loading="lazy"
                  decoding="async"
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-2 bg-stone-200 text-stone-500">
                  <ImageOff className="h-7 w-7" aria-hidden="true" />
                  <span className="text-xs font-medium">Photos coming soon</span>
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
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
              >
                Open feed
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <p className="mt-5 text-sm text-stone-500">This city is planned. Posts will appear here.</p>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-stone-500">
              <MapPinned className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-stone-600">No cities published yet.</p>
            <p className="text-xs text-stone-500">The map fills in as the trip unfolds.</p>
          </div>
        )}
      </aside>
    </section>
  );
}
