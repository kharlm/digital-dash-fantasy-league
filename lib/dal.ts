import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { manager } from "@/lib/db/schema";

/**
 * The data access layer: every Pick'em page, server action and route handler
 * gets the viewer through these, never by reading cookies directly. Each
 * call validates the session against the database (not just the cookie), and
 * `cache` dedupes that to one lookup per request.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export type Viewer = {
  userId: string;
  email: string;
  name: string;
  manager: typeof manager.$inferSelect | null; // null until they pick a team
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession();
  if (!session) return null;
  const [row] = await db
    .select()
    .from(manager)
    .where(eq(manager.userId, session.user.id));
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    manager: row ?? null,
  };
});

/** Signed in, any team status. Bounces to sign-in otherwise. */
export async function requireViewer(returnTo = "/pickem") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return viewer;
}

/** Signed in AND linked to a team — the bar for voting. */
export async function requireManager(returnTo = "/pickem") {
  const viewer = await requireViewer(returnTo);
  if (!viewer.manager) redirect("/pickem/claim");
  return { ...viewer, manager: viewer.manager };
}

export async function requireAdmin() {
  const viewer = await requireManager("/pickem/admin");
  if (viewer.manager.role !== "admin") redirect("/pickem");
  return viewer;
}
