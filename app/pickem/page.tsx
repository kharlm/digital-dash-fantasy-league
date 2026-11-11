import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/pickem/sign-out-button";
import { redraftTeamNames } from "@/lib/data/pickem-teams";
import { requireManager } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Pick'em",
  description: "Weekly Pick'em — vote on the commissioner's line, win auction dollars.",
};

// Phase 1 placeholder: proves the sign-in -> claim -> signed-in loop end to
// end. The weekly prop and voting land here in Phase 2.
export default async function PickemPage() {
  const viewer = await requireManager("/pickem");
  const teamName = redraftTeamNames().get(viewer.manager.sleeperUserId);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-fg uppercase">Pick&apos;em</h1>
          <p className="text-fg-muted">
            Signed in as <span className="text-fg">{viewer.manager.name}</span>
            {teamName ? ` · ${teamName}` : null}
            {viewer.manager.role === "admin" ? (
              <span className="ml-2 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
                Admin
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/pickem/settings" className="text-fg-muted hover:text-fg">
            Settings
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-8 text-center">
        <p className="font-display text-lg font-semibold text-fg uppercase">No prop posted yet</p>
        <p className="mt-1 text-sm text-fg-muted">This week&apos;s line will show up here once it&apos;s set.</p>
      </div>
    </div>
  );
}
