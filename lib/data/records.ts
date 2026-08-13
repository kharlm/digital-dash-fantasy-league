import { getAllGames } from "@/lib/data/head-to-head";
import { getCompletedSeasons, getTeamByRosterId } from "@/lib/data/standings";
import type { LeagueSnapshot, SnapshotSeason } from "@/lib/sleeper/snapshot-types";

export interface RecordEntry {
  ownerId: string;
  teamName: string;
  season: string;
  week: number;
  points: number;
  opponentTeamName: string;
  opponentPoints: number;
}

export interface WinStreakRecord {
  ownerId: string;
  teamName: string;
  length: number;
  startSeason: string;
  startWeek: number;
  endSeason: string;
  endWeek: number;
}

export interface RecordBook {
  highestScore: RecordEntry | null;
  biggestBlowout: RecordEntry | null;
  closestGame: RecordEntry | null;
  longestWinStreak: WinStreakRecord | null;
}

/** Every team's individual performance in every regular-season game —
 *  each matchup produces two of these (one per side), which is what lets
 *  "highest single score" and "longest win streak" share one flattening
 *  pass instead of each re-walking every season's weeklyMatchups. */
function getAllTeamWeeks(snapshot: LeagueSnapshot): RecordEntry[] {
  const entries: RecordEntry[] = [];

  for (const { season, matchup } of getAllGames(snapshot)) {
    const teamA = getTeamByRosterId(season, matchup.rosterIdA);
    const teamB = getTeamByRosterId(season, matchup.rosterIdB);
    if (!teamA?.ownerId || !teamB?.ownerId) continue;

    entries.push({
      ownerId: teamA.ownerId,
      teamName: teamA.teamName,
      season: season.season,
      week: matchup.week,
      points: matchup.pointsA,
      opponentTeamName: teamB.teamName,
      opponentPoints: matchup.pointsB,
    });
    entries.push({
      ownerId: teamB.ownerId,
      teamName: teamB.teamName,
      season: season.season,
      week: matchup.week,
      points: matchup.pointsB,
      opponentTeamName: teamA.teamName,
      opponentPoints: matchup.pointsA,
    });
  }

  return entries;
}

function computeLongestWinStreak(snapshot: LeagueSnapshot): WinStreakRecord | null {
  interface WeekResult {
    season: string;
    week: number;
    result: "W" | "L" | "T";
  }

  const byOwner = new Map<string, WeekResult[]>();
  const teamNames = new Map<string, string>();

  for (const season of getCompletedSeasons(snapshot)) {
    const weeksAsc = [...season.weeklyMatchups].sort((a, b) => a.week - b.week);

    for (const matchup of weeksAsc) {
      const teamA = getTeamByRosterId(season, matchup.rosterIdA);
      const teamB = getTeamByRosterId(season, matchup.rosterIdB);
      if (!teamA?.ownerId || !teamB?.ownerId) continue;
      teamNames.set(teamA.ownerId, teamA.teamName);
      teamNames.set(teamB.ownerId, teamB.teamName);

      const resultFor = (points: number, oppPoints: number): "W" | "L" | "T" =>
        points === oppPoints ? "T" : points > oppPoints ? "W" : "L";

      const push = (ownerId: string, result: "W" | "L" | "T") => {
        const list = byOwner.get(ownerId) ?? [];
        list.push({ season: season.season, week: matchup.week, result });
        byOwner.set(ownerId, list);
      };

      push(teamA.ownerId, resultFor(matchup.pointsA, matchup.pointsB));
      push(teamB.ownerId, resultFor(matchup.pointsB, matchup.pointsA));
    }
  }

  let best: Omit<WinStreakRecord, "teamName"> | null = null;

  for (const [ownerId, results] of byOwner.entries()) {
    let streak = 0;
    let streakStart: WeekResult | null = null;

    for (const r of results) {
      if (r.result !== "W") {
        streak = 0;
        streakStart = null;
        continue;
      }
      if (streak === 0) streakStart = r;
      streak += 1;
      if (!best || streak > best.length) {
        best = {
          ownerId,
          length: streak,
          startSeason: streakStart!.season,
          startWeek: streakStart!.week,
          endSeason: r.season,
          endWeek: r.week,
        };
      }
    }
  }

  if (!best) return null;
  return { ...best, teamName: teamNames.get(best.ownerId) ?? "Unknown" };
}

