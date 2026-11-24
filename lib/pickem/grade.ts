import "server-only";

import { and, eq, gte, lte } from "drizzle-orm";

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
 * What the daily schedule runs: every locked, still-open prop whose NFL week
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

/**
 * NFL stat corrections land Wednesday or Thursday, after Tuesday's grading.
 * A result graded from Sleeper's scores is re-checked every day until this
 * long after voting locked — through the Friday after the week (a Thursday
 * lock plus 9 days), then it's final.
 */
export const CORRECTION_WINDOW_MS = 9 * 24 * 60 * 60 * 1000;

const sameOutcome = (a: PropResult, b: PropResult) =>
  a.push === b.push && [...a.winningOptions].sort().join() === [...b.winningOptions].sort().join();

export type Correction = { prop: Prop; before: PropResult; after: PropResult };

/**
 * The daily stat-correction check: re-pulls Sleeper's scores for recently
 * graded props and re-grades any whose winner changed, moving the money
 * (applyResult replaces payouts, never adds). A score that moves without
 * changing who won is left alone. Results an admin set by hand (no scores, or
 * a note) are never second-guessed.
 */
export async function recheckRecentResults(now = new Date()) {
  const recent = await db
    .select()
    .from(prop)
    .where(and(eq(prop.status, "graded"), gte(prop.locksAt, new Date(now.getTime() - CORRECTION_WINDOW_MS))));

  const corrections: Correction[] = [];
  const errors: { prop: Prop; reason: string }[] = [];
  for (const p of recent) {
    const before = p.result;
    if (!before?.scores || before.note) continue;
    try {
      const after = decideResult(p, await getRedraftScores(p.week));
      if (sameOutcome(before, after)) continue;
      await applyResult(p, after);
      corrections.push({ prop: p, before, after });
    } catch (error) {
      console.error(`[pickem] re-checking prop ${p.id} failed:`, error);
      errors.push({ prop: p, reason: String(error) });
    }
  }
  return { corrections, errors };
}
