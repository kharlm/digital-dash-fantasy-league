import type { SeasonHighlight } from "@/lib/data/records";

function HighlightList({ entries, tone }: { entries: SeasonHighlight[]; tone: "fame" | "shame" }) {
  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => (
        <li
          key={`${entry.ownerId}-${entry.season}`}
          className="flex items-center justify-between gap-3 rounded-lg bg-navy-800 px-4 py-3 ring-1 ring-navy-600"
        >
          <div className="flex items-center gap-3">
            <span
              className={`font-display text-lg font-semibold ${
                tone === "fame" ? "text-gold-400" : "text-fg-subtle"
              }`}
            >
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-fg">{entry.teamName}</p>
              <p className="text-xs text-fg-muted">{entry.season} season</p>
            </div>
          </div>
          <p className="text-right text-sm tabular-nums text-fg-muted">
            {entry.wins}-{entry.losses} · {entry.pointsFor.toFixed(1)} pts
          </p>
        </li>
      ))}
    </ol>
  );
}

export function HallOfFame({ fame, shame }: { fame: SeasonHighlight[]; shame: SeasonHighlight[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide text-gold-400 uppercase">Hall of Fame</h3>
        <HighlightList entries={fame} tone="fame" />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide text-fg-subtle uppercase">Hall of Shame</h3>
        <HighlightList entries={shame} tone="shame" />
      </div>
    </div>
  );
}
