"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import type { LeagueType } from "@/config/leagues";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "standings", label: "Standings" },
  { segment: "history", label: "History" },
  { segment: "drafts", label: "Drafts" },
  { segment: "brackets", label: "Brackets" },
] as const;

/**
 * Lives inside app/[league]/layout.tsx, so `useSelectedLayoutSegment` here
 * resolves to whatever's active *below* that layout ("standings" /
 * "history") — a different scope than the same hook in LeagueSwitcher,
 * which resolves the segment below the root layout instead.
 */
export function LeagueNav({ league }: { league: LeagueType }) {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <nav className="flex gap-6 border-b border-navy-600">
      {TABS.map((tab) => {
        const isActive = activeSegment === tab.segment;
        return (
          <Link
            key={tab.segment}
            href={`/${league}/${tab.segment}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 pb-3 text-sm font-medium transition-colors",
              isActive
                ? "border-gold-500 text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
