import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/pickem/sign-out-button";
import { VotePanel } from "@/components/pickem/vote-panel";
import { redraftTeamNames } from "@/lib/data/pickem-teams";
import { db } from "@/lib/db";
import { manager, prop, vote, type PropParams } from "@/lib/db/schema";
import { requireManager } from "@/lib/dal";
import { formatEastern, formatMoney } from "@/lib/pickem/format";
import { getRedraftTeams } from "@/lib/pickem/matchups";
import { getPickemWeek } from "@/lib/pickem/schedule";

export const metadata: Metadata = {
  title: "Pick'em",
  description: "Weekly Pick'em — vote on the commissioner's line, win auction dollars.",
};

export default async function PickemPage() {
  const viewer = await requireManager("/pickem");
  const teamName = redraftTeamNames().get(viewer.manager.sleeperUserId);
  const isAdmin = viewer.manager.role === "admin";

  // The newest prop is "this week's": open until it locks, then it stays up
  // (locked, later graded) until the commissioner posts the next one.
  const [current] = await db.select().from(prop).orderBy(desc(prop.season), desc(prop.week)).limit(1);

  // Admins land here first, so when the upcoming week has no prop yet they
  // get a direct button to set it — whether the page is empty or still
  // showing last week's locked prop. (Only admins pay for the Sleeper/ESPN
  // lookup; it's cached.)
  let weekNeedingProp: number | null = null;
  if (isAdmin) {
    const upcoming = await getPickemWeek().catch(() => null);
    const hasIt = current && upcoming && current.season === upcoming.season && current.week === upcoming.week;
    if (upcoming && !hasIt) weekNeedingProp = upcoming.week;
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-fg uppercase">Pick&apos;em</h1>
          <p className="text-fg-muted">
            Signed in as <span className="text-fg">{viewer.manager.name}</span>
            {teamName ? ` · ${teamName}` : null}
            {isAdmin ? (
              <span className="ml-2 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
                Admin
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {isAdmin ? (
            <Link href="/pickem/admin" className="font-medium text-gold-400 hover:text-gold-300">
              Admin
            </Link>
          ) : null}
          <Link href="/pickem/ledger" className="text-fg-muted hover:text-fg">
            Caps
          </Link>
          <Link href="/pickem/settings" className="text-fg-muted hover:text-fg">
            Settings
          </Link>
          <SignOutButton />
        </div>
      </div>

      {weekNeedingProp !== null ? (
        <Link
          href="/pickem/admin"
          className="mb-4 block rounded-lg bg-gold-500 px-4 py-3 text-center font-semibold text-navy-950 transition-colors hover:bg-gold-400"
        >
          Set Week {weekNeedingProp}&apos;s prop →
        </Link>
      ) : null}

      {current ? (
        <CurrentProp prop={current} viewerManagerId={viewer.manager.sleeperUserId} />
      ) : (
        <div className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-8 text-center">
          <p className="font-display text-lg font-semibold text-fg uppercase">No prop posted yet</p>
          <p className="mt-1 text-sm text-fg-muted">This week&apos;s line will show up here once it&apos;s set.</p>
        </div>
      )}
    </div>
  );
}

async function CurrentProp({
  prop: p,
  viewerManagerId,
}: {
  prop: typeof prop.$inferSelect;
  viewerManagerId: string;
}) {
  const [votes, managers] = await Promise.all([
    db
      .select({ managerId: vote.managerId, option: vote.option, name: manager.name })
      .from(vote)
      .innerJoin(manager, eq(vote.managerId, manager.sleeperUserId))
      .where(eq(vote.propId, p.id))
      .orderBy(asc(vote.updatedAt)),
    db.select({ id: manager.sleeperUserId, name: manager.name }).from(manager).orderBy(asc(manager.name)),
  ]);

  const locked = p.status !== "open" || p.locksAt <= new Date();
  const voted = new Set(votes.map((v) => v.managerId));
  const result = p.status === "graded" ? p.result : null;
  const myVote = votes.find((v) => v.managerId === viewerManagerId)?.option ?? null;
  const iWon = result && myVote !== null && (result.push || result.winningOptions.includes(myVote));
  // Only needed for the "Final:" score line; a Sleeper hiccup just means
  // generic names there, never a broken page.
  const teamNames = result?.scores
    ? new Map([...(await getRedraftTeams().catch(() => new Map())).values()].map((t) => [t.rosterId, t.teamName]))
    : new Map<number, string>();

  return (
    <section className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
          Week {p.week}
        </span>
        <span className="text-xs text-fg-subtle">
          {locked ? "Locked" : "Locks"} {formatEastern(p.locksAt)}
        </span>
      </div>
      <h2 className="mt-3 font-display text-xl font-semibold text-fg uppercase sm:text-2xl">{p.question}</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Win {formatMoney(p.payoutCents)} toward next year&apos;s auction
      </p>

      {result ? (
        <div
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            iWon ? "bg-emerald-500/15 text-emerald-300" : "bg-navy-900 text-fg-muted"
          }`}
        >
          <p className="font-semibold">
            {iWon
              ? `You won ${formatMoney(p.payoutCents)} toward next year's auction!`
              : myVote
                ? "Not this week."
                : "You didn't vote on this one."}
          </p>
          {result.push ? <p className="mt-1">It landed exactly on the line — every voter wins.</p> : null}
          {result.scores && p.type === "league_total" ? (
            <p className="mt-1 text-xs text-fg-subtle">
              Final: {leagueTotal(result.scores).toFixed(2)} points combined
            </p>
          ) : result.scores && p.type !== "top_scorer" ? (
            <p className="mt-1 text-xs text-fg-subtle">
              Final:{" "}
              {scoreOrder(p.params, result.scores)
                .map(([rosterId, pts]) => `${teamNames.get(rosterId) ?? `Team ${rosterId}`} ${pts.toFixed(2)}`)
                .join(" – ")}
            </p>
          ) : null}
          {result.note ? <p className="mt-1 text-xs text-fg-subtle">Commissioner&apos;s note: {result.note}</p> : null}
        </div>
      ) : null}

      <VotePanel
        propId={p.id}
        locked={locked}
        winners={result ? result.winningOptions : null}
        myVote={myVote}
        options={p.options.map((o) => ({
          key: o.key,
          label: o.label,
          voters: votes.filter((v) => v.option === o.key).map((v) => v.name),
        }))}
      />

      <p className="mt-5 text-xs text-fg-subtle">
        {voted.size} of {managers.length} voted
        {voted.size < managers.length
          ? ` · ${locked ? "Missed it" : "Still waiting on"}: ${managers
              .filter((m) => !voted.has(m.id))
              .map((m) => m.name)
              .join(", ")}`
          : ""}
      </p>
    </section>
  );
}

/** Summed in hundredths, the same way grading does, so the shown total matches the result. */
function leagueTotal(scores: Record<number, number>): number {
  return Object.values(scores).reduce((sum, pts) => sum + Math.round(pts * 100), 0) / 100;
}

/**
 * Final scores in the order the prop reads — favorite first for a spread,
 * team A first straight up. (The stored scores object can't keep that order:
 * JS sorts integer keys numerically, i.e. by Sleeper roster id.)
 */
function scoreOrder(params: PropParams, scores: Record<number, number>): [number, number][] {
  const order =
    "favoriteRosterId" in params
      ? [params.favoriteRosterId, params.underdogRosterId]
      : "rosterIdA" in params
        ? [params.rosterIdA, params.rosterIdB]
        : Object.keys(scores).map(Number);
  return order.filter((id) => id in scores).map((id) => [id, scores[id]]);
}
