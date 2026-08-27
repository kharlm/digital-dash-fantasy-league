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
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { LEAGUE_TYPES, LEAGUES, type LeagueConfig, type LeagueType } from "../config/leagues.ts";
import {
  getDraftPicks,
  getDrafts,
  getLeague,
  getLosersBracket,
  getMatchups,
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
  SnapshotDraft,
  SnapshotSeason,
  SnapshotTeam,
  WeeklyMatchup,
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
 * Full 1..N finish for every roster in a completed season, not just the
 * playoff bracket. Only placement matches (the ones carrying a `p` field —
 * the championship, 3rd-place game, etc.) resolve a finish directly; this
 * combines three sources, in order:
 *
 *  1. The winners bracket's placement matches -> 1st, 2nd, 3rd, 4th, ...
 *  2. The losers/consolation bracket's placement matches, numbered
 *     continuing on from wherever the winners bracket left off (Sleeper's
 *     `p` field there is relative to that bracket, e.g. its own "p:1" is a
 *     5th-place game once 4 teams are already placed above it — verified
 *     against a real completed DDFL season rather than assumed).
 *  3. Anyone still unplaced (Sleeper doesn't always generate a consolation
 *     game for every non-playoff team) is ranked by regular-season record —
 *     wins, then points — for the remaining places.
 */
function computeFinishes(
  winnersBracket: BracketMatchResolved[],
  losersBracket: BracketMatchResolved[],
  rosters: SleeperRoster[],
): Map<number, number> {
  const finishes = new Map<number, number>();

  const applyBracket = (bracket: BracketMatchResolved[], offset: number) => {
    for (const match of bracket) {
      if (match.placement == null) continue;
      if (match.winnerRosterId != null) finishes.set(match.winnerRosterId, offset + match.placement);
      if (match.loserRosterId != null) finishes.set(match.loserRosterId, offset + match.placement + 1);
    }
  };

  applyBracket(winnersBracket, 0);
  applyBracket(losersBracket, finishes.size);

  const remaining = rosters
    .filter((r) => !finishes.has(r.roster_id))
    .sort((a, b) => {
      const winsDiff = (b.settings.wins ?? 0) - (a.settings.wins ?? 0);
      if (winsDiff !== 0) return winsDiff;
      const aPts = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100;
      const bPts = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100;
      return bPts - aPts;
    });

  let nextPlacement = finishes.size + 1;
  for (const roster of remaining) {
    finishes.set(roster.roster_id, nextPlacement);
    nextPlacement += 1;
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

/**
 * Every DDFL season so far has exactly one Sleeper draft (no separate rookie
 * draft object), so this takes the completed one if there is one, else
 * whatever's there — a not-yet-started draft still has a type and an order,
 * just no picks yet.
 */
async function snapshotDraft(league: SleeperLeague): Promise<SnapshotDraft | null> {
  const drafts = await getDrafts(league.league_id);
  const draft = drafts.find((d) => d.status === "complete") ?? drafts[0];
  if (!draft) return null;

  const rawPicks = await getDraftPicks(draft.draft_id);
  const picks = rawPicks.map((p) => ({
    round: p.round,
    pickNo: p.pick_no,
    draftSlot: p.draft_slot,
    rosterId: p.roster_id,
    playerName: `${p.metadata.first_name} ${p.metadata.last_name}`.trim(),
    position: p.metadata.position,
    nflTeam: p.metadata.team,
    amount: p.metadata.amount != null ? Number(p.metadata.amount) : null,
  }));

  return {
    draftId: draft.draft_id,
    type: draft.type,
    rounds: picks.reduce((max, p) => Math.max(max, p.round), 0),
    draftOrder: draft.draft_order,
    picks,
  };
}

/**
 * Fetches every regular-season week's matchups and pairs each matchup_id
 * into a single WeeklyMatchup. Only called for completed seasons, so
 * `playoff_week_start` is trusted to be the true, final regular-season
 * length rather than a settings value that could still change.
 */
async function snapshotWeeklyMatchups(league: SleeperLeague): Promise<WeeklyMatchup[]> {
  const playoffWeekStart = league.settings.playoff_week_start;
  if (typeof playoffWeekStart !== "number" || playoffWeekStart < 2) return [];

  const regularSeasonWeeks = Array.from({ length: playoffWeekStart - 1 }, (_, i) => i + 1);
  const weeks = await Promise.all(regularSeasonWeeks.map((week) => getMatchups(league.league_id, week)));

  const results: WeeklyMatchup[] = [];
  weeks.forEach((matchups, i) => {
    const week = regularSeasonWeeks[i];
    const byMatchupId = new Map<number, typeof matchups>();
    for (const m of matchups) {
      if (m.matchup_id == null) continue; // bye week — no opponent to pair with
      const group = byMatchupId.get(m.matchup_id) ?? [];
      group.push(m);
      byMatchupId.set(m.matchup_id, group);
    }
    for (const pair of byMatchupId.values()) {
      if (pair.length !== 2) continue; // malformed/incomplete pairing — skip rather than guess
      const [a, b] = pair;
      results.push({
        week,
        rosterIdA: a.roster_id,
        pointsA: a.points,
        rosterIdB: b.roster_id,
        pointsB: b.points,
      });
    }
  });

  return results;
}

async function snapshotSeason(league: SleeperLeague, leagueType: LeagueType): Promise<SnapshotSeason> {
  const [rosters, users, winnersBracket, losersBracket, draft, weeklyMatchups] = await Promise.all([
    getRosters(league.league_id),
    getUsers(league.league_id),
    getWinnersBracket(league.league_id),
    getLosersBracket(league.league_id),
    snapshotDraft(league),
    league.status === "complete" ? snapshotWeeklyMatchups(league) : Promise.resolve([]),
  ]);

  const resolvedWinners = resolveBracket(winnersBracket);
  const resolvedLosers = resolveBracket(losersBracket);
  // A "finish" is only meaningful once a season is actually over — a
  // pre-draft or in-progress season's bracket is empty or unresolved, so
  // ranking it now would just be regular-season order dressed up as a final
  // placement.
  const finishes =
    league.status === "complete"
      ? computeFinishes(resolvedWinners, resolvedLosers, rosters)
      : new Map<number, number>();

  return {
    leagueType,
    season: league.season,
    leagueId: league.league_id,
    status: league.status,
    teams: buildTeams(rosters, users, finishes),
    winnersBracket: resolvedWinners,
    losersBracket: resolvedLosers,
    draft,
    weeklyMatchups,
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

    // This script only knows about Sleeper — the redraft league also has
    // pre-2024 history backfilled once from ESPN (scripts/snapshot-espn.ts)
    // and committed directly to this same file. Without this, every build's
    // prebuild step would silently overwrite that history with a
    // Sleeper-only rebuild, since Sleeper's own chain has no idea those
    // seasons exist.
    const espnSeasons: LeagueSnapshot["seasons"] = await readFile(outPath, "utf8")
      .then((raw) => JSON.parse(raw).seasons.filter((s: { source?: string }) => s.source === "espn"))
      .catch(() => []);
    snapshot.seasons = [...espnSeasons, ...snapshot.seasons];

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
