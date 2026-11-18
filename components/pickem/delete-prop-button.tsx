"use client";

import { useState, useTransition } from "react";

import { deleteOpenProp } from "@/app/pickem/admin/actions";

/** Two taps (delete, then confirm) so a stray tap can't wipe out everyone's votes. */
export function DeletePropButton({ propId, votes }: { propId: number; votes: number }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2 border-t border-navy-600 pt-4">
      {armed ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteOpenProp(propId);
                if (result.error) setError(result.error);
              })
            }
            className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
          >
            {pending ? "Deleting…" : `Yes, delete it${votes ? ` and its ${votes} vote${votes === 1 ? "" : "s"}` : ""}`}
          </button>
          <button type="button" onClick={() => setArmed(false)} className="text-sm text-fg-muted hover:text-fg">
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setArmed(true)} className="text-sm text-red-400 hover:text-red-300">
          Delete this prop
        </button>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
