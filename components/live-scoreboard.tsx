"use client";

import { useQuery } from "@tanstack/react-query";

import type { LiveScoresResponse } from "@/app/api/live-scores/[league]/route";
import { ChampionReveal } from "@/components/champion-reveal";
import type { LeagueType } from "@/config/leagues";

async function fetchLiveScores(league: LeagueType): Promise<LiveScoresResponse> {
  const res = await fetch(`/api/live-scores/${league}`);
  if (!res.ok) throw new Error("Failed to load live scores");
  return res.json();
}

export function LiveScoreboard({ league }: { league: LeagueType }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["live-scores", league],
    queryFn: () => fetchLiveScores(league),
    // Frequent enough to feel live without hammering Sleeper's API.
    refetchInterval: 30_000,
  });

  if (isPending) {
    return <p className="text-fg-muted">Loading live scores…</p>;
  }
  if (isError) {
    return <p className="text-fg-muted">Couldn&apos;t load live scores. Try refreshing.</p>;
  }
  if (!data.inSeason) {
    return (
      <div>
        <p className="text-fg-muted">No games in progress — check back once the season kicks off.</p>
        <ChampionReveal />
      </div>
    );
  }
  if (data.matchups.length === 0) {
    return <p className="text-fg-muted">No matchups found for week {data.week}.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
        <p className="text-xs font-medium tracking-[0.2em] text-orange-400 uppercase">Live — Week {data.week}</p>
      </div>

      <ul className="space-y-3">
        {data.matchups.map((m) => {
          const aLeads = m.pointsA > m.pointsB;
          const bLeads = m.pointsB > m.pointsA;
          return (
            <li
              key={m.matchupId}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-navy-600 bg-navy-800 px-4 py-3"
            >
              <span className={`text-right font-medium ${aLeads ? "text-fg" : "text-fg-muted"}`}>{m.teamA}</span>
              <span className="font-display text-lg tabular-nums">
                <span className={aLeads ? "text-gold-500" : "text-fg"}>{m.pointsA.toFixed(1)}</span>
                <span className="mx-2 text-fg-subtle">–</span>
                <span className={bLeads ? "text-gold-500" : "text-fg"}>{m.pointsB.toFixed(1)}</span>
              </span>
              <span className={`font-medium ${bLeads ? "text-fg" : "text-fg-muted"}`}>{m.teamB}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
