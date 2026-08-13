"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { LEAGUE_TYPES } from "@/config/leagues";
import { cn } from "@/lib/utils";

/**
 * The always-visible Dynasty | Redraft toggle. `useSelectedLayoutSegment`,
 * called here in the root layout, returns whichever segment is active
 * directly below root — "dynasty", "redraft", or null when we're on a
 * non-league route like the homepage — which is what lets this highlight
 * the active league without parsing the URL by hand.
 *
 * Each link always lands on that league's standings page rather than trying
 * to preserve "you were on the history tab" across the switch — swapping
 * leagues while keeping the sub-page in sync would need the full current
 * pathname (a second client hook) for a small UX gain, not worth it yet.
 */
export function LeagueSwitcher() {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <div className="flex items-center rounded-full bg-navy-800 p-1 ring-1 ring-navy-600">
      {LEAGUE_TYPES.map((type) => {
        const isActive = activeSegment === type;
        return (
          <Link
            key={type}
            href={`/${type}/standings`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide capitalize transition-colors",
              isActive
                ? "bg-gold-500 text-navy-950"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {type}
          </Link>
        );
      })}
    </div>
  );
}
