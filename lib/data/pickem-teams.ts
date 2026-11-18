import { getLeagueSnapshot } from "@/lib/data/standings";

/**
 * Sleeper owner_id -> current redraft team name, from the newest snapshot
 * season. Managers rename teams; the manager table keeps the person's name,
 * this supplies whatever their team is called right now.
 */
export function redraftTeamNames(): Map<string, string> {
  const seasons = getLeagueSnapshot("redraft").seasons;
  const latest = seasons[seasons.length - 1];
  return new Map(
    latest.teams.flatMap((t) => (t.ownerId ? [[t.ownerId, t.teamName] as const] : [])),
  );
}
