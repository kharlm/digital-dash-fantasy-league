"use client";

import { useState } from "react";

import { formatEastern } from "@/lib/pickem/format";

export type ProjectionsProblem =
  | { kind: "unavailable" }
  | { kind: "changed"; summary: string; reason: string; week: number };

/**
 * Shown on the admin form when Sleeper's (unofficial) projections fail.
 * A temporary outage gets a quiet note; a changed API gets a warning with a
 * ready-to-send message, so the commissioner can tell Kharl exactly what
 * broke without having to describe it.
 */
export function ProjectionsWarning({ problem }: { problem: ProjectionsProblem }) {
  const [copied, setCopied] = useState(false);

  if (problem.kind === "unavailable") {
    return (
      <p className="rounded-lg border border-navy-600 bg-navy-900 px-4 py-3 text-sm text-fg-muted">
        Sleeper projections aren&apos;t loading right now, so lines aren&apos;t suggested. Refresh in a bit, or enter
        them yourself.
      </p>
    );
  }

  async function copy() {
    if (problem.kind !== "changed") return;
    const message = [
      "Hey Kharl — Pick'em line suggestions broke on the admin page.",
      `What happened: ${problem.summary}`,
      `When: Week ${problem.week}, ${formatEastern(new Date())}`,
      `Technical: ${problem.reason}`,
    ].join("\n");
    await navigator.clipboard.writeText(message);
    setCopied(true);
  }

  return (
    <div role="alert" className="rounded-lg border border-orange-500/60 bg-orange-500/10 px-4 py-3 text-sm">
      <p className="font-semibold text-orange-400">⚠ Sleeper projections stopped working</p>
      <p className="mt-1 text-fg">{problem.summary}</p>
      <p className="mt-1 text-fg-muted">
        Line suggestions are off until Kharl fixes it — check the Sleeper app for the projections and type the
        lines in yourself. Everything else on this page still works.
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 rounded-lg bg-orange-500 px-3 py-2 font-semibold text-navy-950 transition-colors hover:bg-orange-400"
      >
        {copied ? "Copied — paste it to Kharl" : "Copy message for Kharl"}
      </button>
    </div>
  );
}
