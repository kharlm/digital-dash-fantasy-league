import "server-only";

import { getSleeperState } from "@/lib/sleeper/client";

/**
 * Sleeper knows the fantasy week but not the NFL game schedule, so kickoff
 * times come from ESPN's public scoreboard (no auth, same unofficial-API
 * caveat as the ESPN history import). Regular-season weeks only — fantasy
 * playoffs run on NFL regular-season weeks 15-17.
 */
const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

type EspnScoreboard = { events?: { date: string }[] };

/** The week's first kickoff (normally Thursday Night Football) — Pick'em's lock time. */
export async function getFirstKickoff(season: number, week: number): Promise<Date | null> {
  const res = await fetch(`${ESPN_SCOREBOARD}?seasontype=2&week=${week}&dates=${season}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as EspnScoreboard;
  const times = (data.events ?? []).map((e) => Date.parse(e.date)).filter(Number.isFinite);
  return times.length ? new Date(Math.min(...times)) : null;
}

export type PickemWeek = { season: number; week: number; firstKickoff: Date | null };

/**
 * The week a new prop should target: Sleeper's current week until its first
 * game kicks off, then the next one. So on Monday/Tuesday of week 10 (after
 * week 10's Thursday game) the commissioner is setting up week 11.
 */
export async function getPickemWeek(now = new Date()): Promise<PickemWeek> {
  const state = await getSleeperState();
  const season = Number(state.season);
  const current = Math.max(state.week, 1);

  const kickoff = await getFirstKickoff(season, current);
  if (kickoff && kickoff > now) return { season, week: current, firstKickoff: kickoff };

  const next = current + 1;
  return { season, week: next, firstKickoff: await getFirstKickoff(season, next) };
}
