"use client";

import { useActionState, useState, useSyncExternalStore } from "react";

import { createProp, type CreatePropState } from "@/app/pickem/admin/actions";
import type { PropType } from "@/lib/db/schema";
import { PROP_TYPE_LABELS } from "@/lib/pickem/props";

type Team = { rosterId: number; name: string };
type Matchup = { id: number; a: Team; b: Team };

type Props = { matchups: Matchup[]; teams: Team[]; defaultLockIso: string | null };

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

export function CreatePropForm({ matchups, teams, defaultLockIso }: Props) {
  const [state, action, pending] = useActionState<CreatePropState, FormData>(createProp, {});
  const [type, setType] = useState<PropType>("spread");
  const [matchupId, setMatchupId] = useState<number | null>(matchups[0]?.id ?? null);
  const [editedLock, setEditedLock] = useState<string | null>(null);

  // datetime-local needs the viewer's timezone, which only the browser knows:
  // the server renders it empty, the browser fills in the default.
  const inBrowser = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const lockLocal = editedLock ?? (inBrowser && defaultLockIso ? toLocalInput(defaultLockIso) : "");

  const matchup = matchups.find((m) => m.id === matchupId);
  const lockIso = lockLocal ? new Date(lockLocal).toISOString() : "";

  return (
    <form action={action} className="space-y-5">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className={label}>Favorite</legend>
            <div className="space-y-2">
              {[matchup.a, matchup.b].map((t, i) => (
                <label key={t.rosterId} className="flex items-center gap-2 text-sm text-fg">
                  <input type="radio" name="favorite" value={t.rosterId} defaultChecked={i === 0} className="accent-gold-500" />
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="line" className={label}>
              Line (points)
            </label>
            <input id="line" name="line" type="number" inputMode="decimal" step="0.5" min="0.5" required placeholder="10" className={field} />
          </div>
        </div>
      ) : null}

      {type === "team_total" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="team" className={label}>
              Team
            </label>
            <select id="team" name="team" className={field}>
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
            <input id="line" name="line" type="number" inputMode="decimal" step="0.5" min="0.5" required placeholder="120.5" className={field} />
          </div>
        </div>
      ) : null}

      {type === "top_scorer" ? (
        <p className="text-sm text-fg-muted">Everyone picks one of the 10 teams. Highest score of the week wins.</p>
      ) : null}

      {type === "custom" ? (
        <>
          <div>
            <label htmlFor="question" className={label}>
              Question
            </label>
            <input id="question" name="question" required placeholder="Will anyone score 150+ this week?" className={field} />
          </div>
          <div>
            <label htmlFor="options" className={label}>
              Options — one per line
            </label>
            <textarea id="options" name="options" rows={4} required placeholder={"Yes\nNo"} className={field} />
            <p className="mt-1 text-xs text-fg-subtle">Custom props are graded by hand after the week ends.</p>
          </div>
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="payout" className={label}>
            Payout per winner ($)
          </label>
          <input id="payout" name="payout" type="number" inputMode="decimal" step="0.5" min="0.5" defaultValue="1" required className={field} />
        </div>
        {type === "spread" ? (
          <div>
            <label htmlFor="pushPayout" className={label}>
              Push payout to everyone ($)
            </label>
            <input id="pushPayout" name="pushPayout" type="number" inputMode="decimal" step="0.5" min="0" defaultValue="2" required className={field} />
          </div>
        ) : null}
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
