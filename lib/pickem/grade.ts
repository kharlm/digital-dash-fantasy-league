import "server-only";

import { and, eq, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { ledgerEntry, prop, vote, type PropResult } from "@/lib/db/schema";

import { decideResult } from "./decide";
import { getRedraftScores } from "./matchups";
import { isNflWeekFinal } from "./schedule";

type Prop = typeof prop.$inferSelect;

/**
 * Writes a result: marks the prop graded and pays every winning voter
 * `payoutCents` toward next season's auction cap. On a push every voter
 * wins. Votes on losing options, and managers who didn't vote, get nothing.
 *
 * One transaction, and it replaces any earlier payouts for this prop — so
 * re-grading (an override after a stat correction) corrects the ledger
 * rather than double-paying.
 */
async function applyResult(p: Prop, result: PropResult) {
  await db.transaction(async (tx) => {
    const votes = await tx.select().from(vote).where(eq(vote.propId, p.id));
    const winners = votes.filter((v) => result.push || result.winningOptions.includes(v.option));
    const label = (key: string) => p.options.find((o) => o.key === key)?.label ?? key;

    await tx.delete(ledgerEntry).where(eq(ledgerEntry.propId, p.id));
    if (winners.length > 0) {
      await tx.insert(ledgerEntry).values(
        winners.map((v) => ({
          managerId: v.managerId,
          capSeason: p.season + 1,
          amountCents: p.payoutCents,
          reason: `Week ${p.week} Pick'em — ${result.push ? "push" : label(v.option)}`,
          propId: p.id,
        })),
      );
    }
    await tx.update(prop).set({ status: "graded", result, gradedAt: new Date() }).where(eq(prop.id, p.id));
  });
}

export type GradeOutcome =
  | { status: "graded"; result: PropResult }
  | { status: "not-final" } // the NFL week isn't over yet
  | { status: "skipped"; reason: string };

/**
 * Grades one prop from Sleeper's final scores, once every NFL game that week
 * is over. `force` re-grades a prop that's already graded (an override with
 * fresh scores after a stat correction).
 */
export async function gradeFromScores(p: Prop, { force = false } = {}): Promise<GradeOutcome> {
  if (p.status === "void") return { status: "skipped", reason: "prop is void" };
  if (p.status === "graded" && !force) return { status: "skipped", reason: "already graded" };
  if (!(await isNflWeekFinal(p.season, p.week))) return { status: "not-final" };

  const result = decideResult(p, await getRedraftScores(p.week));
  await applyResult(p, result);
  return { status: "graded", result };
}

/** An admin sets the winner(s) directly — the override for when Sleeper's data is wrong. */
export async function gradeManually(p: Prop, winningOptions: string[], note?: string): Promise<GradeOutcome> {
  if (p.status === "void") return { status: "skipped", reason: "prop is void" };
  const valid = new Set(p.options.map((o) => o.key));
  if (winningOptions.length === 0 || winningOptions.some((k) => !valid.has(k))) {
    return { status: "skipped", reason: "pick at least one of the prop's options" };
  }
  const result: PropResult = { winningOptions, push: false, ...(note ? { note } : {}) };
  await applyResult(p, result);
  return { status: "graded", result };
}

/**
 * What the Tuesday cron runs: every locked, still-open prop whose NFL week
 * is over gets graded. Safe to
 * run any number of times.
 */
export async function gradeDueProps() {
  const due = await db
    .select()
    .from(prop)
    .where(and(eq(prop.status, "open"), lte(prop.locksAt, new Date())));

  const outcomes = [];
  for (const p of due) {
    try {
      outcomes.push({ propId: p.id, week: p.week, ...(await gradeFromScores(p)) });
    } catch (error) {
      console.error(`[pickem] grading prop ${p.id} failed:`, error);
      outcomes.push({ propId: p.id, week: p.week, status: "error" as const, reason: String(error) });
    }
  }
  return outcomes;
}
