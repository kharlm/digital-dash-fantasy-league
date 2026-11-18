"use client";

import { useState, useTransition } from "react";

import { claimTeam } from "@/app/pickem/actions";

type Team = { id: string; name: string; teamName: string | null; taken: boolean };

/** Tap a team to select it, then confirm — a mis-tap shouldn't lock in someone else's team. */
export function ClaimTeamList({ teams }: { teams: Team[] }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirmClaim() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await claimTeam(selected.id);
      // A successful claim redirects; only failures come back here.
      if (result?.error) {
        setError(result.error);
        setSelected(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {teams.map((team) => {
          const isSelected = selected?.id === team.id;
          return (
            <li key={team.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={team.taken || pending}
                onClick={() => setSelected(team)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-navy-800 px-4 py-3 text-left transition-colors enabled:hover:border-gold-500 disabled:opacity-40 ${
                  isSelected ? "border-gold-500" : "border-navy-600"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold text-fg uppercase">{team.name}</span>
                  {team.teamName ? (
                    <span className="block truncate text-sm text-fg-muted">{team.teamName}</span>
                  ) : null}
                </span>
                {team.taken ? (
                  <span className="shrink-0 text-xs font-medium text-fg-subtle uppercase">Taken</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {selected ? (
        <button
          type="button"
          onClick={confirmClaim}
          disabled={pending}
          className="sticky bottom-14 w-full rounded-lg bg-gold-500 px-4 py-3 font-semibold text-navy-950 shadow-lg transition-colors hover:bg-gold-400 disabled:opacity-50"
        >
          {pending ? "Claiming…" : `I'm ${selected.name} — claim this team`}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
