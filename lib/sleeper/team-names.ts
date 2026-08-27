import type { SleeperRoster, SleeperUser } from "./types";

/** Shared by anything resolving a live roster_id to a display name outside the build-time snapshot (lib/news, live scores). */
export function teamNameFor(rosterId: number, rosters: SleeperRoster[], users: SleeperUser[]): string {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  const user = roster?.owner_id ? users.find((u) => u.user_id === roster.owner_id) : undefined;
  return user?.metadata?.team_name || user?.display_name || `Roster ${rosterId}`;
}
