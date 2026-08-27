/**
 * The two Sleeper leagues this site covers. Everything downstream (snapshot
 * script, standings, drafts, brackets) is tagged with `LeagueType` and reads
 * its starting `league_id` from here — so rolling over to a new season is a
 * one-line edit to `leagueId` (Sleeper keeps the same league across a season
 * rollover until the commissioner starts a new one) plus updating the draft
 * date, rather than a hunt through the codebase.
 */

export type LeagueType = "dynasty" | "redraft";

export interface LeagueConfig {
  type: LeagueType;
  name: string;
  /** Current season's league_id — the head of the previous_league_id chain. */
  leagueId: string;
  /** ISO 8601 with offset, so it's unambiguous regardless of server TZ. */
  draftTime: string;
}

export const LEAGUES: Record<LeagueType, LeagueConfig> = {
  redraft: {
    type: "redraft",
    name: "DDFL Redraft",
    leagueId: "1312926438176854016",
    draftTime: "2026-08-29T14:15:00-04:00",
  },
  dynasty: {
    type: "dynasty",
    name: "DDFL Dynasty",
    leagueId: "1312926332845293568",
    draftTime: "2026-08-29T17:30:00-04:00",
  },
};

export const LEAGUE_TYPES: LeagueType[] = ["redraft", "dynasty"];

/**
 * Narrows a raw `[league]` URL segment to `LeagueType`. The layout and both
 * pages under `app/[league]/` each receive `params` independently — Next
 * doesn't propagate the parent layout's `notFound()` as a type guard to its
 * children — so this one check is reused in all three rather than
 * re-implemented per file.
 */
export function isLeagueType(value: string): value is LeagueType {
  return (LEAGUE_TYPES as string[]).includes(value);
}
