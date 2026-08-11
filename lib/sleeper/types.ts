/**
 * Hand-written DTOs for the subset of each Sleeper response this site
 * actually reads. Sleeper's objects carry many more fields (particularly
 * `settings` on League and Roster, which are grab-bags of every league
 * option Sleeper supports) — those are typed as `Record<string, unknown>`
 * rather than enumerated, since we don't read most of them and an
 * incomplete enumeration would be more misleading than an honest "unknown
 * bag of settings."
 */

export interface SleeperLeague {
  league_id: string;
  previous_league_id: string | null;
  name: string;
  season: string;
  season_type: string;
  status: "pre_draft" | "drafting" | "in_season" | "complete";
  sport: "nfl";
  total_rosters: number;
  draft_id: string | null;
  roster_positions: string[];
  settings: Record<string, unknown>;
  scoring_settings: Record<string, number>;
}

/**
 * Sleeper omits most of these fields entirely (not just zeroes them) until
 * there's something to report — a fresh pre-draft roster has `wins`/`fpts`
 * but no `fpts_decimal`/`fpts_against`/`fpts_against_decimal` at all.
 */
export interface SleeperRosterSettings {
  wins?: number;
  losses?: number;
  ties?: number;
  fpts?: number;
  fpts_decimal?: number;
  fpts_against?: number;
  fpts_against_decimal?: number;
  [key: string]: unknown;
}

export interface SleeperRoster {
  roster_id: number;
  league_id: string;
  owner_id: string | null;
  co_owners: string[] | null;
  players: string[] | null;
  starters: string[] | null;
  settings: SleeperRosterSettings;
}

export interface SleeperUser {
  user_id: string;
  league_id: string;
  display_name: string;
  avatar: string | null;
  is_owner: boolean;
  metadata: {
    team_name?: string;
    [key: string]: unknown;
  } | null;
}

export interface SleeperMatchup {
  matchup_id: number | null;
  roster_id: number;
  points: number;
  players: string[];
  starters: string[];
  starters_points: number[];
  players_points: Record<string, number>;
}

/**
 * One bracket match. `t1`/`t2` are roster_ids when the slot is already
 * resolved, but early rounds instead carry `t1_from`/`t2_from` pointing at
 * the match whose winner (`w`) or loser (`l`) feeds this slot — so a bracket
 * can only be fully resolved after walking match results in order.
 */
export interface SleeperBracketMatch {
  r: number; // round
  m: number; // match id, unique within the bracket
  t1?: number | null;
  t2?: number | null;
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
  w?: number | null; // winning roster_id, once played
  l?: number | null; // losing roster_id, once played
  p?: number; // if set, the placement this match decides (1 = championship)
}

export interface SleeperDraftPickMetadata {
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  amount?: string; // present for auction drafts
}

export interface SleeperDraftPick {
  draft_id: string;
  round: number;
  pick_no: number;
  draft_slot: number;
  roster_id: number;
  picked_by: string | null;
  player_id: string;
  is_keeper: boolean | null;
  metadata: SleeperDraftPickMetadata;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  season: string;
  status: "pre_draft" | "drafting" | "complete";
  type: "snake" | "auction" | "linear";
  start_time: number | null;
  draft_order: Record<string, number> | null;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: "trade" | "waiver" | "free_agent";
  status: "complete" | "failed" | "pending";
  created: number;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: Array<{
    season: string;
    round: number;
    roster_id: number;
    owner_id: number;
    previous_owner_id: number;
  }>;
}

/** `GET /players/nfl` keyed by player_id — huge, fetch once and cache. */
export interface SleeperPlayer {
  player_id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
}

export type SleeperPlayerMap = Record<string, SleeperPlayer>;
