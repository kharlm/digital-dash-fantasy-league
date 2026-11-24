import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { manager, prop, user, vote, type PropResult } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

import { adminAlertEmail, type CorrectionAlert, type ErrorAlert, type GradedAlert } from "./alert-text";
import type { Correction } from "./grade";
import { recapShareUrl } from "./share";

type Prop = typeof prop.$inferSelect;

function outcomeLabel(p: Prop, r: PropResult): string {
  if (r.push) return "Landed exactly on the line — every voter wins";
  return r.winningOptions.map((k) => p.options.find((o) => o.key === k)?.label ?? k).join(" / ");
}

async function votesWithNames(propId: number) {
  return db
    .select({ name: manager.name, option: vote.option })
    .from(vote)
    .innerJoin(manager, eq(manager.sleeperUserId, vote.managerId))
    .where(eq(vote.propId, propId));
}

const paid = (votes: { name: string; option: string }[], r: PropResult) =>
  votes.filter((v) => r.push || r.winningOptions.includes(v.option)).map((v) => v.name).sort();

/** Admins who have signed in — an admin who hasn't yet has no email on file. */
async function adminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: user.email })
    .from(manager)
    .innerJoin(user, eq(user.id, manager.userId))
    .where(eq(manager.role, "admin"));
  return rows.map((r) => r.email);
}

/**
 * Emails the admins about one run of the daily grading job: weeks it graded,
 * stat corrections that changed a result, and anything that failed. Sends
 * nothing on a quiet day.
 */
export async function alertAdmins(run: {
  graded: number[]; // prop ids graded this run
  corrections: Correction[];
  errors: { week: number; reason: string }[];
}) {
  const gradedProps = run.graded.length ? await db.select().from(prop).where(inArray(prop.id, run.graded)) : [];

  const graded: GradedAlert[] = await Promise.all(
    gradedProps.map(async (p) => {
      const votes = await votesWithNames(p.id);
      return {
        week: p.week,
        question: p.question,
        outcome: outcomeLabel(p, p.result!),
        winners: paid(votes, p.result!),
        voters: votes.length,
        payoutCents: p.payoutCents,
        recapUrl: recapShareUrl(p),
      };
    }),
  );

  const corrections: CorrectionAlert[] = await Promise.all(
    run.corrections.map(async ({ prop: p, before, after }) => {
      const votes = await votesWithNames(p.id);
      const was = paid(votes, before);
      const now = paid(votes, after);
      return {
        week: p.week,
        question: p.question,
        before: outcomeLabel(p, before),
        after: outcomeLabel(p, after),
        nowPaid: now.filter((n) => !was.includes(n)),
        noLongerPaid: was.filter((n) => !now.includes(n)),
        payoutCents: p.payoutCents,
        recapUrl: recapShareUrl(p),
      };
    }),
  );

  const errors: ErrorAlert[] = run.errors;
  const email = adminAlertEmail({ graded, corrections, errors });
  if (!email) return { sent: false as const };

  const to = await adminEmails();
  if (to.length === 0) {
    console.warn("[pickem] no admin has signed in, so there's no one to email:", email.subject);
    return { sent: false as const };
  }
  await sendEmail({ to, ...email });
  return { sent: true as const, to: to.length, subject: email.subject };
}
