import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { getLeagueSnapshot } from "@/lib/data/standings";
import { HeadToHeadGrid } from "@/components/head-to-head-grid";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function HeadToHeadPage(props: PageProps<"/[league]/head-to-head">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  const snapshot = getLeagueSnapshot(league);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} Head-to-Head
        </h1>
        <p className="text-fg-muted">
          Every manager&apos;s all-time regular-season record against every other. Click a
          record to see the full game log.
        </p>
      </div>
      <HeadToHeadGrid snapshot={snapshot} league={league} />
    </div>
  );
}
