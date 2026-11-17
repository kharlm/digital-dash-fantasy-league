import { describe, expect, it } from "vitest";

import { announcementText, formatLockShort, recapText, type RecapFacts } from "./share-text";

const announcement = {
  week: 11,
  question: "DDFL total score — all 10 teams combined — Line: 1200.0",
  options: ["Over: more than 1200.0 points combined", "Under: fewer than 1200.0 points combined"],
  payoutCents: 200,
  locksAt: new Date("2026-11-20T01:10:00Z"), // Thu 8:10 PM EST
  url: "https://digitaldashfl.com/pickem/2026/11",
};

const recap: RecapFacts = {
  week: 10,
  question: "DDFL total score — all 10 teams combined — Line: 1200.0",
  outcome: "Over: more than 1200.0 points combined",
  finalScore: "1258.34 combined",
  payoutCents: 200,
  winners: ["Binh", "Kharl"],
  voters: 9,
  push: false,
  topScorers: [
    { name: "Kharl", points: 167.16 },
    { name: "Mario", points: 141.64 },
  ],
  caps: [
    { name: "Rosemond", capCents: 215_00 },
    { name: "Inkyu", capCents: 213_00 },
  ],
  capSeason: 2027,
  url: "https://digitaldashfl.com/pickem/2026/10/recap",
};

it("lock time reads in Eastern, short", () => {
  expect(formatLockShort(announcement.locksAt)).toBe("Thu 8:10 PM ET");
});

describe("announcement", () => {
  it("has the prop, both sides, the deadline, the prize, and the link", () => {
    const text = announcementText(announcement, null);
    expect(text).toContain("🏈 Week 11 PICK'EM");
    expect(text).toContain("📈 Over: more than 1200.0 points combined");
    expect(text).toContain("📉 Under: fewer than 1200.0 points combined");
    expect(text).toContain("Pick before Thu 8:10 PM ET and win $2!");
    expect(text.endsWith("Vote 👉 https://digitaldashfl.com/pickem/2026/11")).toBe(true);
  });

  it("team options get bullets", () => {
    expect(announcementText({ ...announcement, options: ["Nobie", "Band-Aid"] }, null)).toContain("• Nobie\n• Band-Aid");
  });

  it("Claude's line goes above the link, and the post is complete without it", () => {
    const withFlair = announcementText(announcement, "Bold of you to take the under.");
    expect(withFlair).toContain("Bold of you to take the under.\n\nVote 👉");
    expect(announcementText(announcement, null)).not.toContain("undefined");
  });
});

describe("recap", () => {
  it("states the result, who got paid, top scorers, and the caps", () => {
    const text = recapText(recap, null);
    expect(text).toContain("✅ Over: more than 1200.0 points combined (final: 1258.34 combined)");
    expect(text).toContain("2 of 9 got it right: Binh, Kharl (+$2 each)");
    expect(text).toContain("🔥 Top scorers: Kharl 167.16 · Mario 141.64");
    expect(text).toContain("💰 2027 auction caps\nRosemond $215 · Inkyu $213");
  });

  it("says when every voter is paid on a push, and when nobody won", () => {
    expect(recapText({ ...recap, push: true, winners: [] }, null)).toContain("all 9 voters get paid (+$2 each)");
    expect(recapText({ ...recap, winners: [] }, null)).toContain("Nobody of the 9 who voted got it right.");
  });
});
