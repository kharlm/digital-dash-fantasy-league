import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { ledgerEntry, prop, vote } from "@/lib/db/schema";
import { resetTestDb, seedManagers, type TestDb } from "@/test/db";

import { gradeDueProps, gradeFromScores, gradeManually } from "./grade";
import { getRedraftScores } from "./matchups";
import { buildProp } from "./props";
import { isNflWeekFinal } from "./schedule";

vi.mock("@/lib/db", async () => ({ db: await (await import("@/test/db")).createTestDb() }));
vi.mock("./schedule", () => ({ isNflWeekFinal: vi.fn() }));
vi.mock("./matchups", () => ({ getRedraftScores: vi.fn() }));

const testDb = db as unknown as TestDb;
const scores = (o: Record<number, number>) => new Map(Object.entries(o).map(([k, v]) => [Number(k), v]));
const NOBIE = { rosterId: 1, teamName: "Nobie" };
const BANDAID = { rosterId: 2, teamName: "Team Band-Aid" };
const YESTERDAY = new Date(Date.now() - 86_400_000);

async function spreadProp({ week = 9, line = 15.5, payoutCents = 100, locksAt = YESTERDAY } = {}) {
  const [p] = await db
    .insert(prop)
    .values({
      season: 2026,
      week,
      ...buildProp({ type: "spread", favorite: NOBIE, underdog: BANDAID, line }),
      payoutCents,
      locksAt,
    })
    .returning();
  return p;
}

async function votes(propId: number, picks: Record<string, string>) {
  await db.insert(vote).values(Object.entries(picks).map(([managerId, option]) => ({ propId, managerId, option })));
}

async function ledger() {
  const rows = await db.select().from(ledgerEntry);
  return rows.map((r) => `${r.managerId} ${r.amountCents} cap${r.capSeason}`).sort();
}

const fresh = async (id: number) => (await db.select().from(prop).where(eq(prop.id, id)))[0];

beforeEach(async () => {
  await resetTestDb(testDb);
  await seedManagers(testDb);
  vi.mocked(isNflWeekFinal).mockResolvedValue(true);
  vi.mocked(getRedraftScores).mockResolvedValue(scores({ 1: 132.36, 2: 115.56 })); // real week 9: margin 16.80
});

describe("grading a prop", () => {
  it("pays every winning voter toward NEXT season's cap; losers and non-voters get nothing", async () => {
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over", "s-matt": "over", "s-jesse": "under" }); // binh didn't vote

    const outcome = await gradeFromScores(p);

    expect(outcome).toMatchObject({ status: "graded", result: { winningOptions: ["over"], push: false } });
    expect(await ledger()).toEqual(["s-kharl 100 cap2027", "s-matt 100 cap2027"]);
    expect(await fresh(p.id)).toMatchObject({ status: "graded", result: { winningOptions: ["over"] } });
  });

  it("records why each payment was made", async () => {
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over" });
    await gradeFromScores(p);
    const [row] = await db.select().from(ledgerEntry);
    expect(row.reason).toBe("Week 9 Pick'em — Over: Nobie wins by more than 15.5");
  });

  it("pays the prop's own payout amount", async () => {
    const p = await spreadProp({ payoutCents: 250 });
    await votes(p.id, { "s-kharl": "over" });
    await gradeFromScores(p);
    expect(await ledger()).toEqual(["s-kharl 250 cap2027"]);
  });

  it("push: every voter wins, whichever side they took — but not non-voters", async () => {
    const p = await spreadProp({ line: 16.8 }); // lands exactly on the real margin
    await votes(p.id, { "s-kharl": "over", "s-jesse": "under" });

    expect(await gradeFromScores(p)).toMatchObject({ result: { push: true } });
    expect(await ledger()).toEqual(["s-jesse 100 cap2027", "s-kharl 100 cap2027"]);
  });

  it("waits while the NFL week isn't over", async () => {
    vi.mocked(isNflWeekFinal).mockResolvedValue(false);
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over" });

    expect(await gradeFromScores(p)).toEqual({ status: "not-final" });
    expect(await ledger()).toEqual([]);
    expect((await fresh(p.id)).status).toBe("open");
  });
});

describe("never double-pays", () => {
  it("grading an already-graded prop again changes nothing", async () => {
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over" });
    await gradeFromScores(p);

    expect(await gradeFromScores(await fresh(p.id))).toMatchObject({ status: "skipped" });
    expect(await ledger()).toEqual(["s-kharl 100 cap2027"]);
  });

  it("the daily job can run any number of times", async () => {
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over" });
    await gradeDueProps();
    await gradeDueProps();
    await gradeDueProps();
    expect(await ledger()).toEqual(["s-kharl 100 cap2027"]);
  });
});

describe("overrides", () => {
  it("setting the winner by hand moves the money instead of adding to it", async () => {
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over", "s-matt": "under" });
    await gradeFromScores(p);

    const outcome = await gradeManually(await fresh(p.id), ["under"], "stat correction");

    expect(outcome).toMatchObject({ result: { winningOptions: ["under"], note: "stat correction" } });
    expect(await ledger()).toEqual(["s-matt 100 cap2027"]);
  });

  it("re-grading with corrected Sleeper scores replaces the payouts", async () => {
    const p = await spreadProp();
    await votes(p.id, { "s-kharl": "over", "s-matt": "under" });
    await gradeFromScores(p);

    vi.mocked(getRedraftScores).mockResolvedValue(scores({ 1: 125, 2: 115.56 })); // corrected: margin 9.44
    await gradeFromScores(await fresh(p.id), { force: true });

    expect(await ledger()).toEqual(["s-matt 100 cap2027"]);
  });

  it("rejects winners that aren't options of the prop", async () => {
    const p = await spreadProp();
    expect(await gradeManually(p, ["sideways"])).toMatchObject({ status: "skipped" });
    expect(await gradeManually(p, [])).toMatchObject({ status: "skipped" });
  });
});

describe("the daily job (gradeDueProps)", () => {
  it("skips props that haven't locked yet", async () => {
    const p = await spreadProp({ locksAt: new Date(Date.now() + 86_400_000) });
    await votes(p.id, { "s-kharl": "over" });
    expect(await gradeDueProps()).toEqual([]);
    expect((await fresh(p.id)).status).toBe("open");
  });

  it("one prop failing doesn't stop the others", async () => {
    const broken = await spreadProp({ week: 8 });
    const good = await spreadProp({ week: 9 });
    await votes(good.id, { "s-kharl": "over" });
    vi.mocked(getRedraftScores).mockImplementation(async (week) => {
      if (week === 8) throw new Error("Sleeper down");
      return scores({ 1: 132.36, 2: 115.56 });
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const outcomes = await gradeDueProps();

    expect(outcomes.find((o) => o.propId === broken.id)).toMatchObject({ status: "error" });
    expect(outcomes.find((o) => o.propId === good.id)).toMatchObject({ status: "graded" });
    expect(await ledger()).toEqual(["s-kharl 100 cap2027"]);
  });
});

it("refuses a void prop", async () => {
  const p = await spreadProp();
  await db.update(prop).set({ status: "void" }).where(eq(prop.id, p.id));
  expect(await gradeFromScores(await fresh(p.id))).toMatchObject({ status: "skipped" });
  expect(await gradeManually(await fresh(p.id), ["over"])).toMatchObject({ status: "skipped" });
});
