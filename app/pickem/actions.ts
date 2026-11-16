"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { manager, prop, vote } from "@/lib/db/schema";
import { requireManager, requireViewer } from "@/lib/dal";
import { normalizeUsPhone } from "@/lib/phone";

/**
 * Links the signed-in account to a team. The `user_id is null` condition
 * makes this first-come-first-served even if two people tap the same team at
 * once — only one update can match — and the unique index on user_id stops
 * one login from holding two teams.
 */
export async function claimTeam(sleeperUserId: string) {
  const viewer = await requireViewer("/pickem/claim");
  if (viewer.manager) redirect("/pickem");

  const claimed = await db
    .update(manager)
    .set({ userId: viewer.userId, claimedAt: new Date() })
    .where(and(eq(manager.sleeperUserId, sleeperUserId), isNull(manager.userId)))
    .returning({ id: manager.sleeperUserId });

  if (claimed.length === 0) {
    return { error: "That team was just claimed by someone else." };
  }
  redirect("/pickem");
}

export type PhoneFormState = { error?: string; saved?: boolean };

export async function updatePhone(
  _prev: PhoneFormState,
  formData: FormData,
): Promise<PhoneFormState> {
  const viewer = await requireManager("/pickem/settings");
  const phone = normalizeUsPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter a 10-digit US phone number." };

  await db
    .update(manager)
    .set({ phone })
    .where(eq(manager.sleeperUserId, viewer.manager.sleeperUserId));
  refresh();
  return { saved: true };
}

export type VoteResult = { error?: string };

/**
 * Casts or changes the viewer's pick. Lock is enforced here, server-side,
 * against the prop's stored locks_at — the disabled buttons on a locked prop
 * are only a convenience, a stale tab can still submit.
 */
export async function castVote(propId: number, option: string): Promise<VoteResult> {
  const viewer = await requireManager("/pickem");
  const [p] = await db.select().from(prop).where(eq(prop.id, propId));
  if (!p) return { error: "That prop no longer exists." };
  if (p.status !== "open" || p.locksAt <= new Date()) return { error: "Voting is locked." };
  if (!p.options.some((o) => o.key === option)) return { error: "That isn't one of the options." };

  await db
    .insert(vote)
    .values({ propId, managerId: viewer.manager.sleeperUserId, option })
    .onConflictDoUpdate({
      target: [vote.propId, vote.managerId],
      set: { option, updatedAt: new Date() },
    });
  refresh();
  return {};
}
