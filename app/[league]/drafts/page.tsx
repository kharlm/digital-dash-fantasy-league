import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { getCompletedSeasons, getLeagueSnapshot } from "@/lib/data/standings";
import { DraftBoard } from "@/components/draft-board";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function DraftsPage(props: PageProps<"/[league]/drafts">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  const snapshot = getLeagueSnapshot(league);
  const completedSeasons = [...getCompletedSeasons(snapshot)].reverse(); // newest first

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} Drafts
        </h1>
        <p className="text-fg-muted">Every completed draft, most recent first.</p>
      </div>

      {completedSeasons.length === 0 ? (
        <p className="text-fg-muted">No completed drafts yet.</p>
      ) : (
        completedSeasons.map((season) =>
          season.draft ? (
            <section key={season.leagueId} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-fg uppercase">
                {season.season}{" "}
                <span className="text-sm font-normal tracking-wide text-fg-subtle capitalize">
                  ({season.draft.type})
                </span>
              </h2>
              <DraftBoard draft={season.draft} season={season} />
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
