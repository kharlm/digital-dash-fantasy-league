/**
 * Walks each league's `previous_league_id` chain back to the earliest season
 * Sleeper knows about, pulls that season's rosters/users/playoff brackets,
 * reshapes them into the `SnapshotSeason` shape pages actually read, and
 * writes one JSON file per league to `data/`.
 *
 * Historical seasons are immutable once Sleeper marks them "complete," so
 * there's no reason for a page render to ever hit the Sleeper API for them —
 * this script is the only thing that does, and only when re-run (manually,
 * or as a Vercel `prebuild` step once that's wired up). Current-season data
 * still comes from here too (so `npm run snapshot` always reflects "now"),
 * but a live season's numbers will drift stale between runs — that's what
 * Phase 2's ISR revalidation is for, not this script.
 *
 * Run with `npm run snapshot`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { LEAGUE_TYPES, LEAGUES, type LeagueConfig, type LeagueType } from "../config/leagues.ts";
import {
  getLeague,
  getLosersBracket,
  getRosters,
  getUsers,
  getWinnersBracket,
} from "../lib/sleeper/client.ts";
import type {
  SleeperBracketMatch,
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
} from "../lib/sleeper/types.ts";
import type {
  BracketMatchResolved,
  LeagueSnapshot,
  SnapshotSeason,
  SnapshotTeam,
} from "../lib/sleeper/snapshot-types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data");

/** Follows previous_league_id from the current season back to the earliest
 *  one Sleeper has, oldest first. Each season only has one predecessor, so
 *  this can't be parallelized — has to walk one hop at a time. */
async function walkChain(startLeagueId: string): Promise<SleeperLeague[]> {
  const seasons: SleeperLeague[] = [];
  let leagueId: string | null = startLeagueId;
  while (leagueId) {
    const league: SleeperLeague = await getLeague(leagueId);
    seasons.push(league);
    leagueId = league.previous_league_id;
  }
  return seasons.reverse(); // oldest -> newest
}

function resolveBracket(matches: SleeperBracketMatch[]): BracketMatchResolved[] {
  return matches.map((m) => ({
    round: m.r,
    matchId: m.m,
    team1RosterId: m.t1 ?? null,
    team2RosterId: m.t2 ?? null,
    winnerRosterId: m.w ?? null,
    loserRosterId: m.l ?? null,
    placement: m.p ?? null,
  }));
}

/**
 * Only the placement (championship / 3rd-place-game / etc.) matches carry a
 * `p` field. A match with p=N sends its winner to Nth and its loser to
 * (N+1)th. Teams that didn't play in any placement match (bounced from the
 * playoffs before one, or the season isn't over yet) are left unranked
 * here — full finish resolution including consolation standings is Phase 2.
 */
function computeFinishes(bracket: BracketMatchResolved[]): Map<number, number> {
  const finishes = new Map<number, number>();
  for (const match of bracket) {
    if (match.placement == null) continue;
    if (match.winnerRosterId != null) finishes.set(match.winnerRosterId, match.placement);
    if (match.loserRosterId != null) finishes.set(match.loserRosterId, match.placement + 1);
  }
  return finishes;
}

function buildTeams(
  rosters: SleeperRoster[],
  users: SleeperUser[],
  finishes: Map<number, number>,
): SnapshotTeam[] {
  const userById = new Map(users.map((u) => [u.user_id, u]));
  return rosters
    .map((roster): SnapshotTeam => {
      const user = roster.owner_id ? userById.get(roster.owner_id) : undefined;
      return {
        rosterId: roster.roster_id,
        ownerId: roster.owner_id,
        teamName: user?.metadata?.team_name || user?.display_name || `Roster ${roster.roster_id}`,
        displayName: user?.display_name ?? "Unknown",
        avatar: user?.avatar ?? null,
        wins: roster.settings.wins ?? 0,
        losses: roster.settings.losses ?? 0,
        ties: roster.settings.ties ?? 0,
        // fpts_decimal/fpts_against(_decimal) are omitted entirely by Sleeper
        // until a season has scores to report (e.g. pre-draft), not just 0.
        pointsFor: (roster.settings.fpts ?? 0) + (roster.settings.fpts_decimal ?? 0) / 100,
        pointsAgainst:
          (roster.settings.fpts_against ?? 0) + (roster.settings.fpts_against_decimal ?? 0) / 100,
        finish: finishes.get(roster.roster_id) ?? null,
      };
    })
    .sort((a, b) => (a.finish ?? 99) - (b.finish ?? 99) || b.wins - a.wins || b.pointsFor - a.pointsFor);
}

async function snapshotSeason(league: SleeperLeague, leagueType: LeagueType): Promise<SnapshotSeason> {
  const [rosters, users, winnersBracket, losersBracket] = await Promise.all([
    getRosters(league.league_id),
    getUsers(league.league_id),
    getWinnersBracket(league.league_id),
    getLosersBracket(league.league_id),
  ]);

  const resolvedWinners = resolveBracket(winnersBracket);
  const resolvedLosers = resolveBracket(losersBracket);
  const finishes = computeFinishes(resolvedWinners);

  return {
    leagueType,
    season: league.season,
    leagueId: league.league_id,
    status: league.status,
    teams: buildTeams(rosters, users, finishes),
    winnersBracket: resolvedWinners,
    losersBracket: resolvedLosers,
  };
}

async function snapshotLeague(config: LeagueConfig): Promise<LeagueSnapshot> {
  const chain = await walkChain(config.leagueId);
  const seasons = await Promise.all(chain.map((league) => snapshotSeason(league, config.type)));
  return { leagueType: config.type, seasons };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const type of LEAGUE_TYPES) {
    const config = LEAGUES[type];
    const snapshot = await snapshotLeague(config);
    const outPath = join(OUT_DIR, `${type}.json`);
    await writeFile(outPath, JSON.stringify(snapshot, null, 2));

    const seasonSummary = snapshot.seasons
      .map((s) => `${s.season} (${s.status}, ${s.teams.length} teams)`)
      .join(", ");
    console.log(`${type}: ${seasonSummary} -> data/${type}.json`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
