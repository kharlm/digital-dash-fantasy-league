import { and, count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { CreatePropForm } from "@/components/pickem/create-prop-form";
import { DeletePropButton } from "@/components/pickem/delete-prop-button";
import { db } from "@/lib/db";
import { prop, vote } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/dal";
import { formatEastern, formatMoney } from "@/lib/pickem/format";
import { getRedraftMatchups, getRedraftTeams } from "@/lib/pickem/matchups";
import { getPickemWeek } from "@/lib/pickem/schedule";

export const metadata: Metadata = { title: "Pick'em admin", robots: { index: false } };

const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000;

export default async function PickemAdminPage() {
  await requireAdmin();
  const { season, week, firstKickoff } = await getPickemWeek();

  const [existing] = await db
    .select()
    .from(prop)
    .where(and(eq(prop.season, season), eq(prop.week, week)));

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <Link href="/pickem" className="text-sm text-fg-muted hover:text-fg">
        ← Pick&apos;em
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-fg uppercase">Week {week} prop</h1>
      <p className="mb-8 text-fg-muted">
        {firstKickoff ? `First kickoff ${formatEastern(firstKickoff)}.` : "Couldn't load this week's kickoff time."}
      </p>

      {existing ? (
        <ExistingProp prop={existing} />
      ) : (
        <NewPropForm week={week} firstKickoff={firstKickoff} />
      )}
    </div>
  );
}

async function NewPropForm({ week, firstKickoff }: { week: number; firstKickoff: Date | null }) {
  const [matchups, teams] = await Promise.all([getRedraftMatchups(week), getRedraftTeams()]);
  const defaultLock = firstKickoff ? new Date(firstKickoff.getTime() - LOCK_BEFORE_KICKOFF_MS) : null;

  return (
    <CreatePropForm
      matchups={matchups.map((m) => ({
        id: m.matchupId,
        a: { rosterId: m.a.rosterId, name: m.a.teamName },
        b: { rosterId: m.b.rosterId, name: m.b.teamName },
      }))}
      teams={[...teams.values()]
        .map((t) => ({ rosterId: t.rosterId, name: t.teamName }))
        .sort((x, y) => x.name.localeCompare(y.name))}
      defaultLockIso={defaultLock?.toISOString() ?? null}
    />
  );
}

async function ExistingProp({ prop: p }: { prop: typeof prop.$inferSelect }) {
  const [{ votes }] = await db.select({ votes: count() }).from(vote).where(eq(vote.propId, p.id));
  const locked = p.locksAt <= new Date();

  return (
    <div className="space-y-4 rounded-lg border border-navy-600 bg-navy-800 px-4 py-4">
      <p className="font-display text-lg font-semibold text-fg uppercase">{p.question}</p>
      <ul className="space-y-1 text-sm text-fg-muted">
        {p.options.map((o) => (
          <li key={o.key}>• {o.label}</li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-fg-muted">Payout</dt>
        <dd className="text-fg">{formatMoney(p.payoutCents)}</dd>
        <dt className="text-fg-muted">{locked ? "Locked" : "Locks"}</dt>
        <dd className="text-fg">{formatEastern(p.locksAt)}</dd>
        <dt className="text-fg-muted">Votes</dt>
        <dd className="text-fg">{votes} of 10</dd>
      </dl>
      {!locked && p.status === "open" ? <DeletePropButton propId={p.id} votes={votes} /> : null}
    </div>
  );
}
