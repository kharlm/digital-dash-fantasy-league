"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { manager } from "@/lib/db/schema";
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
  revalidatePath("/pickem/settings");
  return { saved: true };
}
