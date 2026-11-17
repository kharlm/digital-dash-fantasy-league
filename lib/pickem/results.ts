import type { PropParams } from "@/lib/db/schema";

/** Summed in hundredths, the same way grading does, so a shown total matches the result. */
export function leagueTotal(scores: Record<number, number>): number {
  return Object.values(scores).reduce((sum, pts) => sum + Math.round(pts * 100), 0) / 100;
}

/**
 * Final scores in the order the prop reads — favorite first for a spread,
 * team A first straight up. (The stored scores object can't keep that order:
 * JS sorts integer keys numerically, i.e. by Sleeper roster id.)
 */
export function scoreOrder(params: PropParams, scores: Record<number, number>): [number, number][] {
  const order =
    "favoriteRosterId" in params
      ? [params.favoriteRosterId, params.underdogRosterId]
      : "rosterIdA" in params
        ? [params.rosterIdA, params.rosterIdB]
        : Object.keys(scores).map(Number);
  return order.filter((id) => id in scores).map((id) => [id, scores[id]]);
}
