"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { prop, type PropType } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/dal";
import { getRedraftMatchups, getRedraftTeams } from "@/lib/pickem/matchups";
import { buildProp, type PropInput } from "@/lib/pickem/props";
import { getPickemWeek } from "@/lib/pickem/schedule";

export type CreatePropState = { error?: string; created?: boolean };

const PROP_TYPES: PropType[] = ["spread", "straight_up", "team_total", "top_scorer", "custom"];

function dollarsToCents(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) : null;
}

/**
 * Team names and matchups are re-read from Sleeper here rather than trusted
 * from the form — the form only sends roster_ids. The week is also decided
 * server-side (getPickemWeek), so a stale admin tab can't post into a week
 * that has already kicked off.
 */
export async function createProp(_prev: CreatePropState, formData: FormData): Promise<CreatePropState> {
  const admin = await requireAdmin();

  const type = String(formData.get("type")) as PropType;
  if (!PROP_TYPES.includes(type)) return { error: "Pick a prop type." };

  const payoutCents = dollarsToCents(formData.get("payout"));
  if (payoutCents === null || payoutCents === 0) return { error: "Payout must be between $0.01 and $100." };
  const pushPayoutCents = type === "spread" ? dollarsToCents(formData.get("pushPayout")) : 0;
  if (pushPayoutCents === null) return { error: "Push payout must be between $0 and $100." };

  const locksAt = new Date(String(formData.get("locksAt")));
  if (Number.isNaN(locksAt.getTime())) return { error: "Set a lock time." };
  if (locksAt <= new Date()) return { error: "The lock time has to be in the future." };

  const { season, week } = await getPickemWeek();
  const teams = await getRedraftTeams();
  const team = (key: string) => teams.get(Number(formData.get(key)));
  const line = Number(formData.get("line"));
  const validLine = Number.isFinite(line) && line > 0 && line < 500;

  let input: PropInput;
  switch (type) {
    case "spread": {
      const fav = team("favorite");
      const matchup = (await getRedraftMatchups(week)).find((m) => m.matchupId === Number(formData.get("matchup")));
      if (!matchup || !fav) return { error: "Pick a matchup and the favorite." };
      if (fav.rosterId !== matchup.a.rosterId && fav.rosterId !== matchup.b.rosterId) {
        return { error: "The favorite has to be in that matchup." };
      }
      const dog = matchup.a.rosterId === fav.rosterId ? matchup.b : matchup.a;
      if (!validLine) return { error: "Enter a line greater than 0." };
      input = { type, favorite: fav, underdog: dog, line };
      break;
    }
    case "straight_up": {
      const matchup = (await getRedraftMatchups(week)).find((m) => m.matchupId === Number(formData.get("matchup")));
      if (!matchup) return { error: "Pick a matchup." };
      input = { type, a: matchup.a, b: matchup.b };
      break;
    }
    case "team_total": {
      const t = team("team");
      if (!t) return { error: "Pick a team." };
      if (!validLine) return { error: "Enter a line greater than 0." };
      input = { type, team: t, line };
      break;
    }
    case "top_scorer":
      input = { type, teams: [...teams.values()] };
      break;
    case "custom": {
      const question = String(formData.get("question") ?? "").trim();
      const options = String(formData.get("options") ?? "")
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (!question) return { error: "Write the question." };
      if (options.length < 2 || options.length > 12) return { error: "Give 2 to 12 options, one per line." };
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
        return { error: "Options must all be different." };
      }
      input = { type, question, options };
      break;
    }
  }

  const built = buildProp(input);
  const inserted = await db
    .insert(prop)
    .values({ season, week, ...built, payoutCents, pushPayoutCents, locksAt, createdBy: admin.userId })
    .onConflictDoNothing({ target: [prop.season, prop.week] })
    .returning({ id: prop.id });
  if (inserted.length === 0) return { error: `There's already a prop for week ${week}.` };

  refresh();
  return { created: true };
}

/** Pulls a prop that hasn't locked yet (a typo'd line, wrong matchup). Its votes go with it. */
export async function deleteOpenProp(propId: number) {
  await requireAdmin();
  const [row] = await db.select({ locksAt: prop.locksAt, status: prop.status }).from(prop).where(eq(prop.id, propId));
  if (!row) return { error: "That prop no longer exists." };
  if (row.status !== "open" || row.locksAt <= new Date()) {
    return { error: "Voting has locked — this prop can't be deleted anymore." };
  }
  await db.delete(prop).where(and(eq(prop.id, propId), eq(prop.status, "open")));
  refresh();
  return {};
}
