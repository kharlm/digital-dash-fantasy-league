import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { ledgerEntry, prop } from "@/lib/db/schema";
import { resetTestDb, seedManagers, type TestDb } from "@/test/db";

import { BASE_CAP_CENTS, getCapTable, getHistory } from "./ledger";
import { buildProp } from "./props";

vi.mock("@/lib/db", async () => ({ db: await (await import("@/test/db")).createTestDb() }));

const testDb = db as unknown as TestDb;

async function pay(managerId: string, amountCents: number, opts: { capSeason?: number; propId?: number; reason?: string } = {}) {
  await db.insert(ledgerEntry).values({
    managerId,
    amountCents,
    capSeason: opts.capSeason ?? 2027,
    propId: opts.propId,
    reason: opts.reason ?? "test",
  });
}

beforeEach(async () => {
  await resetTestDb(testDb);
  await seedManagers(testDb); // Kharl, Matt, Jesse, Binh
});

describe("getCapTable", () => {
  it("everyone starts at the $200 base, including managers with no winnings", async () => {
    const table = await getCapTable(2027);
    expect(table).toHaveLength(4);
    expect(table.every((r) => r.capCents === BASE_CAP_CENTS && r.winningsCents === 0)).toBe(true);
  });

  it("adds Pick'em winnings and carry-overs on top of the base, highest first", async () => {
    await pay("s-matt", 100);
    await pay("s-matt", 100);
    await pay("s-kharl", 700, { reason: "Weeks 1–10 carry-over" });

    const table = await getCapTable(2027);

    expect(table.map((r) => [r.name, r.capCents])).toEqual([
      ["Kharl", 207_00],
      ["Matt", 202_00],
      ["Binh", 200_00],
      ["Jesse", 200_00],
    ]);
  });

  it("ties share a rank", async () => {
    await pay("s-kharl", 300);
    await pay("s-matt", 300);
    await pay("s-jesse", 100);
    expect((await getCapTable(2027)).map((r) => [r.name, r.rank])).toEqual([
      ["Kharl", 1],
      ["Matt", 1],
      ["Jesse", 3],
      ["Binh", 4],
    ]);
  });

  it("only counts money for the requested auction", async () => {
    await pay("s-kharl", 500, { capSeason: 2026 });
    expect((await getCapTable(2027)).find((r) => r.name === "Kharl")?.capCents).toBe(BASE_CAP_CENTS);
  });
});

describe("getHistory", () => {
  it("lists graded weeks newest first with who got paid, and carry-overs separately", async () => {
    const teams = { favorite: { rosterId: 1, teamName: "Nobie" }, underdog: { rosterId: 2, teamName: "Band-Aid" } };
    const [w9] = await db
      .insert(prop)
      .values({
        season: 2026,
        week: 9,
        ...buildProp({ type: "spread", ...teams, line: 15.5 }),
        payoutCents: 100,
        locksAt: new Date(),
        status: "graded",
        result: { winningOptions: ["over"], push: false },
      })
      .returning();
    const [w10] = await db
      .insert(prop)
      .values({
        season: 2026,
        week: 10,
        ...buildProp({ type: "spread", ...teams, line: 3.5 }),
        payoutCents: 100,
        locksAt: new Date(),
        status: "graded",
        result: { winningOptions: [], push: true, note: "wild" },
      })
      .returning();
    await db.insert(prop).values({
      season: 2026,
      week: 11,
      ...buildProp({ type: "spread", ...teams, line: 1 }),
      payoutCents: 100,
      locksAt: new Date(),
    }); // still open — not history yet
    await pay("s-matt", 100, { propId: w9.id });
    await pay("s-kharl", 100, { propId: w9.id });
    await pay("s-jesse", 100, { propId: w10.id });
    await pay("s-binh", 600, { reason: "Weeks 1–8 (WhatsApp era)" });

    const { weeks, carryOvers } = await getHistory(2027);

    expect(weeks.map((w) => w.week)).toEqual([10, 9]);
    expect(weeks[1]).toMatchObject({ result: "Over: Nobie wins by more than 15.5", paid: ["Kharl", "Matt"] });
    expect(weeks[0]).toMatchObject({ result: expect.stringContaining("Push"), note: "wild", paid: ["Jesse"] });
    expect(carryOvers).toEqual([{ name: "Binh", amountCents: 600, reason: "Weeks 1–8 (WhatsApp era)" }]);
  });
});
