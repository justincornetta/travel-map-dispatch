"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type PostcardSlide = {
  city: string;
  country: string;
  dates: string;
  imageUrl: string;
  flagUrl: string | null;
};

const INTERVAL_MS = 4500;

// A self-rotating postcard that cycles through cities/photos from the blog —
// shown on the welcome screen as a live preview. Crossfades the whole card
// (photo + header + stamp) every few seconds.
export function WelcomePostcardGallery({ slides }: { slides: PostcardSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  // Warm the next image so the crossfade is smooth.
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(index + 1) % slides.length];
    if (next) {
      const img = new window.Image();
      img.src = next.imageUrl;
    }
  }, [index, slides]);

  if (slides.length === 0) return null;
  const slide = slides[index];

  return (
    <div className="relative h-[400px] w-full max-w-xl select-none">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.article
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 overflow-hidden rounded-lg border border-stone-300 bg-[#f4eddd] p-3 shadow-sm"
        >
          {/* Flag stamp */}
          <div className="absolute right-3 top-3 z-10 rotate-3 rounded-[3px] border-2 border-dotted border-stone-400/70 bg-white p-1 shadow-md">
            <div className="h-12 w-9 overflow-hidden bg-stone-200">
              {slide.flagUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${slide.flagUrl})` }}
                />
              ) : null}
            </div>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Postcard from
          </p>
          <h3 className="mt-0.5 truncate pr-16 font-serif text-xl font-semibold leading-tight text-stone-900">
            {slide.city}, {slide.country}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-stone-500">{slide.dates}</p>

          <div className="relative mt-2.5 h-72 w-full overflow-hidden rounded-sm bg-stone-900">
            {/* Soft blurred fill of the same photo so the full (contained) image
                sits on a rich backdrop instead of empty paper. */}
            <div
              aria-hidden
              className="absolute inset-0 scale-110 bg-cover bg-center opacity-50 blur-2xl"
              style={{ backgroundImage: `url(${slide.imageUrl})` }}
            />
            <img
              src={slide.imageUrl}
              alt={`${slide.city}, ${slide.country}`}
              className="relative h-full w-full object-contain"
              draggable={false}
            />
          </div>
        </motion.article>
      </AnimatePresence>

      {/* Progress dots */}
      {slides.length > 1 ? (
        <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <span
              key={`${s.city}-${i}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-stone-700" : "bg-stone-300"}`}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
