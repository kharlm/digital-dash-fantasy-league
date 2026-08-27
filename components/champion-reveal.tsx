"use client";

import Image from "next/image";
import { useState } from "react";

import { CelebrationOverlay } from "@/components/celebration-overlay";

/**
 * Easter egg for the Scores page's off-season empty state: a pulsing trophy
 * link, easy to notice since it's the only interactive thing on an otherwise
 * empty page, but still a click away rather than shoved in front of anyone
 * who lands there — the actual "check back once the season starts" message
 * needs to read as trustworthy, not undercut by a joke sitting on top of it.
 * Self-retiring: this only renders from LiveScoreboard's off-season branch,
 * so it stops appearing on its own once real scores start showing.
 */
export function ChampionReveal() {
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gold-400 underline decoration-dotted underline-offset-4 transition-colors hover:text-gold-300"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-500" />
        </span>
        🏆 Curious who&apos;s already won?
      </button>

      {revealed ? (
        <CelebrationOverlay label="2026 DDFL Champion reveal" onDismiss={() => setRevealed(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl ring-4 ring-gold-500 drop-shadow-[0_0_50px_rgba(245,180,24,0.4)] sm:max-w-md">
            <Image
              src="/kharl-champion.png"
              alt="Kharl McCatty, 2026 DDFL Champion"
              width={1254}
              height={1254}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-6 text-xs text-fg-subtle">Tap anywhere to continue</p>
        </CelebrationOverlay>
      ) : null}
    </>
  );
}
