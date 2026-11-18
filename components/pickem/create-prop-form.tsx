"use client";

import { useActionState, useState, useSyncExternalStore } from "react";

import { createProp, type CreatePropState } from "@/app/pickem/admin/actions";
import type { PropType } from "@/lib/db/schema";
import { ProjectionsWarning, type ProjectionsProblem } from "@/components/pickem/projections-warning";
import { PROP_TYPE_LABELS, suggestLine } from "@/lib/pickem/props";

/** `projected` is Sleeper's projected total for the week, when it loaded. */
type Team = { rosterId: number; name: string; projected: number | null };
type Matchup = { id: number; a: Team; b: Team };

type Props = {
  matchups: Matchup[];
  teams: Team[];
  defaultLockIso: string | null;
  /** Set when Sleeper's (unofficial) projections failed. */
  projectionsProblem: ProjectionsProblem | null;
};

const field =
  "w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2.5 text-fg placeholder:text-fg-subtle focus:border-gold-500 focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-fg-muted";

/** ISO instant -> "YYYY-MM-DDTHH:mm" in the browser's own timezone, which is what datetime-local shows. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const subscribeNoop = () => () => {};

export function CreatePropForm({ matchups, teams, defaultLockIso, projectionsProblem }: Props) {
  const [state, action, pending] = useActionState<CreatePropState, FormData>(createProp, {});
  const [type, setType] = useState<PropType>("spread");
  const [matchupId, setMatchupId] = useState<number | null>(matchups[0]?.id ?? null);
  const [teamId, setTeamId] = useState<number | null>(teams[0]?.rosterId ?? null);
  const [editedLock, setEditedLock] = useState<string | null>(null);

  // datetime-local needs the viewer's timezone, which only the browser knows:
  // the server renders it empty, the browser fills in the default.
  const inBrowser = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const lockLocal = editedLock ?? (inBrowser && defaultLockIso ? toLocalInput(defaultLockIso) : "");

  const matchup = matchups.find((m) => m.id === matchupId);
  const totalTeam = teams.find((t) => t.rosterId === teamId);

  // Suggested spread: the higher projection is the favorite, the gap is the
  // line. Only when both sides projected; otherwise the fields start blank.
  const spread =
    matchup && matchup.a.projected !== null && matchup.b.projected !== null
      ? matchup.a.projected >= matchup.b.projected
        ? { favorite: matchup.a.rosterId, line: suggestLine(matchup.a.projected - matchup.b.projected) }
        : { favorite: matchup.b.rosterId, line: suggestLine(matchup.b.projected - matchup.a.projected) }
      : null;
  // Only suggest a league line when every team has a projection — a partial
  // sum would come out hundreds of points low.
  const leagueProjected = teams.length > 0 && teams.every((t) => t.projected !== null)
    ? teams.reduce((sum, t) => sum + (t.projected ?? 0), 0)
    : null;
  const lockIso = lockLocal ? new Date(lockLocal).toISOString() : "";

  return (
    <form action={action} className="space-y-5">
      {projectionsProblem ? <ProjectionsWarning problem={projectionsProblem} /> : null}

      <div>
        <label htmlFor="type" className={label}>
          Prop type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PropType)}
          className={field}
        >
          {(Object.keys(PROP_TYPE_LABELS) as PropType[]).map((t) => (
            <option key={t} value={t}>
              {PROP_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {type === "spread" || type === "straight_up" ? (
        <div>
          <label htmlFor="matchup" className={label}>
            Matchup
          </label>
          <select
            id="matchup"
            name="matchup"
            value={matchupId ?? ""}
            onChange={(e) => setMatchupId(Number(e.target.value))}
            className={field}
          >
            {matchups.map((m) => (
              <option key={m.id} value={m.id}>
                {m.a.name} vs. {m.b.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {type === "spread" && matchup ? (
        <div key={matchup.id} className="grid gap-4 sm:grid-cols-2">
          {spread ? (
            <p className="text-sm text-fg-muted sm:col-span-2">
              Sleeper projects {matchup.a.name} {matchup.a.projected?.toFixed(1)} – {matchup.b.name}{" "}
              {matchup.b.projected?.toFixed(1)}
            </p>
          ) : null}
          <fieldset>
            <legend className={label}>Favorite</legend>
            <div className="space-y-2">
              {[matchup.a, matchup.b].map((t, i) => (
                <label key={t.rosterId} className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="radio"
                    name="favorite"
                    value={t.rosterId}
                    defaultChecked={spread ? t.rosterId === spread.favorite : i === 0}
                    className="accent-gold-500"
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="line" className={label}>
              Line (points)
            </label>
            <input
              id="line"
              name="line"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0.5"
              required
              defaultValue={spread?.line}
              placeholder="10"
              className={field}
            />
          </div>
        </div>
      ) : null}

      {type === "team_total" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="team" className={label}>
              Team
            </label>
            <select
              id="team"
              name="team"
              value={teamId ?? ""}
              onChange={(e) => setTeamId(Number(e.target.value))}
              className={field}
            >
              {teams.map((t) => (
                <option key={t.rosterId} value={t.rosterId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="line" className={label}>
              Line (points)
            </label>
            <input
              key={teamId}
              id="line"
              name="line"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0.5"
              required
              defaultValue={totalTeam?.projected != null ? suggestLine(totalTeam.projected) : undefined}
              placeholder="120.5"
              className={field}
            />
            {totalTeam?.projected != null ? (
              <p className="mt-1 text-xs text-fg-subtle">Sleeper projects {totalTeam.projected.toFixed(1)}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {type === "league_total" ? (
        <div>
          <label htmlFor="line" className={label}>
            Line (all {teams.length} teams combined)
          </label>
          <input
            id="line"
            name="line"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0.5"
            required
            defaultValue={leagueProjected !== null ? suggestLine(leagueProjected) : undefined}
            placeholder="1200"
            className={field}
          />
          {leagueProjected !== null ? (
            <p className="mt-1 text-xs text-fg-subtle">Sleeper projects {leagueProjected.toFixed(1)} combined</p>
          ) : null}
        </div>
      ) : null}

      {type === "top_scorer" ? (
        <p className="text-sm text-fg-muted">Everyone picks one of the 10 teams. Highest score of the week wins.</p>
      ) : null}

      <div>
        <label htmlFor="payout" className={label}>
          Payout per winner ($)
        </label>
        <input id="payout" name="payout" type="number" inputMode="decimal" step="0.5" min="0.5" defaultValue="1" required className={field} />
      </div>

      <div>
        <label htmlFor="lockLocal" className={label}>
          Voting locks
        </label>
        <input
          id="lockLocal"
          type="datetime-local"
          required
          value={lockLocal}
          onChange={(e) => setEditedLock(e.target.value)}
          className={field}
        />
        <input type="hidden" name="locksAt" value={lockIso} />
        <p className="mt-1 text-xs text-fg-subtle">Defaults to 5 minutes before the week&apos;s first kickoff.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold-500 px-4 py-3 font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Posting…" : "Post prop"}
      </button>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
