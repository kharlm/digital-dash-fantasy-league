"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const AUTO_DISMISS_MS = 6000;

/**
 * A one-off celebratory splash for commissioner Rosemond's newborn son
 * Kalen. Mounted in the root layout, so — like SiteHeader/SiteTicker — it
 * persists across client-side navigation and only actually appears on a
 * fresh page load (hard nav, refresh, new tab), which is what a splash
 * screen should do rather than reappearing every time you click a link.
 * Remove this component and its usage in app/layout.tsx once it's run its
 * course; unlike the header, it's not meant to be permanent.
 */
export function KalenSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Announcement: welcome baby Kalen"
      onClick={() => setVisible(false)}
      className="animate-hero-in fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-navy-950/97 px-6 text-center backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
        }}
        aria-label="Close"
        className="absolute top-6 right-6 text-2xl text-fg-subtle transition-colors hover:text-fg"
      >
        ✕
      </button>

      <div className="h-48 w-48 overflow-hidden rounded-full ring-4 ring-gold-500 drop-shadow-[0_0_40px_rgba(245,180,24,0.35)] sm:h-64 sm:w-64">
        <Image
          src="/photos/photo-08.jpg"
          alt="Baby Kalen"
          width={400}
          height={400}
          priority
          className="h-full w-full object-cover object-[50%_85%]"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.3em] text-fg-subtle uppercase">
          Welcome to the league
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-wide text-fg uppercase sm:text-5xl">
          Kalen
        </h2>
        <p className="font-display text-lg font-semibold text-gold-400 uppercase sm:text-xl">
          2044 DDFL Champion
        </p>
        <p className="text-sm text-fg-subtle">(calling it now)</p>
      </div>

      <p className="text-xs text-fg-subtle">Tap anywhere to continue</p>
    </div>
  );
}
