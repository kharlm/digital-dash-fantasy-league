import { LEAGUES } from "@/config/leagues";
import { getRosters, getSleeperState, getTradedPicks, getUsers } from "@/lib/sleeper/client";
import { teamNameFor } from "@/lib/sleeper/team-names";

export interface DraftPickOwnership {
  season: string;
  round: number;
  originalTeam: string;
  currentOwner: string;
  traded: boolean;
}

/** Matches the dynasty league's rookie draft — verified against league.settings.draft_rounds (3) and the most recent completed draft's round count. */
const ROUNDS_PER_DRAFT = 3;

/** Always show at least this many seasons ahead of the current one, even if nothing's been traded that far out yet — extended below if a real trade reaches further. */
const MIN_YEARS_AHEAD = 2;

/**
 * Dynasty-only, live (no build-time snapshot, no cache): trades can happen
 * anytime, and the whole point is replacing a manually-kept doc, so this
 * needs to be correct the moment you load the page, not stale until the
 * next deploy. Redraft has no keeper continuity, so "future draft picks"
 * isn't a concept that applies there — this intentionally never takes a
 * league param.
 */
export async function getDraftPickOwnership(): Promise<DraftPickOwnership[]> {
  const league = LEAGUES.dynasty;
  const [state, rosters, users, tradedPicks] = await Promise.all([
    getSleeperState(),
    getRosters(league.leagueId),
    getUsers(league.leagueId),
    getTradedPicks(league.leagueId),
  ]);

  const currentSeason = Number(state.season);
  const furthestTradedSeason = tradedPicks.reduce((max, p) => Math.max(max, Number(p.season)), currentSeason);
  const lastSeason = Math.max(currentSeason + MIN_YEARS_AHEAD, furthestTradedSeason);
  const seasons = Array.from({ length: lastSeason - currentSeason + 1 }, (_, i) => String(currentSeason + i));

  const currentOwnerByKey = new Map(tradedPicks.map((p) => [`${p.season}-${p.round}-${p.roster_id}`, p.owner_id]));

  const results: DraftPickOwnership[] = [];
  for (const season of seasons) {
    for (let round = 1; round <= ROUNDS_PER_DRAFT; round++) {
      for (const roster of rosters) {
        const currentOwnerId = currentOwnerByKey.get(`${season}-${round}-${roster.roster_id}`);
        results.push({
          season,
          round,
          originalTeam: teamNameFor(roster.roster_id, rosters, users),
          currentOwner: teamNameFor(currentOwnerId ?? roster.roster_id, rosters, users),
          traded: currentOwnerId != null,
        });
      }
    }
  }

  return results;
}
