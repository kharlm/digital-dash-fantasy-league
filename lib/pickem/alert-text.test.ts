import { describe, expect, it } from "vitest";

import { adminAlertEmail, type CorrectionAlert, type GradedAlert } from "./alert-text";

const graded: GradedAlert = {
  week: 11,
  question: "49IRs vs. Team Band-Aid — Line: 49IRs -2.5",
  outcome: "Over: 49IRs wins by more than 2.5",
  winners: ["Binh", "Kharl"],
  voters: 3,
  payoutCents: 200,
  recapUrl: "https://digitaldashfl.com/pickem/2026/11/recap",
};

const correction: CorrectionAlert = {
  week: 11,
  question: graded.question,
  before: "Over: 49IRs wins by more than 2.5",
  after: "Under: 49IRs wins by less than 2.5 or loses",
  nowPaid: ["Mario"],
  noLongerPaid: ["Binh", "Kharl"],
  payoutCents: 200,
  recapUrl: graded.recapUrl,
};

describe("admin alert email", () => {
  it("sends nothing on a quiet day", () => {
    expect(adminAlertEmail({ graded: [], corrections: [], errors: [] })).toBeNull();
  });

  it("a graded week: the result, who got paid, and the recap link to post", () => {
    const email = adminAlertEmail({ graded: [graded], corrections: [], errors: [] })!;
    expect(email.subject).toBe("DDFL Pick'em: Week 11 graded — time to post the recap");
    expect(email.text).toContain("2 of 3 got it right (+$2 each): Binh, Kharl");
    expect(email.text).toContain(graded.recapUrl);
  });

  it("a stat correction leads the subject and says who gained and lost money", () => {
    const email = adminAlertEmail({ graded: [], corrections: [correction], errors: [] })!;
    expect(email.subject).toBe("DDFL Pick'em: Week 11 result changed (stat correction)");
    expect(email.text).toContain("Now paid +$2: Mario");
    expect(email.text).toContain("No longer paid: Binh, Kharl");
  });

  it("a failure says what went wrong", () => {
    const email = adminAlertEmail({ graded: [], corrections: [], errors: [{ week: 12, reason: "Sleeper down" }] })!;
    expect(email.subject).toBe("DDFL Pick'em: problem grading Week 12");
    expect(email.text).toContain("Error: Sleeper down");
  });
});
