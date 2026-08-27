import type { EspnLeagueResponse, EspnPlayer } from "./types";

const BASE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

/**
 * ESPN authenticates via two cookies from a logged-in browser session
 * (espn_s2, SWID) rather than an API key — there's no other way to read a
 * private league's history. Read from env so they never end up in source;
 * see .env.local (gitignored) and config/espn-seasons.ts for how this is
 * wired up.
 */
function authCookie(): string {
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;
  if (!s2 || !swid) {
    throw new Error("ESPN_S2 and ESPN_SWID must be set (see .env.local) to fetch ESPN history.");
  }
  return `espn_s2=${s2}; SWID=${swid}`;
}

async function getJson<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: authCookie(), ...extraHeaders },
  });
  if (!res.ok) {
    throw new Error(`ESPN API ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getEspnLeagueSeason(leagueId: number, season: number) {
  const views = ["mTeam", "mMatchupScore", "mSettings", "mDraftDetail"].map((v) => `view=${v}`).join("&");
  return getJson<EspnLeagueResponse>(`/seasons/${season}/segments/0/leagues/${leagueId}?${views}`);
}

/**
 * Draft picks only carry a numeric playerId — this resolves them to real
 * names/positions/teams via ESPN's batched player-lookup endpoint (the
 * `x-fantasy-filter` header, not a query param, is what scopes the request
 * to just the ids we ask for).
 */
export function getEspnPlayers(season: number, playerIds: number[]): Promise<EspnPlayer[]> {
  if (playerIds.length === 0) return Promise.resolve([]);
  return getJson<EspnPlayer[]>(`/seasons/${season}/players?view=players_wl`, {
    "x-fantasy-filter": JSON.stringify({ filterIds: { value: playerIds } }),
  });
}
