import "server-only";

import { LEAGUES } from "@/config/leagues";
import { getMatchups } from "@/lib/sleeper/client";

/**
 * Projected team totals for suggesting Pick'em lines, the way the Sleeper
 * app's matchup screen does: each starter's projected stats, scored with
 * this league's own scoring_settings, summed per roster.
 *
 * The projections endpoint is unofficial (it's what Sleeper's app calls) —
 * so this is best-effort: on failure the admin form just has no suggestion.
 * Failures are split in two, because they call for different reactions:
 *  - "unavailable": Sleeper is slow or having a moment (timeout, network,
 *    5xx, 429). Try again later; nothing to fix.
 *  - "changed": the endpoint looks different from what this code expects
 *    (gone, now refused, or answering in a new shape). Kharl needs to know.
 */

/** Thrown when Sleeper answered, but not the way this code expects. */
class SleeperChangedError extends Error {}

// Statuses that mean "this request is no longer valid here", as opposed to
// a server hiccup (5xx) or being rate limited (429).
const CHANGED_STATUSES = new Set([400, 401, 403, 404, 410]);

function checkStatus(res: Response, what: string) {
  if (res.ok) return;
  const message = `Sleeper ${what} -> HTTP ${res.status}`;
  throw CHANGED_STATUSES.has(res.status) ? new SleeperChangedError(message) : new Error(message);
}

async function readJson(res: Response, what: string): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new SleeperChangedError(`Sleeper ${what} didn't return JSON`);
  }
}

type Projection = { player_id: string; stats?: Record<string, number> };

const PROJECTIONS_URL = "https://api.sleeper.app/projections/nfl";
const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

async function getLeagueScoring(): Promise<Record<string, number>> {
  const res = await fetch(`https://api.sleeper.app/v1/league/${LEAGUES.redraft.leagueId}`, {
    next: { revalidate: 3600 },
  });
  checkStatus(res, "league");
  const league = (await readJson(res, "league")) as { scoring_settings?: Record<string, number> };
  if (!league.scoring_settings) throw new SleeperChangedError("Sleeper league has no scoring_settings");
  return league.scoring_settings;
}

async function getProjections(season: number, week: number): Promise<Map<string, Record<string, number>>> {
  const query = POSITIONS.map((p) => `position[]=${p}`).join("&");
  // ~2MB — just over Next's fetch-cache limit, and only admins load this
  // about once a week, so it's fetched fresh rather than cached.
  const res = await fetch(`${PROJECTIONS_URL}/${season}/${week}?season_type=regular&${query}`, {
    cache: "no-store",
  });
  checkStatus(res, "projections");
  const rows = await readJson(res, "projections");
  if (!Array.isArray(rows)) throw new SleeperChangedError("Sleeper projections aren't a list anymore");
  const withStats = (rows as Projection[]).filter((r) => r.player_id && r.stats);
  if (rows.length > 0 && withStats.length === 0) {
    throw new SleeperChangedError("Sleeper projections no longer include player stats");
  }
  return new Map(withStats.map((r) => [r.player_id, r.stats!]));
}

function score(stats: Record<string, number>, scoring: Record<string, number>): number {
  let points = 0;
  for (const [stat, value] of Object.entries(stats)) {
    const weight = scoring[stat];
    if (weight) points += value * weight;
  }
  return points;
}

export type ProjectedTotals =
  | { ok: true; totals: Map<number, number> }
  | { ok: false; kind: "unavailable" | "changed"; reason: string };

const TIMEOUT_MS = 5000;

/**
 * roster_id -> projected points for the week's current starting lineups.
 * Never throws: the admin page renders either way, and on failure shows a
 * warning so the commissioner enters lines by hand (and tells Kharl).
 */
export async function getProjectedTotals(season: number, week: number): Promise<ProjectedTotals> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS),
    );
    const [matchups, projections, scoring] = await Promise.race([
      Promise.all([getMatchups(LEAGUES.redraft.leagueId, week), getProjections(season, week), getLeagueScoring()]),
      timeout,
    ]);

    const totals = new Map(
      matchups.map((m) => [
        m.roster_id,
        (m.starters ?? []).reduce((sum, id) => {
          const stats = projections.get(id);
          return stats ? sum + score(stats, scoring) : sum;
        }, 0),
      ]),
    );
    // An unofficial endpoint is more likely to change shape than to error
    // outright — answering 200 with nothing usable. All-zero totals is that.
    if (totals.size === 0 || [...totals.values()].every((points) => points === 0)) {
      throw new SleeperChangedError("Sleeper answered, but every team projects to 0 — the format may have changed");
    }
    return { ok: true, totals };
  } catch (error) {
    const kind = error instanceof SleeperChangedError ? "changed" : "unavailable";
    console.error(`[pickem] projected totals ${kind}:`, error);
    return { ok: false, kind, reason: error instanceof Error ? error.message : String(error) };
  }
}
