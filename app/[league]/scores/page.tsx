import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { LiveScoreboard } from "@/components/live-scoreboard";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function ScoresPage(props: PageProps<"/[league]/scores">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} Scores
        </h1>
        <p className="text-fg-muted">Updates automatically while games are in progress.</p>
      </div>
      <LiveScoreboard league={league} />
    </div>
  );
}
