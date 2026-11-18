import type { PropParams, PropResult, prop } from "@/lib/db/schema";

import { teamKey } from "./props";

/**
 * Pure grading: a prop plus final scores in, the winning option(s) out. No
 * I/O, so every rule is easy to read in one place:
 *
 *  - spread: favorite's margin vs. the line. Over / under; exactly on the
 *    line is a push.
 *  - team_total: that team's points vs. the line, same three outcomes.
 *  - league_total: every team's points added up vs. the line, same three.
 *  - straight_up: higher score wins; a tie pays both sides.
 *  - top_scorer: highest score in the league; ties pay every tied team.
 *
 * A push (league rule): every voter wins the regular payout, whichever side
 * they took. `winningOptions` is empty then; the payout step reads `push`.
 */

type Prop = Pick<typeof prop.$inferSelect, "type" | "params" | "options">;

/** Sleeper scores have 2 decimals; compare in hundredths so float noise can't fake a push or a tie. */
const hundredths = (n: number) => Math.round(n * 100);

export function decideResult(p: Prop, scores: Map<number, number>): PropResult {
  const pts = (rosterId: number) => {
    const s = scores.get(rosterId);
    if (s === undefined) throw new Error(`no final score for roster ${rosterId}`);
    return s;
  };
  const scoresUsed = (ids: number[]) => Object.fromEntries(ids.map((id) => [id, pts(id)]));
  const overUnder = (value: number, line: number) => {
    const v = hundredths(value);
    const l = hundredths(line);
    return v === l ? null : v > l ? "over" : "under";
  };

  switch (p.type) {
    case "spread": {
      const { favoriteRosterId: f, underdogRosterId: u, line } = p.params as Extract<
        PropParams,
        { favoriteRosterId: number }
      >;
      const side = overUnder(pts(f) - pts(u), line);
      return { winningOptions: side ? [side] : [], push: side === null, scores: scoresUsed([f, u]) };
    }
    case "team_total": {
      const { rosterId, line } = p.params as Extract<PropParams, { rosterId: number }>;
      const side = overUnder(pts(rosterId), line);
      return { winningOptions: side ? [side] : [], push: side === null, scores: scoresUsed([rosterId]) };
    }
    case "league_total": {
      // The teams are fixed when the prop is set, so a missing score throws
      // rather than quietly grading a smaller total.
      const { rosterIds, line } = p.params as Extract<PropParams, { rosterIds: number[] }>;
      const total = rosterIds.reduce((sum, id) => sum + hundredths(pts(id)), 0) / 100;
      const side = overUnder(total, line);
      return { winningOptions: side ? [side] : [], push: side === null, scores: scoresUsed(rosterIds) };
    }
    case "straight_up": {
      const { rosterIdA: a, rosterIdB: b } = p.params as Extract<PropParams, { rosterIdA: number }>;
      const diff = hundredths(pts(a)) - hundredths(pts(b));
      const winners = diff === 0 ? [a, b] : diff > 0 ? [a] : [b];
      return { winningOptions: winners.map(teamKey), push: false, scores: scoresUsed([a, b]) };
    }
    case "top_scorer": {
      // Options are r<rosterId> for every team at the time the prop was set.
      const ids = p.options.map((o) => Number(o.key.slice(1)));
      const best = Math.max(...ids.map((id) => hundredths(pts(id))));
      const winners = ids.filter((id) => hundredths(pts(id)) === best);
      return { winningOptions: winners.map(teamKey), push: false, scores: scoresUsed(ids) };
    }
  }
}
