import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { prop } from "@/lib/db/schema";

/**
 * The public, no-login side of Pick'em: the pages WhatsApp links point to,
 * and their preview images. They show only what the shared post already
 * says (the prop, the result, names and caps) — never votes per person or
 * phone numbers.
 */

/** "/pickem/2026/11" params -> numbers, or null for anything that isn't a real week. */
export function parseWeekParams(params: { season: string; week: string }) {
  const season = Number(params.season);
  const week = Number(params.week);
  if (!Number.isInteger(season) || !Number.isInteger(week) || season < 2026 || week < 1 || week > 18) return null;
  return { season, week };
}

/** Cached per request: the page and its metadata both ask for it. */
export const getPublicProp = cache(async (season: number, week: number) => {
  const [p] = await db
    .select()
    .from(prop)
    .where(and(eq(prop.season, season), eq(prop.week, week), ne(prop.status, "void")));
  return p ?? null;
});
