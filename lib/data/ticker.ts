import { LEAGUE_TYPES, LEAGUES } from "@/config/leagues";
import { computeManagerTrends, getCompletedSeasons, getLeagueSnapshot } from "@/lib/data/standings";

export interface TickerItem {
  id: string;
  text: string;
}

const DRAFT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

/**
 * "Static content for now" per Phase 3, but built from the same real
 * snapshot data every other page reads rather than placeholder copy — so
 * this reads correctly the moment a season closes out, and Phase 7 only has
 * to append AI-written items to this list rather than replace it.
 */
export function getTickerItems(): TickerItem[] {
  const items: TickerItem[] = [];

  for (const type of LEAGUE_TYPES) {
    const league = LEAGUES[type];
    const snapshot = getLeagueSnapshot(type);
    const completedSeasons = getCompletedSeasons(snapshot);
    const latestSeason = completedSeasons[completedSeasons.length - 1];
    const champion = latestSeason?.teams.find((team) => team.finish === 1);

    if (latestSeason && champion) {
      items.push({
        id: `${type}-champion`,
        text: `${latestSeason.season} ${league.name} Champion: ${champion.teamName}`,
      });
    }

    const [winsLeader] = computeManagerTrends(snapshot);
    if (winsLeader) {
      items.push({
        id: `${type}-wins-leader`,
        text: `${league.name} All-Time Wins Leader: ${winsLeader.teamName} (${winsLeader.wins}-${winsLeader.losses})`,
      });
    }

    items.push({
      id: `${type}-draft`,
      text: `${league.name} Draft — ${DRAFT_DATE_FORMAT.format(new Date(league.draftTime))}`,
    });
  }

  return items;
}
