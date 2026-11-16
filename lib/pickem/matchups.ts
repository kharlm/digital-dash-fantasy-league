import "server-only";

import { LEAGUES } from "@/config/leagues";
import { getMatchups, getRosters, getUsers } from "@/lib/sleeper/client";
import { teamNameFor } from "@/lib/sleeper/team-names";
import type { SleeperMatchup } from "@/lib/sleeper/types";

export type PickemTeam = { rosterId: number; ownerId: string | null; teamName: string };
export type PickemMatchup = { matchupId: number; a: PickemTeam; b: PickemTeam };

/**
 * Every redraft team, by roster_id. Props reference roster_ids (stable all
 * season, and what Sleeper's matchups/scores are keyed by); the owner_id
 * links a roster back to a Pick'em manager.
 */
export async function getRedraftTeams(): Promise<Map<number, PickemTeam>> {
  const leagueId = LEAGUES.redraft.leagueId;
  const [rosters, users] = await Promise.all([getRosters(leagueId), getUsers(leagueId)]);
  return new Map(
    rosters.map((r) => [
      r.roster_id,
      { rosterId: r.roster_id, ownerId: r.owner_id ?? null, teamName: teamNameFor(r.roster_id, rosters, users) },
    ]),
  );
}

/** The redraft head-to-head pairings for a week — Sleeper publishes the whole season's schedule up front. */
export async function getRedraftMatchups(week: number): Promise<PickemMatchup[]> {
  const [matchups, teams] = await Promise.all([
    getMatchups(LEAGUES.redraft.leagueId, week),
    getRedraftTeams(),
  ]);

  const byId = new Map<number, SleeperMatchup[]>();
  for (const m of matchups) {
    if (m.matchup_id == null) continue;
    byId.set(m.matchup_id, [...(byId.get(m.matchup_id) ?? []), m]);
  }

  const pairs: PickemMatchup[] = [];
  for (const [matchupId, pair] of byId) {
    const [x, y] = pair;
    const a = x && teams.get(x.roster_id);
    const b = y && teams.get(y.roster_id);
    if (pair.length === 2 && a && b) pairs.push({ matchupId, a, b });
  }
  return pairs.sort((p, q) => p.matchupId - q.matchupId);
}

/** roster_id -> points for a week; what the grader reads once the week is final. */
export async function getRedraftScores(week: number): Promise<Map<number, number>> {
  const matchups = await getMatchups(LEAGUES.redraft.leagueId, week);
  return new Map(matchups.map((m) => [m.roster_id, m.points]));
}
