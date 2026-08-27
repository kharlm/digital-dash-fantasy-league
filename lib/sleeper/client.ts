import type {
  SleeperDraft,
  SleeperDraftPick,
  SleeperBracketMatch,
  SleeperLeague,
  SleeperMatchup,
  SleeperPlayerMap,
  SleeperRoster,
  SleeperState,
  SleeperTransaction,
  SleeperUser,
} from "./types";

const BASE_URL = "https://api.sleeper.app/v1";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getLeague(leagueId: string) {
  return getJson<SleeperLeague>(`/league/${leagueId}`);
}

export function getRosters(leagueId: string) {
  return getJson<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

export function getUsers(leagueId: string) {
  return getJson<SleeperUser[]>(`/league/${leagueId}/users`);
}

export function getMatchups(leagueId: string, week: number) {
  return getJson<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`);
}

export function getWinnersBracket(leagueId: string) {
  return getJson<SleeperBracketMatch[]>(`/league/${leagueId}/winners_bracket`);
}

export function getLosersBracket(leagueId: string) {
  return getJson<SleeperBracketMatch[]>(`/league/${leagueId}/losers_bracket`);
}

export function getDrafts(leagueId: string) {
  return getJson<SleeperDraft[]>(`/league/${leagueId}/drafts`);
}

export function getDraftPicks(draftId: string) {
  return getJson<SleeperDraftPick[]>(`/draft/${draftId}/picks`);
}

export function getTransactions(leagueId: string, week: number) {
  return getJson<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`);
}

/** Not league-scoped — tells you the current NFL week and whether the season has started. */
export function getSleeperState() {
  return getJson<SleeperState>("/state/nfl");
}

/**
 * ~10-15MB of every NFL player Sleeper knows about. Fetch once per snapshot
 * run (or once per server lifetime for live-score lookups), never per
 * request — this is the one endpoint where hitting it repeatedly would
 * actually risk the rate limit on its own.
 */
export function getAllPlayers() {
  return getJson<SleeperPlayerMap>("/players/nfl");
}
