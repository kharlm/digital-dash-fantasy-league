"use client";

import { useState, useTransition } from "react";

import { gradeByHand, gradeNow, regradeFromSleeper, type GradeActionState } from "@/app/pickem/admin/actions";

type Props = {
  propId: number;
  graded: boolean;
  options: { key: string; label: string }[];
};

/**
 * Admin grading for a locked prop:
 *  - ungraded: "Grade now" (same as the daily cron)
 *  - graded: override — re-pull Sleeper's scores (stat corrections), or set
 *    the winner(s) by hand with a note. Either replaces the payouts.
 */
export function GradeControls({ propId, graded, options }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<GradeActionState>({});
  const [overriding, setOverriding] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const run = (action: () => Promise<GradeActionState>) =>
    startTransition(async () => {
      setState({});
      const result = await action();
      setState(result);
      if (result.message) setOverriding(false);
    });

  const toggle = (key: string) =>
    setWinners((w) => (w.includes(key) ? w.filter((k) => k !== key) : [...w, key]));

  const showPicker = overriding;
  const button =
    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <div className="space-y-3 border-t border-navy-600 pt-4">
      {!graded ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => gradeNow(propId))}
          className={`${button} bg-gold-500 text-navy-950 hover:bg-gold-400`}
        >
          {pending ? "Grading…" : "Grade now"}
        </button>
      ) : null}

      {graded && !overriding ? (
        <button type="button" onClick={() => setOverriding(true)} className="text-sm text-fg-muted hover:text-fg">
          Override result…
        </button>
      ) : null}

      {overriding ? (
        <div className="space-y-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => regradeFromSleeper(propId))}
            className={`${button} border border-navy-600 text-fg hover:border-gold-500`}
          >
            Re-grade with Sleeper&apos;s latest scores
          </button>
          <p className="text-xs text-fg-subtle">For stat corrections. Or set the winner yourself below.</p>
        </div>
      ) : null}

      {showPicker ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-fg-muted">
            Set the winner(s) by hand
          </legend>
          {options.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={winners.includes(o.key)}
                onChange={() => toggle(o.key)}
                className="accent-gold-500"
              />
              {o.label}
            </label>
          ))}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional) — e.g. stat correction"
            className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-gold-500 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || winners.length === 0}
              onClick={() => run(() => gradeByHand(propId, winners, note))}
              className={`${button} bg-gold-500 text-navy-950 hover:bg-gold-400`}
            >
              {pending ? "Saving…" : "Save result & pay winners"}
            </button>
            {overriding ? (
              <button type="button" onClick={() => setOverriding(false)} className="text-sm text-fg-muted hover:text-fg">
                Cancel
              </button>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : state.message ? (
        <p className="text-sm text-gold-400">{state.message}</p>
      ) : null}
    </div>
  );
}
