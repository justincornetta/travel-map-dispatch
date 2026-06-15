import type { Metadata } from "next";
import { Camera, Heart, MapPin, MessageSquareText } from "lucide-react";

import { AccountForms } from "@/components/AccountForms";
import { WelcomePostcardGallery, type PostcardSlide } from "@/components/WelcomePostcardGallery";
import { getPublicStops } from "@/lib/data";
import { countryFlagUrl } from "@/lib/flags";
import { formatDateRange } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Sign in or create an account to follow the trip.",
};

const MAX_SLIDES = 15;
const PER_CITY = 3;

// Build a varied set of postcard slides: round-robin across cities so the
// gallery alternates places rather than showing several photos of one city.
async function buildSlides(): Promise<PostcardSlide[]> {
  const stops = await getPublicStops();
  const perCity = stops.map((s) => ({
    stop: s,
    images: s.photos
      .map((p) => (p.mediaType === "video" ? p.posterUrl : p.url))
      .filter((url): url is string => Boolean(url))
      .slice(0, PER_CITY),
  }));

  const slides: PostcardSlide[] = [];
  for (let round = 0; round < PER_CITY; round++) {
    for (const { stop, images } of perCity) {
      const imageUrl = images[round];
      if (!imageUrl) continue;
      slides.push({
        city: stop.city,
        country: stop.country,
        dates: formatDateRange(stop.arrivalDate, stop.departureDate),
        imageUrl,
        flagUrl: countryFlagUrl(stop.country),
      });
    }
  }
  return slides.slice(0, MAX_SLIDES);
}

export default async function WelcomePage() {
  const slides = await buildSlides();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-4 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-10 lg:px-6">
      <section>
        <div className="mb-5 inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-white">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold text-stone-950">Justin's Travel Blog</span>
        </div>

        <h1 className="max-w-xl font-serif text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
          Welcome to the travel blog
        </h1>

        {slides.length > 0 ? (
          <div className="mt-6">
            <WelcomePostcardGallery slides={slides} />
          </div>
        ) : null}

        <p className="mt-8 max-w-xl text-base leading-7 text-stone-700">
          Scroll through for a (mostly) unfiltered view of my travels across Europe and Asia. By
          signing up, you can like, comment, and get notified of new blog posts.
        </p>

        <ul className="mt-6 space-y-2.5 text-sm text-stone-700">
          <li className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Like the posts you enjoy
          </li>
          <li className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Comment with your name
          </li>
          <li className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Get notified when a new city goes live
          </li>
        </ul>

        <p className="mt-6 text-xs text-stone-500">
          <a className="underline hover:text-stone-700" href="/privacy">Privacy Policy</a>
          {" · "}
          <a className="underline hover:text-stone-700" href="/terms">Terms</a>
          {" · "}
          <a className="underline hover:text-stone-700" href="/subscribe">SMS updates</a>
        </p>
      </section>

      <div className="w-full">
        <AccountForms initialMode="register" />
      </div>
    </main>
  );
}
