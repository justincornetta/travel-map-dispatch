import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityFeed } from "@/components/CityFeed";
import { getPublicStopBySlug, getPublicStops } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stop = await getPublicStopBySlug(slug);
  if (!stop) return { title: "City not found" };

  const title = `${stop.city}, ${stop.country}`;
  const description =
    stop.teaser || `Photos and dispatches from ${stop.city}, ${stop.country}.`;
  const cover = stop.coverPhoto ?? stop.photos.find((p) => p.mediaType !== "video") ?? stop.photos[0];
  const images = cover ? [{ url: cover.url, alt: cover.altText }] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/stops/${stop.slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stops = await getPublicStops();
  const index = stops.findIndex((s) => s.slug === slug);
  if (index === -1) notFound();

  const stop = stops[index];
  const prev = index > 0 ? stops[index - 1] : null;
  const next = index < stops.length - 1 ? stops[index + 1] : null;

  // Earliest date across the whole trip (arrivals + posts) → drives the
  // "Day N" counter in the feed's day break-lines.
  const dateMs: number[] = [];
  for (const s of stops) {
    if (s.arrivalDate) dateMs.push(new Date(`${s.arrivalDate}T12:00:00`).getTime());
    for (const p of s.posts) dateMs.push(new Date(p.happenedAt).getTime());
  }
  const tripStartDate = dateMs.length ? new Date(Math.min(...dateMs)).toISOString() : null;

  return (
    <CityFeed
      stop={stop}
      prev={prev ? { slug: prev.slug, city: prev.city } : null}
      next={next ? { slug: next.slug, city: next.city } : null}
      tripStartDate={tripStartDate}
    />
  );
}