export function computeRecordBook(snapshot: LeagueSnapshot): RecordBook {
  const teamWeeks = getAllTeamWeeks(snapshot);
  const decided = teamWeeks.filter((g) => g.points !== g.opponentPoints);
  const wins = decided.filter((g) => g.points > g.opponentPoints);

  const highestScore = teamWeeks.reduce<RecordEntry | null>(
    (best, cur) => (!best || cur.points > best.points ? cur : best),
    null,
  );

  const biggestBlowout = wins.reduce<RecordEntry | null>((best, cur) => {
    const margin = cur.points - cur.opponentPoints;
    const bestMargin = best ? best.points - best.opponentPoints : -Infinity;
    return margin > bestMargin ? cur : best;
  }, null);

  // Ties (margin 0) are, definitionally, the closest possible game.
  const closestGame = teamWeeks.reduce<RecordEntry | null>((best, cur) => {
    const margin = Math.abs(cur.points - cur.opponentPoints);
    const bestMargin = best ? Math.abs(best.points - best.opponentPoints) : Infinity;
    return margin < bestMargin ? cur : best;
  }, null);

  return {
    highestScore,
    biggestBlowout,
    closestGame,
    longestWinStreak: computeLongestWinStreak(snapshot),
  };
}

export interface SeasonHighlight {
  ownerId: string;
  teamName: string;
  season: string;
  wins: number;
  losses: number;
  pointsFor: number;
  finish: number | null;
}

/**
 * Ranked by regular-season wins (points as tiebreak), not final `finish` —
 * finish already IS the trophy room (a team's playoff result), so ranking
 * Hall of Fame/Shame by finish would just re-list the same two champions.
 * This surfaces the best/worst statistical seasons regardless of how the
 * playoffs shook out.
 */
export function computeHallOfFameAndShame(snapshot: LeagueSnapshot): {
  fame: SeasonHighlight[];
  shame: SeasonHighlight[];
} {
  const entries: SeasonHighlight[] = [];

  for (const season of getCompletedSeasons(snapshot)) {
    for (const team of season.teams) {
      if (!team.ownerId) continue;
      entries.push({
        ownerId: team.ownerId,
        teamName: team.teamName,
        season: season.season,
        wins: team.wins,
        losses: team.losses,
        pointsFor: team.pointsFor,
        finish: team.finish,
      });
    }
  }

  const fame = [...entries].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor).slice(0, 3);
  const shame = [...entries].sort((a, b) => a.wins - b.wins || a.pointsFor - b.pointsFor).slice(0, 3);

  return { fame, shame };
}

export interface PowerRanking {
  ownerId: string;
  teamName: string;
  score: number;
  wins: number;
  losses: number;
  pointsFor: number;
}

/**
 * Deliberately simple, per the brief: wins carry most of the weight, points
 * break ties and give partial credit to a high-scoring team that's lost
 * some close ones. A starting formula, not a final one — refining it only
 * touches this function.
 */
export function computePowerRankings(season: SnapshotSeason): PowerRanking[] {
  return season.teams
    .filter((t): t is typeof t & { ownerId: string } => t.ownerId != null)
    .map((t) => ({
      ownerId: t.ownerId,
      teamName: t.teamName,
      score: t.wins * 2 - t.losses + t.pointsFor / 100,
      wins: t.wins,
      losses: t.losses,
      pointsFor: t.pointsFor,
    }))
    .sort((a, b) => b.score - a.score);
}
