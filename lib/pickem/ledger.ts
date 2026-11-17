import "server-only";

import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { ledgerEntry, manager, prop } from "@/lib/db/schema";

/** Everyone starts each auction with $200; Pick'em winnings go on top. */
export const BASE_CAP_CENTS = 200_00;

export type CapRow = {
  managerId: string;
  name: string;
  rank: number; // ties share a rank (1, 2, 2, 4)
  winningsCents: number;
  capCents: number;
};

/**
 * Every manager's auction cap for `capSeason` — including managers who
 * haven't won anything (they're at the base). Highest first; ties broken
 * alphabetically for display but share a rank.
 */
export async function getCapTable(capSeason: number): Promise<CapRow[]> {
  const rows = await db
    .select({
      managerId: manager.sleeperUserId,
      name: manager.name,
      winningsCents: sql<number>`coalesce(sum(${ledgerEntry.amountCents}), 0)::int`,
    })
    .from(manager)
    .leftJoin(
      ledgerEntry,
      and(eq(ledgerEntry.managerId, manager.sleeperUserId), eq(ledgerEntry.capSeason, capSeason)),
    )
    .groupBy(manager.sleeperUserId, manager.name);

  const sorted = rows
    .map((r) => ({ ...r, capCents: BASE_CAP_CENTS + r.winningsCents }))
    .sort((a, b) => b.winningsCents - a.winningsCents || a.name.localeCompare(b.name));

  return sorted.map((r) => ({
    ...r,
    rank: 1 + sorted.filter((other) => other.winningsCents > r.winningsCents).length,
  }));
}

export type HistoryWeek = {
  propId: number;
  week: number;
  question: string;
  result: string; // "Over: …", "Push — every voter paid"
  note?: string;
  payoutCents: number;
  paid: string[]; // manager names
};

export type CarryOver = { name: string; amountCents: number; reason: string };

/**
 * Week-by-week record behind the caps: every graded prop of the season that
 * feeds `capSeason`, newest first, with who got paid — plus any carry-over
 * entries (year-to-date totals entered from before the site tracked Pick'em).
 */
export async function getHistory(capSeason: number): Promise<{ weeks: HistoryWeek[]; carryOvers: CarryOver[] }> {
  const [graded, payouts, carryOvers] = await Promise.all([
    db
      .select()
      .from(prop)
      .where(and(eq(prop.season, capSeason - 1), eq(prop.status, "graded")))
      .orderBy(desc(prop.week)),
    db
      .select({ propId: ledgerEntry.propId, name: manager.name })
      .from(ledgerEntry)
      .innerJoin(manager, eq(ledgerEntry.managerId, manager.sleeperUserId))
      .where(and(eq(ledgerEntry.capSeason, capSeason), isNotNull(ledgerEntry.propId)))
      .orderBy(asc(manager.name)),
    db
      .select({ name: manager.name, amountCents: ledgerEntry.amountCents, reason: ledgerEntry.reason })
      .from(ledgerEntry)
      .innerJoin(manager, eq(ledgerEntry.managerId, manager.sleeperUserId))
      .where(and(eq(ledgerEntry.capSeason, capSeason), isNull(ledgerEntry.propId)))
      .orderBy(asc(manager.name)),
  ]);

  const weeks = graded.map((p) => {
    const label = (key: string) => p.options.find((o) => o.key === key)?.label ?? key;
    return {
      propId: p.id,
      week: p.week,
      question: p.question,
      result: p.result?.push
        ? "Push — landed exactly on the line, every voter paid"
        : (p.result?.winningOptions.map(label).join(" & ") ?? ""),
      ...(p.result?.note ? { note: p.result.note } : {}),
      payoutCents: p.payoutCents,
      paid: payouts.filter((x) => x.propId === p.id).map((x) => x.name),
    };
  });

  return { weeks, carryOvers };
}
