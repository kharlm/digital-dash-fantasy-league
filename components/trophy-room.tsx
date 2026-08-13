import { Card, CardContent } from "@/components/ui/card";
import { getCompletedSeasons } from "@/lib/data/standings";
import type { LeagueSnapshot } from "@/lib/sleeper/snapshot-types";

export function TrophyRoom({ snapshot }: { snapshot: LeagueSnapshot }) {
  const champions = [...getCompletedSeasons(snapshot)]
    .reverse()
    .map((season) => ({ season: season.season, champion: season.teams.find((t) => t.finish === 1) }))
    .filter((entry): entry is { season: string; champion: NonNullable<typeof entry.champion> } => !!entry.champion);

  if (champions.length === 0) {
    return <p className="text-fg-muted">No champions crowned yet.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {champions.map(({ season, champion }) => (
        <Card key={season} className="text-center ring-gold-500/30">
          <CardContent className="space-y-1">
            <p className="text-xs font-medium tracking-[0.15em] text-fg-subtle uppercase">
              {season} Champion
            </p>
            <p className="font-display text-xl font-semibold text-gold-400">{champion.teamName}</p>
            <p className="text-sm text-fg-muted">
              {champion.wins}-{champion.losses}
              {champion.ties > 0 ? `-${champion.ties}` : ""}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
