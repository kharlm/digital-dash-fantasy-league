import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { getCompletedSeasons, getLeagueSnapshot } from "@/lib/data/standings";
import { Bracket } from "@/components/bracket";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function BracketsPage(props: PageProps<"/[league]/brackets">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  const snapshot = getLeagueSnapshot(league);
  const completedSeasons = [...getCompletedSeasons(snapshot)].reverse(); // newest first

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} Brackets
        </h1>
        <p className="text-fg-muted">Every completed playoff bracket, most recent first.</p>
      </div>

      {completedSeasons.length === 0 ? (
        <p className="text-fg-muted">No completed playoffs yet.</p>
      ) : (
        completedSeasons.map((season) => (
          <section key={season.leagueId} className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-fg uppercase">{season.season}</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-medium tracking-wide text-fg-muted uppercase">Playoffs</h3>
              <Bracket matches={season.winnersBracket} season={season} label="Playoffs" />
            </div>

            {season.losersBracket.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium tracking-wide text-fg-muted uppercase">
                  Consolation
                </h3>
                <Bracket matches={season.losersBracket} season={season} label="Consolation" />
              </div>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
