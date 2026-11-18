"use client";

import { useOptimistic, useState, useTransition } from "react";

import { castVote } from "@/app/pickem/actions";

type Option = { key: string; label: string; voters: string[] };

type Props = {
  propId: number;
  locked: boolean;
  myVote: string | null;
  options: Option[];
  /** Once graded: the winning option keys (empty on a push). */
  winners: string[] | null;
};

/**
 * One big tappable button per option, showing who's on each side (votes are
 * public, like the WhatsApp poll). The viewer's pick updates optimistically
 * so a tap feels instant; the server action then revalidates the page with
 * the real counts.
 */
export function VotePanel({ propId, locked, myVote, options, winners }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimisticVote, setOptimisticVote] = useOptimistic(myVote);
  const [error, setError] = useState<string | null>(null);

  function pick(key: string) {
    if (locked || key === optimisticVote) return;
    setError(null);
    startTransition(async () => {
      setOptimisticVote(key);
      const result = await castVote(propId, key);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-5 space-y-3">
      {options.map((o) => {
        const mine = optimisticVote === o.key;
        const won = winners?.includes(o.key) ?? false;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => pick(o.key)}
            disabled={locked}
            aria-pressed={mine}
            className={`block w-full rounded-lg border px-4 py-3 text-left transition-colors ${
              won ? "border-emerald-500 bg-emerald-500/10" : mine ? "border-gold-500 bg-gold-500/10" : "border-navy-600 bg-navy-900"
            } ${locked ? "cursor-default" : "hover:border-gold-500"}`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-medium text-fg">{o.label}</span>
              <span className="shrink-0 font-display text-lg font-semibold text-fg">{o.voters.length}</span>
            </span>
            {o.voters.length > 0 ? (
              <span className="mt-1 block text-xs text-fg-muted">{o.voters.join(", ")}</span>
            ) : null}
            {won ? (
              <span className="mt-1 mr-3 inline-block text-xs font-semibold text-emerald-400 uppercase">Winner</span>
            ) : null}
            {mine ? (
              <span className="mt-1 inline-block text-xs font-semibold text-gold-400 uppercase">
                {pending ? "Saving…" : "Your pick"}
              </span>
            ) : null}
          </button>
        );
      })}
      {!locked ? (
        <p className="text-xs text-fg-subtle">You can change your pick until voting locks.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
