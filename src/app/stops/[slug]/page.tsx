import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getPublicStopBySlug } from "@/lib/data";
import { formatDateRange } from "@/lib/utils";

export default async function StopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stop = await getPublicStopBySlug(slug);
  if (!stop || !stop.body) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to map
        </Link>
        <article className="mt-5 overflow-hidden rounded-lg border border-stone-300 bg-[#fbfaf6] shadow-sm">
          {stop.photos[0] ? (
            <img src={stop.photos[0].url} alt={stop.photos[0].altText} className="h-[340px] w-full object-cover sm:h-[460px]" />
          ) : (
            <div className="flex h-64 items-center justify-center bg-stone-200 text-sm text-stone-600">
              Photos coming soon
            </div>
          )}
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={stop.status} />
              <span className="text-sm font-medium text-stone-500">{formatDateRange(stop.arrivalDate, stop.departureDate)}</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-stone-950">{stop.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-600">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {stop.locationLabel}
            </p>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-700">{stop.teaser}</p>
            <div className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-stone-800">
              {stop.body}
            </div>
            {stop.photos.length > 1 ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {stop.photos.slice(1).map((photo) => (
                  <img key={photo.id} src={photo.url} alt={photo.altText} className="h-64 w-full rounded-md object-cover" />
                ))}
              </div>
            ) : null}
          </div>
        </article>
      </main>
    </>
  );
}
