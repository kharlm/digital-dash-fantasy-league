/**
 * Daily check that Sleeper and ESPN still answer the way Pick'em expects.
 *
 * Unlike every other test, these hit the REAL APIs — that's the point: our
 * code doesn't change on its own, but these services can, and Sleeper's
 * projections endpoint is unofficial. Runs every morning from GitHub Actions
 * (.github/workflows/external-apis.yml), which emails Kharl on failure.
 * Never part of `npm test`, so an outage on their side can't block a push.
 *
 * Each check calls the same functions the site uses, so a pass means the
 * site's actual code works against today's APIs.
 *
 *   npm run test:contract
 */
import { beforeAll, describe, expect, it } from "vitest";

import { LEAGUES } from "@/config/leagues";
import { getRedraftMatchups, getRedraftScores, getRedraftTeams } from "@/lib/pickem/matchups";
import { getProjectedTotals } from "@/lib/pickem/projections";
import { getFirstKickoff, getPickemWeek, isNflWeekFinal } from "@/lib/pickem/schedule";
import { getSleeperState } from "@/lib/sleeper/client";
import type { SleeperState } from "@/lib/sleeper/types";

let state: SleeperState;
let inSeason: boolean;

beforeAll(async () => {
  state = await getSleeperState();
  inSeason = state.season_type === "regular" || state.season_type === "post";
});

describe("Sleeper (official API)", () => {
  it("NFL state: current week and season", () => {
    expect(Number.isInteger(state.week)).toBe(true);
    expect(state.season).toMatch(/^\d{4}$/);
    expect(["pre", "regular", "post", "off"]).toContain(state.season_type);
  });

  it("the redraft league has 10 teams, each with an owner and a name", async () => {
    const teams = [...(await getRedraftTeams()).values()];
    expect(teams).toHaveLength(10);
    for (const t of teams) {
      expect(t.ownerId).toMatch(/^\d+$/);
      expect(t.teamName).not.toMatch(/^Roster \d+$/); // the fallback when a name can't be resolved
    }
  });

  it("this week's matchups pair up all 10 teams", async ({ skip }) => {
    if (!inSeason) skip("offseason");
    const matchups = await getRedraftMatchups(state.week);
    expect(matchups).toHaveLength(5);
    expect(new Set(matchups.flatMap((m) => [m.a.rosterId, m.b.rosterId])).size).toBe(10);
  });

  it("last week's final scores are numbers for every team", async ({ skip }) => {
    if (!inSeason || state.week < 2) skip("no completed week yet");
    const scores = await getRedraftScores(state.week - 1);
    expect(scores.size).toBe(10);
    expect([...scores.values()].every((p) => typeof p === "number" && p > 0)).toBe(true);
  });
});

describe("Sleeper projections (UNOFFICIAL — the most likely to break)", () => {
  it("still produce a projected total for every team", async ({ skip }) => {
    if (!inSeason) skip("offseason");
    const { season, week } = await getPickemWeek();
    const result = await getProjectedTotals(season, week);

    // On failure, the message includes the same plain-English summary the
    // admin page would show.
    expect(result, result.ok ? "" : `${result.kind}: ${"summary" in result ? result.summary : ""} (${result.reason})`).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.totals.size).toBe(10);
    // Real lineups project well above zero; a team at 0 means a stat or
    // player-id format changed.
    const zeros = [...result.totals.values()].filter((p) => p <= 0).length;
    expect(zeros, "teams projecting 0 points").toBeLessThanOrEqual(1);
  });
});

describe("ESPN scoreboard (kickoff times and game status)", () => {
  it("has a first kickoff for the upcoming Pick'em week", async ({ skip }) => {
    if (!inSeason) skip("offseason");
    const { season, week } = await getPickemWeek();
    const kickoff = await getFirstKickoff(season, week);
    expect(kickoff).toBeInstanceOf(Date);
  });

  it("reports last week as final (what grading waits for)", async ({ skip }) => {
    if (!inSeason || state.week < 2) skip("no completed week yet");
    expect(await isNflWeekFinal(Number(state.season), state.week - 1)).toBe(true);
  });
});

it("league config still points at a real Sleeper league", () => {
  expect(LEAGUES.redraft.leagueId).toMatch(/^\d+$/);
});
