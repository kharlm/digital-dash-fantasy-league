import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMatchups } from "@/lib/sleeper/client";

import { getProjectedTotals, TIMEOUT_MS } from "./projections";

vi.mock("@/lib/sleeper/client", () => ({ getMatchups: vi.fn() }));

// Two rosters, two starters each; this league scores PPR-style.
const MATCHUPS = [
  { roster_id: 1, starters: ["qb1", "wr1"] },
  { roster_id: 2, starters: ["qb2", "0"] }, // "0" = empty starting slot
];
const SCORING = { pass_yd: 0.04, pass_td: 4, rec: 1, rec_yd: 0.1 };
const PROJECTIONS = [
  { player_id: "qb1", stats: { pass_yd: 250, pass_td: 2 } }, // 18
  { player_id: "wr1", stats: { rec: 6, rec_yd: 80, adp_ppr: 12 } }, // 14 (adp isn't scored)
  { player_id: "qb2", stats: { pass_yd: 200, pass_td: 1 } }, // 12
];

/** Answers like Sleeper: the league endpoint, or the projections endpoint. */
function sleeper(overrides: { league?: Response; projections?: Response } = {}) {
  return vi.fn(async (url: string) =>
    url.includes("/projections/")
      ? (overrides.projections ?? Response.json(PROJECTIONS))
      : (overrides.league ?? Response.json({ scoring_settings: SCORING })),
  );
}

beforeEach(() => {
  vi.mocked(getMatchups).mockResolvedValue(MATCHUPS as never);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("getProjectedTotals", () => {
  it("scores each starter's projected stats with the league's settings", async () => {
    vi.stubGlobal("fetch", sleeper());
    const result = await getProjectedTotals(2026, 11);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.totals.get(1)).toBeCloseTo(32);
      expect(result.totals.get(2)).toBeCloseTo(12);
    }
  });

  describe("Sleeper changed (tell Kharl)", () => {
    it.each([400, 401, 403, 404, 410])("HTTP %i", async (status) => {
      vi.stubGlobal("fetch", sleeper({ projections: new Response("", { status }) }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ ok: false, kind: "changed" });
    });

    it("projections no longer a list", async () => {
      vi.stubGlobal("fetch", sleeper({ projections: Response.json({ players: [] }) }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ kind: "changed" });
    });

    it("rows without stats", async () => {
      vi.stubGlobal("fetch", sleeper({ projections: Response.json([{ player_id: "qb1" }]) }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ kind: "changed" });
    });

    it("not JSON", async () => {
      vi.stubGlobal("fetch", sleeper({ projections: new Response("<html>moved</html>") }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ kind: "changed" });
    });

    it("every team projects to 0 (stat names changed)", async () => {
      vi.stubGlobal("fetch", sleeper({ projections: Response.json([{ player_id: "qb1", stats: { new_name: 300 } }]) }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ kind: "changed" });
    });

    it("league scoring settings missing", async () => {
      vi.stubGlobal("fetch", sleeper({ league: Response.json({ name: "DDFL" }) }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ kind: "changed" });
    });

    it("comes with a plain-English summary for the commissioner", async () => {
      vi.stubGlobal("fetch", sleeper({ projections: new Response("", { status: 404 }) }));
      const result = await getProjectedTotals(2026, 11);
      expect(result).toMatchObject({ summary: expect.stringContaining("no longer exists") });
    });
  });

  describe("Sleeper having a moment (no alarm)", () => {
    it.each([500, 503, 429])("HTTP %i", async (status) => {
      vi.stubGlobal("fetch", sleeper({ projections: new Response("", { status }) }));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ ok: false, kind: "unavailable" });
    });

    it("network failure", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
      expect(await getProjectedTotals(2026, 11)).toMatchObject({ kind: "unavailable" });
    });

    it("gives up after the timeout instead of hanging the page", async () => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never answers
      const pending = getProjectedTotals(2026, 11);
      await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
      expect(await pending).toMatchObject({ kind: "unavailable", reason: expect.stringContaining("timed out") });
    });
  });

  it("cancels its timeout after a fast answer (no stray rejection later)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", sleeper());
    expect((await getProjectedTotals(2026, 11)).ok).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
