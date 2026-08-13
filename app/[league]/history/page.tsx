import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { computeManagerTrends, getCompletedSeasons, getLeagueSnapshot } from "@/lib/data/standings";
import { StandingsTable } from "@/components/standings-table";
import { StatTile } from "@/components/stat-tile";
import { TrendsTable } from "@/components/trends-table";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function HistoryPage(props: PageProps<"/[league]/history">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  const snapshot = getLeagueSnapshot(league);
  const completedSeasons = [...getCompletedSeasons(snapshot)].reverse(); // newest first
  const trends = computeManagerTrends(snapshot); // already sorted by wins desc
  const mostLosses = [...trends].sort((a, b) => b.losses - a.losses)[0];
  const mostWins = trends[0];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} History
        </h1>
        <p className="text-fg-muted">
          {completedSeasons.length} completed season{completedSeasons.length === 1 ? "" : "s"} on
          record.
        </p>
      </div>

      {completedSeasons.length === 0 ? (
        <p className="text-fg-muted">No completed seasons yet — check back once this one wraps.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {mostWins ? (
              <StatTile label="Most Wins All-Time" value={String(mostWins.wins)} detail={mostWins.teamName} />
            ) : null}
            {mostLosses ? (
              <StatTile
                label="Most Losses All-Time"
                value={String(mostLosses.losses)}
                detail={mostLosses.teamName}
              />
            ) : null}
          </div>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-fg uppercase">
              All-Time Records
            </h2>
            <TrendsTable trends={trends} />
          </section>

          <section className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-fg uppercase">
              Season by Season
            </h2>
            {completedSeasons.map((season) => (
              <div key={season.leagueId} className="space-y-3">
                <h3 className="text-lg font-semibold text-fg-muted">{season.season}</h3>
                <StandingsTable teams={season.teams} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
