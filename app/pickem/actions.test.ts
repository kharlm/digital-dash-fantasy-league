import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { manager, prop, user, vote } from "@/lib/db/schema";
import { requireManager, requireViewer, type Viewer } from "@/lib/dal";
import { buildProp } from "@/lib/pickem/props";
import { MANAGERS, resetTestDb, seedManagers, type TestDb } from "@/test/db";

import { castVote, claimTeam, updatePhone } from "./actions";

vi.mock("@/lib/db", async () => ({ db: await (await import("@/test/db")).createTestDb() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
// redirect() ends a server action by throwing; mimic that so tests can see where it went.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));
vi.mock("@/lib/dal", () => ({ requireViewer: vi.fn(), requireManager: vi.fn() }));

const testDb = db as unknown as TestDb;

/** Signs a test login in (creating its auth user row), optionally already linked to a team. */
async function signIn(userId: string, team?: keyof typeof MANAGERS) {
  await db.insert(user).values({ id: userId, name: userId, email: `${userId}@example.com` }).onConflictDoNothing();
  const linked = team ? (await db.select().from(manager).where(eq(manager.sleeperUserId, MANAGERS[team].sleeperUserId)))[0] : null;
  const viewer: Viewer = { userId, email: `${userId}@example.com`, name: userId, manager: linked ?? null };
  vi.mocked(requireViewer).mockResolvedValue(viewer);
  if (linked) vi.mocked(requireManager).mockResolvedValue({ ...viewer, manager: linked });
}

beforeEach(async () => {
  await resetTestDb(testDb);
  await seedManagers(testDb);
});

describe("claiming a team", () => {
  it("links the login to the team", async () => {
    await signIn("u1");
    await expect(claimTeam(MANAGERS.jesse.sleeperUserId)).rejects.toThrow("REDIRECT /pickem");
    const [jesse] = await db.select().from(manager).where(eq(manager.sleeperUserId, "s-jesse"));
    expect(jesse.userId).toBe("u1");
  });

  it("a team can only be claimed once", async () => {
    await signIn("u1");
    await expect(claimTeam("s-jesse")).rejects.toThrow("REDIRECT");
    await signIn("u2");
    expect(await claimTeam("s-jesse")).toEqual({ error: "That team was just claimed by someone else." });
  });

  it("two people tapping the same team at the same moment: exactly one gets it", async () => {
    await db.insert(user).values([
      { id: "a", name: "a", email: "a@example.com" },
      { id: "b", name: "b", email: "b@example.com" },
    ]);
    vi.mocked(requireViewer)
      .mockResolvedValueOnce({ userId: "a", email: "a@example.com", name: "a", manager: null })
      .mockResolvedValueOnce({ userId: "b", email: "b@example.com", name: "b", manager: null });

    const results = await Promise.allSettled([claimTeam("s-binh"), claimTeam("s-binh")]);

    const redirected = results.filter((r) => r.status === "rejected");
    const refused = results.filter((r) => r.status === "fulfilled");
    expect(redirected).toHaveLength(1);
    expect(refused).toHaveLength(1);
  });

  it("someone who already has a team is sent back instead of claiming a second", async () => {
    await db.insert(user).values({ id: "u1", name: "u1", email: "u1@example.com" });
    await db.update(manager).set({ userId: "u1" }).where(eq(manager.sleeperUserId, "s-kharl"));
    await signIn("u1", "kharl");
    await expect(claimTeam("s-jesse")).rejects.toThrow("REDIRECT /pickem");
    const [jesse] = await db.select().from(manager).where(eq(manager.sleeperUserId, "s-jesse"));
    expect(jesse.userId).toBeNull();
  });
});

describe("voting", () => {
  async function openProp(locksAt = new Date(Date.now() + 86_400_000)) {
    const [p] = await db
      .insert(prop)
      .values({
        season: 2026,
        week: 11,
        ...buildProp({
          type: "spread",
          favorite: { rosterId: 1, teamName: "A" },
          underdog: { rosterId: 2, teamName: "B" },
          line: 10,
        }),
        payoutCents: 100,
        locksAt,
      })
      .returning();
    return p;
  }

  const myVotes = () => db.select().from(vote).where(eq(vote.managerId, "s-kharl"));

  beforeEach(async () => {
    await db.insert(user).values({ id: "u-kharl", name: "k", email: "k@example.com" });
    await db.update(manager).set({ userId: "u-kharl" }).where(eq(manager.sleeperUserId, "s-kharl"));
    await signIn("u-kharl", "kharl");
  });

  it("records a pick, and changing it replaces it (one vote per manager)", async () => {
    const p = await openProp();
    expect(await castVote(p.id, "over")).toEqual({});
    expect(await castVote(p.id, "under")).toEqual({});
    const rows = await myVotes();
    expect(rows).toHaveLength(1);
    expect(rows[0].option).toBe("under");
  });

  it("is refused after the lock, even from a stale page", async () => {
    const p = await openProp(new Date(Date.now() - 1000));
    expect(await castVote(p.id, "over")).toEqual({ error: "Voting is locked." });
    expect(await myVotes()).toEqual([]);
  });

  it("is refused once the prop is graded", async () => {
    const p = await openProp();
    await db.update(prop).set({ status: "graded" }).where(eq(prop.id, p.id));
    expect(await castVote(p.id, "over")).toEqual({ error: "Voting is locked." });
  });

  it("rejects options that aren't on the prop", async () => {
    const p = await openProp();
    expect(await castVote(p.id, "sideways")).toEqual({ error: "That isn't one of the options." });
  });

  it("rejects a prop that doesn't exist", async () => {
    expect(await castVote(9999, "over")).toEqual({ error: "That prop no longer exists." });
  });
});

describe("changing your phone number", () => {
  it("saves it normalized, only on your own team", async () => {
    await db.insert(user).values({ id: "u-matt", name: "m", email: "m@example.com" });
    await db.update(manager).set({ userId: "u-matt" }).where(eq(manager.sleeperUserId, "s-matt"));
    await signIn("u-matt", "matt");

    const form = new FormData();
    form.set("phone", "(407) 555-0134");
    expect(await updatePhone({}, form)).toEqual({ saved: true });

    const rows = await db.select({ id: manager.sleeperUserId, phone: manager.phone }).from(manager);
    expect(rows.find((r) => r.id === "s-matt")?.phone).toBe("+14075550134");
    expect(rows.filter((r) => r.phone !== null)).toHaveLength(1);
  });

  it("rejects numbers that aren't valid US numbers", async () => {
    await db.insert(user).values({ id: "u-matt", name: "m", email: "m@example.com" });
    await db.update(manager).set({ userId: "u-matt" }).where(eq(manager.sleeperUserId, "s-matt"));
    await signIn("u-matt", "matt");
    const form = new FormData();
    form.set("phone", "12345");
    expect(await updatePhone({}, form)).toEqual({ error: "Enter a 10-digit US phone number." });
  });
});
