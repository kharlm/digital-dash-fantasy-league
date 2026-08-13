import { notFound } from "next/navigation";

import { LEAGUE_TYPES, LEAGUES, isLeagueType } from "@/config/leagues";
import { computeHallOfFameAndShame, computePowerRankings, computeRecordBook } from "@/lib/data/records";
import { getCompletedSeasons, getLeagueSnapshot } from "@/lib/data/standings";
import { HallOfFame } from "@/components/hall-of-fame";
import { PowerRankingsTable } from "@/components/power-rankings-table";
import { StatTile } from "@/components/stat-tile";
import { TrophyRoom } from "@/components/trophy-room";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function RecordsPage(props: PageProps<"/[league]/records">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  const snapshot = getLeagueSnapshot(league);
  const completedSeasons = getCompletedSeasons(snapshot);

  if (completedSeasons.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} Records
        </h1>
        <p className="text-fg-muted">No completed seasons yet — check back once this one wraps.</p>
      </div>
    );
  }

  const recordBook = computeRecordBook(snapshot);
  const { fame, shame } = computeHallOfFameAndShame(snapshot);
  const latestSeason = completedSeasons[completedSeasons.length - 1];
  const powerRankings = computePowerRankings(latestSeason);

  return (
    <div className="space-y-12">
      <h1 className="font-display text-3xl font-semibold text-fg uppercase">
        {LEAGUES[league].name} Records
      </h1>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg uppercase">Trophy Room</h2>
        <TrophyRoom snapshot={snapshot} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg uppercase">Record Book</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recordBook.highestScore ? (
            <StatTile
              label="Highest Single Score"
              value={recordBook.highestScore.points.toFixed(1)}
              detail={`${recordBook.highestScore.teamName} · ${recordBook.highestScore.season} Wk ${recordBook.highestScore.week}`}
            />
          ) : null}
          {recordBook.biggestBlowout ? (
            <StatTile
              label="Biggest Blowout"
              value={`+${(recordBook.biggestBlowout.points - recordBook.biggestBlowout.opponentPoints).toFixed(1)}`}
              detail={`${recordBook.biggestBlowout.teamName} over ${recordBook.biggestBlowout.opponentTeamName} · ${recordBook.biggestBlowout.season} Wk ${recordBook.biggestBlowout.week}`}
            />
          ) : null}
          {recordBook.closestGame ? (
            <StatTile
              label="Closest Game"
              value={Math.abs(recordBook.closestGame.points - recordBook.closestGame.opponentPoints).toFixed(1)}
              detail={`${recordBook.closestGame.teamName} vs ${recordBook.closestGame.opponentTeamName} · ${recordBook.closestGame.season} Wk ${recordBook.closestGame.week}`}
            />
          ) : null}
          {recordBook.longestWinStreak ? (
            <StatTile
              label="Longest Win Streak"
              value={`${recordBook.longestWinStreak.length}`}
              detail={`${recordBook.longestWinStreak.teamName} · ${recordBook.longestWinStreak.startSeason} Wk ${recordBook.longestWinStreak.startWeek}${
                recordBook.longestWinStreak.endSeason === recordBook.longestWinStreak.startSeason
                  ? ` – Wk ${recordBook.longestWinStreak.endWeek}`
                  : ` – ${recordBook.longestWinStreak.endSeason} Wk ${recordBook.longestWinStreak.endWeek}`
              }`}
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg uppercase">Hall of Fame &amp; Shame</h2>
        <p className="text-sm text-fg-muted">Best and worst statistical seasons, by regular-season record.</p>
        <HallOfFame fame={fame} shame={shame} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-fg uppercase">
          Power Rankings <span className="text-base font-normal text-fg-subtle">— {latestSeason.season}</span>
        </h2>
        <p className="text-sm text-fg-muted">
          A simple starting formula: wins × 2 − losses + points ÷ 100.
        </p>
        <PowerRankingsTable rankings={powerRankings} />
      </section>
    </div>
  );
}
