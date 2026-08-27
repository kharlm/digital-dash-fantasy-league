import { NextResponse } from "next/server";

import { LEAGUES, isLeagueType } from "@/config/leagues";
import { getMatchups, getRosters, getSleeperState, getUsers } from "@/lib/sleeper/client";
import { teamNameFor } from "@/lib/sleeper/team-names";
import type { SleeperMatchup } from "@/lib/sleeper/types";

export const dynamic = "force-dynamic";

export interface LiveMatchup {
  matchupId: number;
  teamA: string;
  pointsA: number;
  teamB: string;
  pointsB: number;
}

export interface LiveScoresResponse {
  inSeason: boolean;
  week: number | null;
  matchups: LiveMatchup[];
}

/**
 * The live-scores counterpart to lib/news/activity.ts: reads straight from
 * Sleeper on every request (force-dynamic, no caching) since this is the one
 * page in the app meant to visibly change while you're looking at it. Polled
 * client-side by components/live-scoreboard.tsx, not read at build time.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league } = await params;
  if (!isLeagueType(league)) {
    return NextResponse.json({ error: "Unknown league" }, { status: 404 });
  }

  try {
    const state = await getSleeperState();
    const inSeason = state.season_type === "regular" || state.season_type === "post";
    if (!inSeason) {
      return NextResponse.json<LiveScoresResponse>({ inSeason: false, week: null, matchups: [] });
    }

    const leagueConfig = LEAGUES[league];
    const [matchups, rosters, users] = await Promise.all([
      getMatchups(leagueConfig.leagueId, state.week),
      getRosters(leagueConfig.leagueId),
      getUsers(leagueConfig.leagueId),
    ]);

    const byMatchupId = new Map<number, SleeperMatchup[]>();
    for (const m of matchups) {
      if (m.matchup_id == null) continue;
      const group = byMatchupId.get(m.matchup_id) ?? [];
      group.push(m);
      byMatchupId.set(m.matchup_id, group);
    }

    const resolved: LiveMatchup[] = [];
    for (const [matchupId, pair] of byMatchupId) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      resolved.push({
        matchupId,
        teamA: teamNameFor(a.roster_id, rosters, users),
        pointsA: a.points,
        teamB: teamNameFor(b.roster_id, rosters, users),
        pointsB: b.points,
      });
    }

    return NextResponse.json<LiveScoresResponse>({ inSeason: true, week: state.week, matchups: resolved });
  } catch {
    return NextResponse.json({ error: "Failed to load live scores" }, { status: 502 });
  }
}
