"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import type { Photo } from "@/lib/data/photos";

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight") setSelected((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setSelected((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="rounded-lg py-24 text-center ring-1 ring-navy-600">
        <p className="text-fg-muted">No photos yet — check back soon.</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        {photos.map((photo, index) => (
          <motion.button
            key={photo.src}
            type="button"
            onClick={() => setSelected(index)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="group relative mb-4 block w-full cursor-zoom-in overflow-hidden rounded-lg ring-1 ring-navy-600 transition-shadow hover:shadow-[0_0_24px_rgba(245,180,24,0.25)] hover:ring-gold-500/60"
          >
            <Image
              src={photo.src}
              alt={photo.caption ?? "DDFL photo"}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="block h-auto w-full transition-transform duration-300 group-hover:scale-105"
            />
            {photo.year ? (
              <span className="absolute right-2 bottom-2 rounded-full bg-navy-950/80 px-2 py-0.5 text-xs font-medium text-gold-400 opacity-0 transition-opacity group-hover:opacity-100">
                {photo.year}
              </span>
            ) : null}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/95 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-3xl leading-none text-fg-muted hover:text-fg"
            >
              ×
            </button>

            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setSelected((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
              }}
              className="absolute left-2 text-4xl text-fg-muted hover:text-gold-400 sm:left-6"
            >
              ‹
            </button>

            <motion.div
              key={selected}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="relative max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={photos[selected].src}
                alt={photos[selected].caption ?? "DDFL photo"}
                width={photos[selected].width}
                height={photos[selected].height}
                className="max-h-[85vh] w-auto rounded-lg object-contain"
              />
              {photos[selected].year ? (
                <span className="absolute bottom-3 left-3 rounded-full bg-navy-950/80 px-3 py-1 text-xs font-medium text-gold-400">
                  {photos[selected].year}
                </span>
              ) : null}
              {photos[selected].caption ? (
                <p className="mt-2 text-center text-sm text-fg-muted">{photos[selected].caption}</p>
              ) : null}
            </motion.div>

            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setSelected((i) => (i === null ? i : (i + 1) % photos.length));
              }}
              className="absolute right-2 text-4xl text-fg-muted hover:text-gold-400 sm:right-6"
            >
              ›
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
