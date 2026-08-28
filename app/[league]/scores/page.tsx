import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { ChampionReveal } from "@/components/champion-reveal";
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
      {/* Rendered as part of the static page shell, not inside LiveScoreboard —
          it doesn't depend on the live-scores fetch, so it shouldn't wait on
          (or disappear because of) that fetch's loading/error state. */}
      <ChampionReveal />
      <LiveScoreboard league={league} />
    </div>
  );
}
