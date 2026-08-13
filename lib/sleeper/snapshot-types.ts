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
  /** Null if the season has no draft yet (shouldn't happen once complete). */
  draft: SnapshotDraft | null;
  /**
   * Regular-season matchups only (weeks before playoff_week_start) — the
   * source data for head-to-head records and the record book. Playoff
   * matches are deliberately excluded: they're elimination games between
   * whichever teams the bracket paired, not part of the round-robin-ish
   * regular season rotation "head-to-head" normally means, and they're
   * already represented in winnersBracket/losersBracket above. Empty for
   * any season that isn't complete.
   */
  weeklyMatchups: WeeklyMatchup[];
}

export interface WeeklyMatchup {
  week: number;
  rosterIdA: number;
  pointsA: number;
  rosterIdB: number;
  pointsB: number;
}

export interface SnapshotDraftPick {
  round: number;
  pickNo: number;
  draftSlot: number;
  rosterId: number;
  playerName: string;
  position: string;
  nflTeam: string;
  /** Auction dollars spent, in whole dollars. Null for snake/linear drafts. */
  amount: number | null;
}

export interface SnapshotDraft {
  draftId: string;
  type: "snake" | "auction" | "linear";
  rounds: number;
  /** owner_id -> 1-indexed draft slot. Null if Sleeper never set one. */
  draftOrder: Record<string, number> | null;
  picks: SnapshotDraftPick[];
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

/**
 * A manager's aggregate record across every *completed* season, grouped by
 * Sleeper's owner_id (stable across seasons for the same person) rather than
 * roster_id or team name (both reset/can change each season).
 */
export interface ManagerTrend {
  ownerId: string;
  teamName: string;
  displayName: string;
  avatar: string | null;
  seasonsPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  avgFinish: number | null;
  bestFinish: number | null;
  worstFinish: number | null;
}
