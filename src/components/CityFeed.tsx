"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, NotebookPen, Share2, X } from "lucide-react";

import { PostCarousel } from "@/components/PostCarousel";
import { PostSocial } from "@/components/PostSocial";
import { countryFlagUrl } from "@/lib/flags";
import type { Stop, Post } from "@/lib/types";

type Item =
  | { kind: "post"; post: Post }
  | { kind: "divider"; hour: number }
  | { kind: "day"; iso: string };

type NeighborLink = { slug: string; city: string } | null;

function startOfDayMs(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// "Day 3 — Sunday, May 24" using a whole-trip day count from tripStartIso.
function dayLabel(iso: string, tripStartIso: string | null) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  if (!tripStartIso) return date;
  const n = Math.floor((startOfDayMs(d) - startOfDayMs(new Date(tripStartIso))) / 86_400_000) + 1;
  return n >= 1 ? `Day ${n} — ${date}` : date;
}

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

export function CityFeed({
  stop,
  prev = null,
  next = null,
  tripStartDate = null,
}: {
  stop: Stop;
  prev?: NeighborLink;
  next?: NeighborLink;
  tripStartDate?: string | null;
}) {
  // Posts are already sorted chronologically by mapStop in data.ts.
  // Insert a day break-line when the calendar day changes, then hour-bucket
  // dividers between adjacent posts within a day whose hour differs.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let lastDay = "";
    let lastHour = -1;
    for (const post of stop.posts) {
      const d = new Date(post.happenedAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDay) {
        out.push({ kind: "day", iso: post.happenedAt });
        lastDay = dayKey;
        lastHour = -1; // restart hour grouping under the new day
      }
      const hour = d.getHours();
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

  const flagUrl = countryFlagUrl(stop.country);

  return (
    <div className="relative min-h-screen bg-stone-950 text-stone-100">
      {/* National-flag backdrop — softly blurred but clearly present; a gradient
          scrim keeps post content legible over it. */}
      {flagUrl ? (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <div
            className="h-full w-full scale-110 bg-cover bg-center opacity-70 blur-lg"
            style={{ backgroundImage: `url(${flagUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/30 via-stone-950/55 to-stone-950/80" />
        </div>
      ) : null}

      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-stone-950/95 shadow-lg shadow-black/30 backdrop-blur">
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
      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-32 pt-4">
        {stop.posts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-400">
              <NotebookPen className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium text-stone-300">No posts from this city yet.</p>
            <p className="mt-1 text-xs text-stone-500">Check back soon — dispatches land here as they happen.</p>
          </div>
        ) : null}

        {items.map((item, idx) =>
          item.kind === "day" ? (
            <div key={`day-${idx}`} className="mb-6 mt-10 flex items-center gap-3 first:mt-2">
              <div className="h-px flex-1 bg-white/25" />
              <span className="whitespace-nowrap text-sm font-semibold tracking-wide text-stone-200">
                {dayLabel(item.iso, tripStartDate)}
              </span>
              <div className="h-px flex-1 bg-white/25" />
            </div>
          ) : item.kind === "divider" ? (
            <div key={`d-${idx}-${item.hour}`} className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/15" />
              <span className="text-xs font-medium uppercase tracking-widest text-stone-400">
                {hourLabel(item.hour)}
              </span>
              <div className="h-px flex-1 bg-white/15" />
            </div>
          ) : (
            <article key={item.post.id} className="mb-8">
              {/* Inline timestamp above the post */}
              <time
                dateTime={item.post.happenedAt}
                className="mb-1.5 block text-[11px] font-mono uppercase tracking-wide text-stone-500"
              >
                {isoToHM(item.post.happenedAt)}
              </time>

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

              <PostSocial postId={item.post.id} />
            </article>
          ),
        )}

        {prev || next ? (
          <nav className="mt-10 grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
            {prev ? (
              <Link
                href={`/stops/${prev.slug}`}
                className="group flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
              >
                <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
                </span>
                <span className="truncate text-sm font-semibold text-stone-100">{prev.city}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/stops/${next.slug}`}
                className="group flex flex-col items-end gap-1 rounded-lg border border-white/10 bg-white/5 p-4 text-right transition-colors hover:bg-white/10"
              >
                <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                  Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-semibold text-stone-100">{next.city}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
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
