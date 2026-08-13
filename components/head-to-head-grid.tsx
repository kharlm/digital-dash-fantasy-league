import { Fragment } from "react";
import Link from "next/link";

import type { LeagueType } from "@/config/leagues";
import { computeHeadToHeadGrid, getHeadToHeadCell, pairSlug } from "@/lib/data/head-to-head";
import type { LeagueSnapshot } from "@/lib/sleeper/snapshot-types";

export function HeadToHeadGrid({ snapshot, league }: { snapshot: LeagueSnapshot; league: LeagueType }) {
  const grid = computeHeadToHeadGrid(snapshot);

  if (grid.managers.length === 0) {
    return <p className="text-fg-muted">No head-to-head games recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-navy-600">
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: `10rem repeat(${grid.managers.length}, 6rem)` }}
      >
        <div className="sticky left-0 z-10 border-b border-navy-600 bg-navy-900" />
        {grid.managers.map((m) => (
          <div
            key={m.ownerId}
            className="truncate border-b border-navy-600 bg-navy-900 px-2 py-2 text-center text-xs font-medium text-fg-muted"
          >
            {m.teamName}
          </div>
        ))}

        {grid.managers.map((rowManager) => (
          <Fragment key={rowManager.ownerId}>
            <div className="sticky left-0 z-10 truncate border-b border-navy-600 bg-navy-900 px-2 py-2 text-xs font-medium text-fg-muted">
              {rowManager.teamName}
            </div>
            {grid.managers.map((colManager) => {
              if (colManager.ownerId === rowManager.ownerId) {
                return <div key={colManager.ownerId} className="border-b border-navy-600 bg-navy-950" />;
              }

              const cell = getHeadToHeadCell(grid, rowManager.ownerId, colManager.ownerId);
              const hasGames = cell.wins + cell.losses + cell.ties > 0;

              return (
                <div key={colManager.ownerId} className="border-b border-navy-600 px-2 py-2 text-center text-xs">
                  {hasGames ? (
                    <Link
                      href={`/${league}/head-to-head/${pairSlug(rowManager.ownerId, colManager.ownerId)}`}
                      className="text-fg transition-colors hover:text-gold-400"
                    >
                      {cell.wins}-{cell.losses}
                      {cell.ties > 0 ? `-${cell.ties}` : ""}
                    </Link>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
