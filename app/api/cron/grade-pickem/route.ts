import { NextResponse } from "next/server";

import { gradeDueProps } from "@/lib/pickem/grade";

/**
 * A Vercel Schedule hits this daily at 10 AM ET (see vercel.json). Grading
 * only happens once a prop's NFL week is completely final, and re-running is
 * harmless, so a daily schedule just means results land the first morning
 * they can —
 * normally Tuesday, after Monday Night Football.
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
  console.log("[pickem] cron grading:", JSON.stringify(outcomes));
  return NextResponse.json({ outcomes });
}
