import { describe, expect, it } from "vitest";

import { decideResult } from "./decide";

const scores = (o: Record<number, number>) => new Map(Object.entries(o).map(([k, v]) => [Number(k), v]));

type TestProp = Parameters<typeof decideResult>[0];

const spread = (line: number): TestProp => ({
  type: "spread",
  options: [],
  params: { favoriteRosterId: 1, underdogRosterId: 2, line },
});
const teamTotal = (line: number): TestProp => ({ type: "team_total", options: [], params: { rosterId: 3, line } });
const straightUp: TestProp = { type: "straight_up", options: [], params: { rosterIdA: 1, rosterIdB: 2 } };
const topScorer: TestProp = {
  type: "top_scorer",
  options: [
    { key: "r1", label: "A" },
    { key: "r2", label: "B" },
    { key: "r3", label: "C" },
  ],
  params: {},
};

describe("spread", () => {
  it("Over when the favorite wins by more than the line", () => {
    expect(decideResult(spread(10), scores({ 1: 130.5, 2: 110.1 }))).toMatchObject({ winningOptions: ["over"], push: false });
  });

  it("Under when the favorite wins by less than the line", () => {
    expect(decideResult(spread(10), scores({ 1: 115, 2: 110 })).winningOptions).toEqual(["under"]);
  });

  it("Under when the favorite loses outright", () => {
    expect(decideResult(spread(10), scores({ 1: 100, 2: 110 })).winningOptions).toEqual(["under"]);
  });

  it("push when the margin lands exactly on the line", () => {
    expect(decideResult(spread(10), scores({ 1: 132.48, 2: 122.48 }))).toMatchObject({ winningOptions: [], push: true });
  });

  it("isn't fooled by floating-point noise (0.1 + 0.2 vs 0.3)", () => {
    expect(decideResult(spread(0.3), scores({ 1: 0.1 + 0.2, 2: 0 })).push).toBe(true);
  });

  it("records the scores it graded with", () => {
    expect(decideResult(spread(10), scores({ 1: 130, 2: 110 })).scores).toEqual({ 1: 130, 2: 110 });
  });
});

describe("team total", () => {
  it("Over / Under against the line", () => {
    expect(decideResult(teamTotal(120.5), scores({ 3: 120.51 })).winningOptions).toEqual(["over"]);
    expect(decideResult(teamTotal(120.5), scores({ 3: 120.49 })).winningOptions).toEqual(["under"]);
  });

  it("push when it lands exactly on the line", () => {
    expect(decideResult(teamTotal(120.5), scores({ 3: 120.5 })).push).toBe(true);
  });
});

describe("league total", () => {
  const leagueTotal = (line: number): TestProp => ({ type: "league_total", options: [], params: { rosterIds: [1, 2, 3], line } });

  it("adds every team's points and compares to the line", () => {
    expect(decideResult(leagueTotal(300), scores({ 1: 120.5, 2: 99.25, 3: 100.5 })).winningOptions).toEqual(["over"]);
    expect(decideResult(leagueTotal(330), scores({ 1: 120.5, 2: 99.25, 3: 100.5 })).winningOptions).toEqual(["under"]);
  });

  it("push when the combined total lands exactly on the line, despite float noise", () => {
    // 0.1 + 0.2 + 0.2 is 0.5000000000000001 in floating point.
    expect(decideResult(leagueTotal(300.5), scores({ 1: 100.1, 2: 100.2, 3: 100.2 }))).toMatchObject({ push: true });
  });

  it("refuses to grade if any team's score is missing", () => {
    expect(() => decideResult(leagueTotal(300), scores({ 1: 120, 2: 100 }))).toThrow(/roster 3/);
  });
});

describe("straight up", () => {
  it("the higher score wins", () => {
    expect(decideResult(straightUp, scores({ 1: 99.99, 2: 100 })).winningOptions).toEqual(["r2"]);
  });

  it("a tie pays both sides", () => {
    expect(decideResult(straightUp, scores({ 1: 100, 2: 100 })).winningOptions).toEqual(["r1", "r2"]);
  });
});

describe("top scorer", () => {
  it("the highest score in the league wins", () => {
    expect(decideResult(topScorer, scores({ 1: 120, 2: 150.2, 3: 90 })).winningOptions).toEqual(["r2"]);
  });

  it("ties pay every tied team", () => {
    expect(decideResult(topScorer, scores({ 1: 150.2, 2: 150.2, 3: 90 })).winningOptions).toEqual(["r1", "r2"]);
  });
});

it("refuses to grade when a needed score is missing", () => {
  expect(() => decideResult(spread(10), scores({ 1: 100 }))).toThrow("no final score for roster 2");
});
