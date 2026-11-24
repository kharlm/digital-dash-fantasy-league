import { formatMoney } from "./format";

/**
 * The email the daily grading job sends the admins when something happened:
 * a week graded (time to post the recap), a stat correction that changed a
 * result (post a correction), or grading that failed (someone should look).
 * Pure text from facts, like the WhatsApp posts in share-text.ts.
 */

export type GradedAlert = {
  week: number;
  question: string;
  outcome: string; // the winning option's label, or the push line
  winners: string[];
  voters: number;
  payoutCents: number;
  recapUrl: string;
};

export type CorrectionAlert = {
  week: number;
  question: string;
  before: string;
  after: string;
  nowPaid: string[]; // won after the correction, hadn't before
  noLongerPaid: string[]; // had won, lost after the correction
  payoutCents: number;
  recapUrl: string;
};

export type ErrorAlert = { week: number; reason: string };

export type AdminAlerts = { graded: GradedAlert[]; corrections: CorrectionAlert[]; errors: ErrorAlert[] };

const names = (list: string[]) => (list.length ? list.join(", ") : "nobody");

function gradedText(g: GradedAlert): string {
  return [
    `✅ Week ${g.week} is graded`,
    g.question,
    `Result: ${g.outcome}`,
    `${g.winners.length} of ${g.voters} got it right (+${formatMoney(g.payoutCents)} each): ${names(g.winners)}`,
    `Recap: ${g.recapUrl}`,
    "Post it to WhatsApp from the admin box on the Pick'em page.",
  ].join("\n");
}

function correctionText(c: CorrectionAlert): string {
  return [
    `⚠️ Week ${c.week} changed after an NFL stat correction`,
    c.question,
    `Was: ${c.before}`,
    `Now: ${c.after}`,
    `Now paid +${formatMoney(c.payoutCents)}: ${names(c.nowPaid)}`,
    `No longer paid: ${names(c.noLongerPaid)}`,
    "The caps and the recap are already updated. Worth a quick correction post in WhatsApp:",
    c.recapUrl,
  ].join("\n");
}

function errorText(e: ErrorAlert): string {
  return [
    `❌ Couldn't grade Week ${e.week}`,
    `Error: ${e.reason}`,
    "The job tries again tomorrow morning. To retry now, use Grade now on the admin page.",
  ].join("\n");
}

/** One email per run covering everything that happened, or null when there's nothing to say. */
export function adminAlertEmail(a: AdminAlerts): { subject: string; text: string } | null {
  const sections = [...a.corrections.map(correctionText), ...a.errors.map(errorText), ...a.graded.map(gradedText)];
  if (sections.length === 0) return null;

  const weeks = (list: { week: number }[]) => list.map((x) => x.week).join(" & ");
  const subject = a.corrections.length
    ? `DDFL Pick'em: Week ${weeks(a.corrections)} result changed (stat correction)`
    : a.errors.length
      ? `DDFL Pick'em: problem grading Week ${weeks(a.errors)}`
      : `DDFL Pick'em: Week ${weeks(a.graded)} graded — time to post the recap`;
  return { subject, text: sections.join("\n\n") };
}
