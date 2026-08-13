import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { getCurrentSeason, getLeagueSnapshot } from "@/lib/data/standings";
import { StandingsTable } from "@/components/standings-table";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function StandingsPage(props: PageProps<"/[league]/standings">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  const snapshot = getLeagueSnapshot(league);
  const season = getCurrentSeason(snapshot);
  const statusLabel = season.status.replace("_", " ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name}
        </h1>
        <p className="text-fg-muted capitalize">
          {season.season} season · {statusLabel}
        </p>
      </div>
      <StandingsTable teams={season.teams} />
    </div>
  );
}
