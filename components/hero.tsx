import Image from "next/image";

import { DraftCountdown } from "@/components/draft-countdown";
import { LEAGUES } from "@/config/leagues";

/**
 * No "use client" and no Framer Motion here — this used to animate in via
 * Motion, but Motion's `initial={{opacity: 0}}` bakes that hidden state into
 * the server-rendered HTML, so the entire hero was invisible until the JS
 * bundle hydrated. The CSS-only `animate-hero-in` keyframe (see globals.css)
 * gives the same staggered fade-up with no JS dependency, which also lets
 * this go back to being a plain server component.
 */
export function Hero() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="animate-hero-in">
        <Image
          src="/logo.png"
          alt="Digital Dash Fantasy League crest"
          width={363}
          height={460}
          priority
          className="h-56 w-auto drop-shadow-[0_0_40px_rgba(13,95,224,0.35)] sm:h-72"
        />
      </div>

      <div className="animate-hero-in space-y-3" style={{ animationDelay: "0.1s" }}>
        <h1 className="font-display text-4xl font-semibold tracking-wide text-fg uppercase sm:text-6xl">
          Digital Dash
          <span className="block bg-gradient-to-b from-gold-300 via-gold-500 to-gold-600 bg-clip-text text-transparent">
            Fantasy League
          </span>
        </h1>
        <p className="text-sm font-medium tracking-[0.3em] text-fg-muted uppercase sm:text-base">
          10 Years Running
        </p>
      </div>

      <div className="animate-hero-in space-y-2" style={{ animationDelay: "0.2s" }}>
        <p className="text-xs font-medium tracking-[0.2em] text-fg-subtle uppercase">
          Redraft Draft Countdown
        </p>
        <DraftCountdown targetIso={LEAGUES.redraft.draftTime} />
      </div>

      <p className="animate-hero-in max-w-md text-balance text-fg-subtle" style={{ animationDelay: "0.3s" }}>
        Standings, drafts, brackets, and a decade of grudges — dynasty and
        redraft, all in one place.
      </p>
    </main>
  );
}
