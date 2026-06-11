"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize2, Play, X } from "lucide-react";

import type { Photo } from "@/lib/types";

const SWIPE_THRESHOLD = 40; // px of horizontal travel before a swipe counts
const VISIBLE = 4; // cards rendered in the stack at once (front + up to 3 behind)
const CARD_SIZES = "(max-width: 672px) 100vw, 640px";

export function PostCarousel({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const len = photos.length;
  const safeIndex = ((index % len) + len) % len;
  const current = photos[safeIndex];

  const prev = useCallback(() => setIndex((i) => i - 1), []);
  const next = useCallback(() => setIndex((i) => i + 1), []);

  // Warm the cache for neighbouring media so advancing the deck is instant.
  useEffect(() => {
    if (len < 2) return;
    for (const offset of [1, -1]) {
      const photo = photos[(((safeIndex + offset) % len) + len) % len];
      const href = photo?.mediaType === "video" ? photo.posterUrl : photo?.url;
      if (!href) continue;
      const img = new window.Image();
      img.src = href;
    }
  }, [safeIndex, photos, len]);

  // Keyboard control while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  // Lock body scroll while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || len < 2) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (delta > SWIPE_THRESHOLD) prev();
    else if (delta < -SWIPE_THRESHOLD) next();
    touchStartX.current = null;
  }

  if (len === 0) return null;

  // The cards currently visible in the stack: the front photo and the few behind it.
  const visibleCount = Math.min(VISIBLE, len);
  const stack = Array.from({ length: visibleCount }, (_, depth) => {
    const i = (((safeIndex + depth) % len) + len) % len;
    return { photo: photos[i], depth };
  });

  return (
    <>
      <div
        className="relative select-none"
        style={{ perspective: 1200 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Reserved top space (top-6 on the cards) keeps the peeking back-cards
            inside the deck so they never bleed up into the post title above. */}
        <div className="relative aspect-[4/5] w-full">
          <AnimatePresence initial={false}>
            {stack
              .slice()
              .reverse()
              .map(({ photo, depth }) => {
                const isFront = depth === 0;
                const interactive = isFront && photo.mediaType !== "video";
                return (
                  <motion.div
                    key={photo.id}
                    className="absolute inset-x-0 bottom-0 top-6 rounded-2xl bg-stone-50 p-2.5 pb-7 shadow-2xl ring-1 ring-black/10"
                    style={{ zIndex: len - depth, transformOrigin: "top center" }}
                    initial={{ opacity: 0, scale: 0.9, y: 18 }}
                    animate={{
                      opacity: depth > 2 ? 0 : 1,
                      scale: reduceMotion ? 1 : 1 - depth * 0.05,
                      y: reduceMotion ? 0 : depth * -12,
                    }}
                    exit={{ opacity: 0, scale: 0.85, y: -40 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.15 }
                        : { type: "spring", stiffness: 320, damping: 32 }
                    }
                  >
                    {interactive ? (
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-lg bg-stone-950"
                        aria-label="Open full screen"
                      >
                        <CardMedia photo={photo} isFront={isFront} />
                        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                          <Maximize2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </button>
                    ) : (
                      <div className="relative h-full w-full overflow-hidden rounded-lg bg-stone-950">
                        <CardMedia photo={photo} isFront={isFront} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {len > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/65"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/65"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute right-5 top-10 z-50 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                {safeIndex + 1} / {len}
              </div>
            </>
          ) : null}
        </div>

        {/* Dot indicators sit below the postcard, on the dark feed background. */}
        {len > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setIndex(i)}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  i === safeIndex ? "bg-white" : "bg-white/30"
                }`}
                aria-label={`Go to item ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {open && current.mediaType !== "video" ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 animate-[fade-in_150ms_ease-out]"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Full-resolution view; intentionally a plain img so zoom shows the original. */}
          <img
            src={current.url}
            alt={current.altText}
            className="max-h-[90vh] max-w-[92vw] select-none object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />

          {len > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur">
                {safeIndex + 1} / {len}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// Renders the media inside a postcard's image well: a blurred fill of the same
// frame behind a fully-contained image/video, so no photo is ever cropped and
// every card keeps the same dimensions regardless of orientation.
function CardMedia({ photo, isFront }: { photo: Photo; isFront: boolean }) {
  const fillUrl = photo.mediaType === "video" ? photo.posterUrl : photo.url;

  return (
    <>
      {fillUrl ? (
        <div
          aria-hidden
          className="absolute inset-0 scale-125 bg-cover bg-center opacity-50 blur-2xl"
          style={{ backgroundImage: `url(${fillUrl})` }}
        />
      ) : null}

      {photo.mediaType === "video" ? (
        isFront ? (
          <video
            src={photo.url}
            poster={photo.posterUrl ?? undefined}
            controls
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <>
            {photo.posterUrl ? (
              <Image src={photo.posterUrl} alt={photo.altText} fill sizes={CARD_SIZES} className="object-contain" />
            ) : null}
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white">
              <Play className="h-6 w-6" aria-hidden="true" />
            </span>
          </>
        )
      ) : (
        <Image
          src={photo.url}
          alt={photo.altText}
          fill
          sizes={CARD_SIZES}
          className="object-contain"
          draggable={false}
        />
      )}
    </>
  );
}
