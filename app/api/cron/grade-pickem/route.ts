import { NextResponse } from "next/server";

import { alertAdmins } from "@/lib/pickem/alerts";
import { gradeDueProps, recheckRecentResults } from "@/lib/pickem/grade";

/**
 * A Vercel Schedule hits this daily at 7 AM ET (see vercel.json). Grading
 * only happens once a prop's NFL week is completely final, and re-running is
 * harmless, so a daily schedule just means results land the first morning
 * they can — normally Tuesday, after Monday Night Football. The same run
 * re-checks recent results for NFL stat corrections, then emails the admins
 * about anything that happened.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`. Without the secret
 * configured this refuses in production (fails closed) rather than letting
 * anyone trigger grading; local dev can call it freely.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production";
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const outcomes = await gradeDueProps();
  const recheck = await recheckRecentResults();
  const corrections = recheck.corrections.map((c) => ({ propId: c.prop.id, week: c.prop.week, before: c.before, after: c.after }));
  console.log("[pickem] cron grading:", JSON.stringify({ outcomes, corrections, recheckErrors: recheck.errors.map((e) => e.reason) }));

  // A failed email mustn't fail the run: the grading above is already saved.
  let alert;
  try {
    alert = await alertAdmins({
      graded: outcomes.flatMap((o) => (o.status === "graded" ? [o.propId] : [])),
      corrections: recheck.corrections,
      errors: [
        ...outcomes.flatMap((o) => (o.status === "error" ? [{ week: o.week, reason: o.reason }] : [])),
        ...recheck.errors.map((e) => ({ week: e.prop.week, reason: e.reason })),
      ],
    });
  } catch (error) {
    console.error("[pickem] emailing the admins failed:", error);
    alert = { sent: false, error: String(error) };
  }
  return NextResponse.json({ outcomes, corrections, alert });
}
