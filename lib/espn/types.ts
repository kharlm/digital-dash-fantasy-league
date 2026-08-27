/**
 * Hand-written DTOs for the subset of ESPN's unofficial fantasy API this
 * project reads, based on real responses pulled from the actual redraft
 * league's 2018-2023 ESPN seasons — not from ESPN's (nonexistent) official
 * docs. Unlike Sleeper, ESPN reuses the same numeric league_id across many
 * seasons but occasionally recreates the league under a *new* id (this
 * league has had at least two: one for 2018, another for 2019-2023) — see
 * config/espn-seasons.ts for the confirmed id per season.
 */

export interface EspnMember {
  id: string; // GUID, e.g. "{21CDC52B-6719-4646-8B27-3E0AA44E6D3F}"
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface EspnRecordSplit {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface EspnTeam {
  id: number;
  name?: string;
  location?: string;
  nickname?: string;
  owners: string[]; // member GUIDs
  primaryOwner: string;
  /** ESPN computes and returns the final standing itself — no bracket-
   *  topology reconstruction needed the way Sleeper required. */
  rankCalculatedFinal: number;
  record: { overall: EspnRecordSplit };
  logo?: string;
}

export interface EspnMatchupSide {
  teamId: number;
  totalPoints: number;
}

export type EspnPlayoffTier =
  | "NONE"
  | "WINNERS_BRACKET"
  | "WINNERS_CONSOLATION_LADDER"
  | "LOSERS_CONSOLATION_LADDER";

export interface EspnMatchup {
  id: number;
  matchupPeriodId: number;
  playoffTierType: EspnPlayoffTier;
  winner: "HOME" | "AWAY" | "TIE" | "UNDECIDED";
  home: EspnMatchupSide;
  away: EspnMatchupSide;
}

export interface EspnDraftPick {
  overallPickNumber: number;
  roundId: number;
  roundPickNumber: number;
  teamId: number;
  memberId: string;
  playerId: number;
  bidAmount: number;
  keeper: boolean;
}

export interface EspnScheduleSettings {
  playoffTeamCount: number;
}

export interface EspnLeagueResponse {
  id: number;
  seasonId: number;
  members: EspnMember[];
  teams: EspnTeam[];
  schedule: EspnMatchup[];
  draftDetail: { drafted: boolean; picks: EspnDraftPick[] };
  settings: { scheduleSettings: EspnScheduleSettings };
}

/** From the separate /players endpoint — draft picks only carry a numeric
 *  playerId, so resolving names is a second batched request. */
export interface EspnPlayer {
  id: number;
  fullName: string;
  defaultPositionId: number;
  proTeamId: number;
}
