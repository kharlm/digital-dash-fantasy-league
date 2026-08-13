import { getCompletedSeasons, getTeamByRosterId } from "@/lib/data/standings";
import type { LeagueSnapshot, SnapshotSeason, WeeklyMatchup } from "@/lib/sleeper/snapshot-types";

export interface HeadToHeadManager {
  ownerId: string;
  teamName: string;
}

export interface HeadToHeadCell {
  wins: number;
  losses: number;
  ties: number;
}

export interface HeadToHeadGrid {
  managers: HeadToHeadManager[];
  /** Keyed by `${rowOwnerId}|${colOwnerId}`. Row's record against column. */
  cells: Map<string, HeadToHeadCell>;
}

function cellKey(a: string, b: string): string {
  return `${a}|${b}`;
}

/** A stable, order-independent id for a pair — used for both the rivalry
 *  page's URL slug and for grouping a pair's games regardless of which
 *  side of the matchup happened to be "A" that week. */
export function pairSlug(ownerIdA: string, ownerIdB: string): string {
  return [ownerIdA, ownerIdB].sort().join("_");
}

export function computeHeadToHeadGrid(snapshot: LeagueSnapshot): HeadToHeadGrid {
  const completed = getCompletedSeasons(snapshot);
  const cells = new Map<string, HeadToHeadCell>();
  const managerNames = new Map<string, string>(); // ownerId -> most recent team name

  const bump = (ownerId: string, oppOwnerId: string, result: "win" | "loss" | "tie") => {
    const key = cellKey(ownerId, oppOwnerId);
    const cell = cells.get(key) ?? { wins: 0, losses: 0, ties: 0 };
    if (result === "win") cell.wins += 1;
    else if (result === "loss") cell.losses += 1;
    else cell.ties += 1;
    cells.set(key, cell);
  };

  for (const season of completed) {
    for (const team of season.teams) {
      if (team.ownerId) managerNames.set(team.ownerId, team.teamName);
    }

    for (const matchup of season.weeklyMatchups) {
      const teamA = getTeamByRosterId(season, matchup.rosterIdA);
      const teamB = getTeamByRosterId(season, matchup.rosterIdB);
      if (!teamA?.ownerId || !teamB?.ownerId) continue;

      if (matchup.pointsA === matchup.pointsB) {
        bump(teamA.ownerId, teamB.ownerId, "tie");
        bump(teamB.ownerId, teamA.ownerId, "tie");
      } else if (matchup.pointsA > matchup.pointsB) {
        bump(teamA.ownerId, teamB.ownerId, "win");
        bump(teamB.ownerId, teamA.ownerId, "loss");
      } else {
        bump(teamB.ownerId, teamA.ownerId, "win");
        bump(teamA.ownerId, teamB.ownerId, "loss");
      }
    }
  }

  const managers = Array.from(managerNames.entries())
    .map(([ownerId, teamName]) => ({ ownerId, teamName }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  return { managers, cells };
}

export function getHeadToHeadCell(grid: HeadToHeadGrid, rowOwnerId: string, colOwnerId: string): HeadToHeadCell {
  return grid.cells.get(cellKey(rowOwnerId, colOwnerId)) ?? { wins: 0, losses: 0, ties: 0 };
}

export interface RivalryGame {
  season: string;
  week: number;
  ownerIdA: string;
  pointsA: number;
  ownerIdB: string;
  pointsB: number;
}

/** Every regular-season game between two specific managers, chronological. */
export function getRivalryGames(snapshot: LeagueSnapshot, ownerIdA: string, ownerIdB: string): RivalryGame[] {
  const games: RivalryGame[] = [];

  for (const season of getCompletedSeasons(snapshot)) {
    for (const matchup of season.weeklyMatchups) {
      const teamA = getTeamByRosterId(season, matchup.rosterIdA);
      const teamB = getTeamByRosterId(season, matchup.rosterIdB);
      const pair = [teamA?.ownerId, teamB?.ownerId];
      if (!pair.includes(ownerIdA) || !pair.includes(ownerIdB)) continue;

      // Normalize so ownerIdA's side is always reported first, regardless of
      // which roster happened to be "A" in that particular week's data.
      const aIsFirst = teamA?.ownerId === ownerIdA;
      games.push({
        season: season.season,
        week: matchup.week,
        ownerIdA,
        pointsA: aIsFirst ? matchup.pointsA : matchup.pointsB,
        ownerIdB,
        pointsB: aIsFirst ? matchup.pointsB : matchup.pointsA,
      });
    }
  }

  return games.sort((a, b) => a.season.localeCompare(b.season) || a.week - b.week);
}

/** All pairs of managers who have actually played each other — the full
 *  space of valid rivalry-page URLs, for generateStaticParams. */
export function getAllRivalryPairs(snapshot: LeagueSnapshot): Array<{ ownerIdA: string; ownerIdB: string }> {
  const grid = computeHeadToHeadGrid(snapshot);
  const seen = new Set<string>();
  const pairs: Array<{ ownerIdA: string; ownerIdB: string }> = [];

  for (const key of grid.cells.keys()) {
    const [a, b] = key.split("|");
    const slug = pairSlug(a, b);
    if (seen.has(slug)) continue;
    seen.add(slug);
    pairs.push({ ownerIdA: a, ownerIdB: b });
  }

  return pairs;
}

interface GameContext {
  season: SnapshotSeason;
  matchup: WeeklyMatchup;
}

/** Flattens every completed season's weeklyMatchups into one list, used by
 *  the record book so it doesn't need three separate season-walking loops. */
export function getAllGames(snapshot: LeagueSnapshot): GameContext[] {
  const games: GameContext[] = [];
  for (const season of getCompletedSeasons(snapshot)) {
    for (const matchup of season.weeklyMatchups) {
      games.push({ season, matchup });
    }
  }
  return games;
}
