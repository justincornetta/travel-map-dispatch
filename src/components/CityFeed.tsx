"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Share2, X } from "lucide-react";

import { PostCarousel } from "@/components/PostCarousel";
import type { Stop, Post } from "@/lib/types";

type Item = { kind: "post"; post: Post } | { kind: "divider"; hour: number };

// Format an hour (0–23) as a 222-style label: "12 AM", "2 AM", "12 PM", "9 PM".
function hourLabel(hour: number) {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h} ${ampm}`;
}

function shortDateRange(arrival: string | null, departure: string | null) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (arrival && departure) return `${fmt(arrival)} – ${fmt(departure)}`;
  if (arrival) return fmt(arrival);
  if (departure) return fmt(departure);
  return "";
}

function isoToHM(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function CityFeed({ stop }: { stop: Stop }) {
  // Posts are already sorted chronologically by mapStop in data.ts.
  // Interleave hour-bucket dividers between adjacent posts whose hour differs.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let lastHour = -1;
    for (const post of stop.posts) {
      const hour = new Date(post.happenedAt).getHours();
      if (hour !== lastHour) {
        out.push({ kind: "divider", hour });
        lastHour = hour;
      }
      out.push({ kind: "post", post });
    }
    return out;
  }, [stop.posts]);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${stop.city}, ${stop.country}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{stop.city.toLowerCase()}</h1>
            <p className="text-xs font-medium text-stone-400">
              {shortDateRange(stop.arrivalDate, stop.departureDate)}
              {stop.country ? ` · ${stop.country}` : ""}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full p-2 text-stone-300 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-4">
        {stop.posts.length === 0 ? (
          <p className="mt-8 text-center text-sm text-stone-500">No posts yet.</p>
        ) : null}

        {items.map((item, idx) =>
          item.kind === "divider" ? (
            <div key={`d-${idx}-${item.hour}`} className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-xs font-medium uppercase tracking-widest text-stone-400">
                {hourLabel(item.hour)}
              </span>
              <div className="h-px flex-1 bg-white/15" />
            </div>
          ) : (
            <article key={item.post.id} className="relative mb-8">
              {/* Tiny side timestamp, rotated */}
              <span
                className="absolute -left-2 top-2 origin-top-left -rotate-90 whitespace-nowrap text-[10px] font-mono text-stone-500"
                aria-hidden="true"
              >
                {isoToHM(item.post.happenedAt)}
              </span>

              {item.post.title ? (
                <h2 className="mb-2 text-base font-semibold text-stone-100">{item.post.title}</h2>
              ) : null}

              {item.post.photos.length > 0 ? (
                <PostCarousel photos={item.post.photos} />
              ) : null}

              {item.post.body ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-200">
                  {item.post.body}
                </p>
              ) : null}
            </article>
          ),
        )}
      </main>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-xs text-stone-500">{stop.posts.length} post{stop.posts.length === 1 ? "" : "s"}</span>
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-stone-200 hover:bg-white/10"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </footer>
    </div>
  );
}
