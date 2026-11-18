import { and, count, desc, eq, lte } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { CreatePropForm } from "@/components/pickem/create-prop-form";
import { DeletePropButton } from "@/components/pickem/delete-prop-button";
import { GradeControls } from "@/components/pickem/grade-controls";
import { SharePost } from "@/components/pickem/share-post";
import { db } from "@/lib/db";
import { prop, vote } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/dal";
import { formatEastern, formatMoney } from "@/lib/pickem/format";
import { getRedraftMatchups, getRedraftTeams } from "@/lib/pickem/matchups";
import { getProjectedTotals, type ProjectedTotals } from "@/lib/pickem/projections";
import { getPickemWeek } from "@/lib/pickem/schedule";

export const metadata: Metadata = { title: "Pick'em admin", robots: { index: false } };

const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000;

/**
 * Local-dev-only previews of the projections warnings, so they can be seen
 * without breaking anything: /pickem/admin?simulate=projections-changed (or
 * projections-unavailable). Ignored in production.
 */
const SIMULATED: Record<string, ProjectedTotals> = {
  "projections-changed": {
    ok: false,
    kind: "changed",
    summary: "Sleeper's projections address no longer exists — they probably moved it.",
    reason: "Sleeper projections -> HTTP 404 (simulated)",
  },
  "projections-unavailable": { ok: false, kind: "unavailable", reason: "timed out after 5s (simulated)" },
};

export default async function PickemAdminPage({ searchParams }: PageProps<"/pickem/admin">) {
  await requireAdmin();
  const { simulate } = await searchParams;
  const simulated =
    process.env.NODE_ENV !== "production" && typeof simulate === "string" ? SIMULATED[simulate] : undefined;
  const { season, week, firstKickoff } = await getPickemWeek();

  const [[existing], [lastLocked]] = await Promise.all([
    db
      .select()
      .from(prop)
      .where(and(eq(prop.season, season), eq(prop.week, week))),
    // The most recent prop whose voting has closed — what needs grading now
    // (or an override later).
    db
      .select()
      .from(prop)
      .where(lte(prop.locksAt, new Date()))
      .orderBy(desc(prop.season), desc(prop.week))
      .limit(1),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <Link href="/pickem" className="text-sm text-fg-muted hover:text-fg">
        ← Pick&apos;em
      </Link>

      {lastLocked ? <Results prop={lastLocked} /> : null}

      <h1 className="mt-4 font-display text-3xl font-semibold text-fg uppercase">Week {week} prop</h1>
      <p className="mb-8 text-fg-muted">
        {firstKickoff ? `First kickoff ${formatEastern(firstKickoff)}.` : "Couldn't load this week's kickoff time."}
      </p>

      {existing ? (
        <ExistingProp prop={existing} />
      ) : (
        <NewPropForm season={season} week={week} firstKickoff={firstKickoff} simulated={simulated} />
      )}
    </div>
  );
}

async function NewPropForm({
  season,
  week,
  firstKickoff,
  simulated,
}: {
  season: number;
  week: number;
  firstKickoff: Date | null;
  simulated?: ProjectedTotals;
}) {
  const [matchups, teams, projected] = await Promise.all([
    getRedraftMatchups(week),
    getRedraftTeams(),
    simulated ?? getProjectedTotals(season, week),
  ]);
  const defaultLock = firstKickoff ? new Date(firstKickoff.getTime() - LOCK_BEFORE_KICKOFF_MS) : null;
  const team = (rosterId: number, name: string) => {
    const points = projected.ok ? projected.totals.get(rosterId) : undefined;
    return { rosterId, name, projected: points === undefined ? null : Math.round(points * 10) / 10 };
  };

  return (
    <CreatePropForm
      matchups={matchups.map((m) => ({
        id: m.matchupId,
        a: team(m.a.rosterId, m.a.teamName),
        b: team(m.b.rosterId, m.b.teamName),
      }))}
      teams={[...teams.values()]
        .map((t) => team(t.rosterId, t.teamName))
        .sort((x, y) => x.name.localeCompare(y.name))}
      defaultLockIso={defaultLock?.toISOString() ?? null}
      projectionsProblem={
        projected.ok
          ? null
          : projected.kind === "changed"
            ? { kind: "changed", summary: projected.summary, reason: projected.reason, week }
            : { kind: "unavailable" }
      }
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
      {!locked && p.status === "open" ? <SharePost propId={p.id} kind="announcement" /> : null}
      {!locked && p.status === "open" ? <DeletePropButton propId={p.id} votes={votes} /> : null}
    </div>
  );
}

function Results({ prop: p }: { prop: typeof prop.$inferSelect }) {
  const graded = p.status === "graded";
  const label = (key: string) => p.options.find((o) => o.key === key)?.label ?? key;
  const status = graded
    ? p.result?.push
      ? "Push — landed exactly on the line, every voter was paid."
      : `Winner: ${p.result?.winningOptions.map(label).join(" & ")}`
    : "Grades automatically once every NFL game this week is final (checked daily at 10 AM ET).";

  return (
    <section className="mt-4 mb-10 space-y-3 rounded-lg border border-navy-600 bg-navy-800 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-fg uppercase">Week {p.week} results</h2>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
            graded ? "bg-gold-500 text-navy-950" : "bg-orange-500 text-navy-950"
          }`}
        >
          {graded ? "Graded" : "Ungraded"}
        </span>
      </div>
      <p className="text-sm text-fg">{p.question}</p>
      <p className="text-sm text-fg-muted">{status}</p>
      {p.result?.note ? <p className="text-xs text-fg-subtle">Note: {p.result.note}</p> : null}
      <GradeControls propId={p.id} graded={graded} options={p.options} />
      {graded ? <SharePost propId={p.id} kind="recap" /> : null}
    </section>
  );
}
