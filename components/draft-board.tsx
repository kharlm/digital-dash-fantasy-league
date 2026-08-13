import { Fragment } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { getTeamByRosterId } from "@/lib/data/standings";
import type { SnapshotDraft, SnapshotSeason, SnapshotTeam } from "@/lib/sleeper/snapshot-types";

export function DraftBoard({ draft, season }: { draft: SnapshotDraft; season: SnapshotSeason }) {
  if (draft.picks.length === 0) {
    return <p className="text-fg-muted">This draft hasn&apos;t happened yet.</p>;
  }

  // Auction "rounds" count each roster's own pick number, not a shared
  // board round (pick 1 for every team is "round 1" regardless of when
  // they actually nominated) — a round x slot grid would be meaningless
  // here, so auctions get a flat, pick-order list instead.
  if (draft.type === "auction") {
    return <AuctionTable draft={draft} season={season} />;
  }

  return <SnakeGrid draft={draft} season={season} />;
}

function AuctionTable({ draft, season }: { draft: SnapshotDraft; season: SnapshotSeason }) {
  const picks = [...draft.picks].sort((a, b) => a.pickNo - b.pickNo);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead>Pos</TableHead>
          <TableHead>NFL</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {picks.map((pick) => {
          const team = getTeamByRosterId(season, pick.rosterId);
          return (
            <TableRow key={pick.pickNo}>
              <TableCell className="text-fg-subtle">{pick.pickNo}</TableCell>
              <TableCell className="font-medium text-fg">{pick.playerName}</TableCell>
              <TableCell className="text-fg-muted">{pick.position}</TableCell>
              <TableCell className="text-fg-muted">{pick.nflTeam}</TableCell>
              <TableCell className="text-fg-muted">{team?.teamName ?? "Unknown"}</TableCell>
              <TableCell className="text-right tabular-nums text-gold-400">
                {pick.amount != null ? formatMoney(pick.amount) : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function buildSlotOrder(
  season: SnapshotSeason,
  draftOrder: Record<string, number> | null,
): Array<{ slot: number; team: SnapshotTeam | undefined }> {
  if (!draftOrder) return [];
  return Object.entries(draftOrder)
    .map(([ownerId, slot]) => ({ slot, team: season.teams.find((t) => t.ownerId === ownerId) }))
    .sort((a, b) => a.slot - b.slot);
}

function SnakeGrid({ draft, season }: { draft: SnapshotDraft; season: SnapshotSeason }) {
  const slots = buildSlotOrder(season, draft.draftOrder);
  const pickByCell = new Map(draft.picks.map((p) => [`${p.round}-${p.draftSlot}`, p]));
  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1);

  if (slots.length === 0) {
    return <p className="text-fg-muted">Draft order unavailable for this season.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-navy-600">
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: `3rem repeat(${slots.length}, 9rem)` }}
      >
        <div className="sticky left-0 z-10 border-b border-navy-600 bg-navy-900" />
        {slots.map(({ slot, team }) => (
          <div
            key={slot}
            className="truncate border-b border-navy-600 bg-navy-900 px-2 py-2 text-xs font-medium text-fg-muted"
          >
            {team?.teamName ?? `Slot ${slot}`}
          </div>
        ))}

        {rounds.map((round) => (
          <Fragment key={round}>
            <div className="sticky left-0 z-10 flex items-center justify-center border-b border-navy-600 bg-navy-900 text-xs text-fg-subtle">
              {round}
            </div>
            {slots.map(({ slot }) => {
              const pick = pickByCell.get(`${round}-${slot}`);
              return (
                <div key={slot} className="border-b border-navy-600 px-2 py-2 text-xs">
                  {pick ? (
                    <>
                      <div className="truncate font-medium text-fg">{pick.playerName}</div>
                      <div className="text-fg-subtle">
                        {pick.position} · {pick.nflTeam}
                      </div>
                    </>
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
