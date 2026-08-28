"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import type { LeagueType } from "@/config/leagues";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "standings", label: "Standings" },
  { segment: "scores", label: "Scores" },
  { segment: "history", label: "History" },
  { segment: "records", label: "Records" },
  { segment: "drafts", label: "Drafts" },
  // Redraft has no keeper continuity, so "who owns which future pick" isn't
  // a concept that applies there — this tab only makes sense for dynasty.
  { segment: "draft-picks", label: "Draft Picks", leagues: ["dynasty"] },
  { segment: "brackets", label: "Brackets" },
  { segment: "head-to-head", label: "Head-to-Head" },
] as const;

/**
 * Lives inside app/[league]/layout.tsx, so `useSelectedLayoutSegment` here
 * resolves to whatever's active *below* that layout ("standings" /
 * "history") — a different scope than the same hook in LeagueSwitcher,
 * which resolves the segment below the root layout instead.
 */
export function LeagueNav({ league }: { league: LeagueType }) {
  const activeSegment = useSelectedLayoutSegment();
  const tabs = TABS.filter((tab) => !("leagues" in tab) || (tab.leagues as readonly string[]).includes(league));

  return (
    <nav className="overflow-x-auto border-b border-navy-600">
      <div className="flex w-max gap-6">
        {tabs.map((tab) => {
          const isActive = activeSegment === tab.segment;
          return (
            <Link
              key={tab.segment}
              href={`/${league}/${tab.segment}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-gold-500 text-fg"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
