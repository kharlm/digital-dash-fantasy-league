import { LEAGUE_TYPES, LEAGUES, type LeagueType } from "@/config/leagues";
import { getAllPlayers, getMatchups, getRosters, getSleeperState, getTransactions, getUsers } from "@/lib/sleeper/client";
import type { SleeperPlayerMap, SleeperRoster, SleeperTransaction, SleeperUser } from "@/lib/sleeper/types";

export interface TradeEvent {
  league: LeagueType;
  createdAt: number;
  /** teamName -> assets that team received in the trade */
  received: Record<string, string[]>;
}

export interface ScoreEvent {
  league: LeagueType;
  week: number;
  teamA: string;
  pointsA: number;
  teamB: string;
  pointsB: number;
}

export interface LeagueActivity {
  trades: TradeEvent[];
  scores: ScoreEvent[];
}

function teamNameFor(rosterId: number, rosters: SleeperRoster[], users: SleeperUser[]): string {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  const user = roster?.owner_id ? users.find((u) => u.user_id === roster.owner_id) : undefined;
  return user?.metadata?.team_name || user?.display_name || `Roster ${rosterId}`;
}

/**
 * Trades are the only transaction type fed to the AI writer — waiver/free
 * agent adds happen constantly and aren't "news" the way a trade is. Sleeper
 * buckets transactions by week even during the offseason/preseason, so this
 * has to walk every week from 1 up to the current one rather than reading a
 * single "recent" endpoint (there isn't one).
 */
async function fetchLeagueTrades(
  type: LeagueType,
  currentWeek: number,
  players: SleeperPlayerMap,
): Promise<TradeEvent[]> {
  const league = LEAGUES[type];
  const weeks = Array.from({ length: Math.max(currentWeek, 1) }, (_, i) => i + 1);
  const [rosters, users, ...weeklyTxns] = await Promise.all([
    getRosters(league.leagueId),
    getUsers(league.leagueId),
    ...weeks.map((w) => getTransactions(league.leagueId, w).catch(() => [] as SleeperTransaction[])),
  ]);

  return weeklyTxns
    .flat()
    .filter((t) => t.type === "trade" && t.status === "complete")
    .sort((a, b) => b.created - a.created)
    .slice(0, 5)
    .map((t) => {
      const received: Record<string, string[]> = {};
      for (const rosterId of t.roster_ids) received[teamNameFor(rosterId, rosters, users)] ??= [];

      for (const [playerId, rosterId] of Object.entries(t.adds ?? {})) {
        const teamName = teamNameFor(rosterId, rosters, users);
        const player = players[playerId];
        const label = player ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() : `Player ${playerId}`;
        (received[teamName] ??= []).push(label);
      }
      for (const pick of t.draft_picks) {
        const teamName = teamNameFor(pick.owner_id, rosters, users);
        (received[teamName] ??= []).push(`${pick.season} Round ${pick.round} pick`);
      }

      return { league: type, createdAt: t.created, received };
    });
}

/** Pairs a single completed week's matchups into head-to-head results, same shape as scripts/snapshot.ts's regular-season pairing. */
async function fetchLeagueScores(type: LeagueType, week: number): Promise<ScoreEvent[]> {
  if (week < 1) return [];
  const league = LEAGUES[type];
  const [matchups, rosters, users] = await Promise.all([
    getMatchups(league.leagueId, week),
    getRosters(league.leagueId),
    getUsers(league.leagueId),
  ]);

  const byMatchupId = new Map<number, typeof matchups>();
  for (const m of matchups) {
    if (m.matchup_id == null) continue;
    const group = byMatchupId.get(m.matchup_id) ?? [];
    group.push(m);
    byMatchupId.set(m.matchup_id, group);
  }

  const results: ScoreEvent[] = [];
  for (const pair of byMatchupId.values()) {
    if (pair.length !== 2) continue;
    const [a, b] = pair;
    results.push({
      league: type,
      week,
      teamA: teamNameFor(a.roster_id, rosters, users),
      pointsA: a.points,
      teamB: teamNameFor(b.roster_id, rosters, users),
      pointsB: b.points,
    });
  }
  return results;
}

/**
 * The one live-data read in this whole project that isn't baked into a
 * build-time snapshot — trades and scores happen unpredictably mid-season,
 * so this always hits Sleeper directly rather than reading data/*.json.
 * Callers are expected to cache the result (see lib/news/generate.ts).
 */
export async function getRecentActivity(): Promise<LeagueActivity> {
  const state = await getSleeperState();
  const currentWeek = state.week;
  const lastCompletedWeek = state.season_type === "regular" || state.season_type === "post" ? currentWeek - 1 : 0;

  const players = await getAllPlayers();

  const perLeague = await Promise.all(
    LEAGUE_TYPES.map(async (type) => ({
      trades: await fetchLeagueTrades(type, currentWeek, players),
      scores: await fetchLeagueScores(type, lastCompletedWeek),
    })),
  );

  return {
    trades: perLeague
      .flatMap((l) => l.trades)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6),
    scores: perLeague.flatMap((l) => l.scores),
  };
}
