"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPinned } from "lucide-react";

import type { Stop, StopStatus } from "@/lib/types";
import { CityPostcard } from "@/components/CityPostcard";

const statusColors: Record<StopStatus, string> = {
  visited: "#047857",
  current: "#d97706",
  upcoming: "#475569",
};

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletMarker = import("leaflet").Marker;

// A numbered, status-coloured pin built as a Leaflet divIcon so we can show the
// stop's order (1, 2, 3…) inside the circle.
function makePinIcon(
  L: LeafletModule,
  status: StopStatus,
  number: number,
  state: "default" | "hovered" | "selected",
) {
  const size = state === "selected" ? 32 : state === "hovered" ? 28 : 24;
  const border = state === "default" ? 2 : 3;
  const font = state === "selected" ? 14 : 12;
  return L.divIcon({
    className: "trip-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${statusColors[status]};border:${border}px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45);color:#fff;font-weight:700;font-size:${font}px;line-height:1;display:flex;align-items:center;justify-content:center;">${number}</div>`,
  });
}

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
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const leafletRef = useRef<LeafletModule | null>(null);
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
      leafletRef.current = L;
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
      stops.forEach((stop, index) => {
        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: makePinIcon(L, stop.status, index + 1, "default"),
        })
          .addTo(leafletMap)
          .bindTooltip(`${index + 1}. ${stop.city}`, { direction: "top", offset: [0, -14] })
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
    const L = leafletRef.current;
    if (markers.size === 0 || !L) return;

    markers.forEach((marker, id) => {
      const index = stops.findIndex((s) => s.id === id);
      if (index < 0) return;
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;
      marker.setIcon(
        makePinIcon(L, stops[index].status, index + 1, isSelected ? "selected" : isHovered ? "hovered" : "default"),
      );
      marker.setZIndexOffset(isSelected ? 1000 : isHovered ? 500 : 0);
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

      {selectedStop ? (
        <CityPostcard stop={selectedStop} />
      ) : (
        <aside className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-lg border border-stone-300 bg-[#fbfaf6] p-4 text-center shadow-sm lg:h-full">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-stone-500">
            <MapPinned className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-stone-600">No cities published yet.</p>
          <p className="text-xs text-stone-500">The map fills in as the trip unfolds.</p>
        </aside>
      )}
    </section>
  );
}
