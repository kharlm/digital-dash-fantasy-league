import type { LeagueType } from "@/config/leagues";

/**
 * The reshaped, per-season data the snapshot script writes to disk. This is
 * what pages actually read — never the raw Sleeper DTOs — so a page never
 * needs to know Sleeper's `fpts`/`fpts_decimal` split or resolve owner_id to
 * a display name itself.
 */
export interface SnapshotTeam {
  rosterId: number;
  ownerId: string | null;
  teamName: string;
  displayName: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Final standing for the season, 1-indexed. Set once brackets resolve. */
  finish: number | null;
}

export interface SnapshotSeason {
  leagueType: LeagueType;
  season: string;
  leagueId: string;
  status: SleeperLeagueStatus;
  teams: SnapshotTeam[];
  winnersBracket: BracketMatchResolved[];
  losersBracket: BracketMatchResolved[];
}

export type SleeperLeagueStatus = "pre_draft" | "drafting" | "in_season" | "complete";

/** A bracket match with t1/t2 already resolved to roster_ids, not slot refs. */
export interface BracketMatchResolved {
  round: number;
  matchId: number;
  team1RosterId: number | null;
  team2RosterId: number | null;
  winnerRosterId: number | null;
  loserRosterId: number | null;
  /** If set, this match decides that final placement (1 = championship). */
  placement: number | null;
}

/** One league's full history, oldest season first. */
export interface LeagueSnapshot {
  leagueType: LeagueType;
  seasons: SnapshotSeason[];
}
