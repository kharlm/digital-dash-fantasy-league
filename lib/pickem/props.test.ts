import { describe, expect, it } from "vitest";

import { buildProp, formatLine, suggestLine } from "./props";

const chris = { rosterId: 4, teamName: "Chris" };
const inkyu = { rosterId: 7, teamName: "Inkyu" };

describe("buildProp", () => {
  it("spread: reads like the commissioner's WhatsApp post", () => {
    const p = buildProp({ type: "spread", favorite: chris, underdog: inkyu, line: 10 });
    expect(p.question).toBe("Chris vs. Inkyu — Line: Chris -10.0");
    expect(p.options).toEqual([
      { key: "over", label: "Over: Chris wins by more than 10.0" },
      { key: "under", label: "Under: Chris wins by less than 10.0 or loses" },
    ]);
    expect(p.params).toEqual({ favoriteRosterId: 4, underdogRosterId: 7, line: 10 });
  });

  it("straight up: one option per team, keyed by roster id", () => {
    const p = buildProp({ type: "straight_up", a: chris, b: inkyu });
    expect(p.options.map((o) => o.key)).toEqual(["r4", "r7"]);
    expect(p.params).toEqual({ rosterIdA: 4, rosterIdB: 7 });
  });

  it("team total: over/under on that team's points", () => {
    const p = buildProp({ type: "team_total", team: chris, line: 120.5 });
    expect(p.question).toBe("Chris total points — Line: 120.5");
    expect(p.params).toEqual({ rosterId: 4, line: 120.5 });
  });

  it("top scorer: every team as an option, alphabetical", () => {
    const p = buildProp({ type: "top_scorer", teams: [inkyu, chris] });
    expect(p.options.map((o) => o.label)).toEqual(["Chris", "Inkyu"]);
  });
});

describe("suggestLine", () => {
  it("rounds a projected gap to the nearest half point", () => {
    expect(suggestLine(20.1)).toBe(20);
    expect(suggestLine(8.4)).toBe(8.5);
    expect(suggestLine(26.99)).toBe(27);
  });

  it("never suggests a line below 0.5", () => {
    expect(suggestLine(0.1)).toBe(0.5);
  });
});

it("formatLine always shows one decimal, like a sportsbook", () => {
  expect(formatLine(10)).toBe("10.0");
  expect(formatLine(7.5)).toBe("7.5");
});
