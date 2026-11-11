import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClaimTeamList } from "@/components/pickem/claim-team-list";
import { redraftTeamNames } from "@/lib/data/pickem-teams";
import { db } from "@/lib/db";
import { manager } from "@/lib/db/schema";
import { requireViewer } from "@/lib/dal";

export const metadata: Metadata = { title: "Pick your team", robots: { index: false } };

export default async function ClaimTeamPage() {
  const viewer = await requireViewer("/pickem/claim");
  if (viewer.manager) redirect("/pickem");

  const teamNames = redraftTeamNames();
  const managers = await db
    .select({ id: manager.sleeperUserId, name: manager.name, userId: manager.userId })
    .from(manager)
    .orderBy(asc(manager.name));

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-fg uppercase">Which team is yours?</h1>
      <p className="mt-1 mb-8 text-fg-muted">
        One-time setup. This links your sign-in to your team for Pick&apos;em.
      </p>
      <ClaimTeamList
        teams={managers.map((m) => ({
          id: m.id,
          name: m.name,
          teamName: teamNames.get(m.id) ?? null,
          taken: m.userId !== null,
        }))}
      />
      <p className="mt-6 text-xs text-fg-subtle">
        Signed in as {viewer.email}. Picked the wrong team? Ask Rosemond or Matt to unlink it.
      </p>
    </div>
  );
}
