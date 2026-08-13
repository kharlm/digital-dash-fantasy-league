import Link from "next/link";
import { notFound } from "next/navigation";

import { LEAGUE_TYPES, isLeagueType } from "@/config/leagues";
import {
  computeHeadToHeadGrid,
  getAllRivalryPairs,
  getHeadToHeadCell,
  getRivalryGames,
  pairSlug,
} from "@/lib/data/head-to-head";
import { getLeagueSnapshot } from "@/lib/data/standings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function generateStaticParams() {
  return LEAGUE_TYPES.flatMap((league) => {
    const snapshot = getLeagueSnapshot(league);
    return getAllRivalryPairs(snapshot).map(({ ownerIdA, ownerIdB }) => ({
      league,
      pair: pairSlug(ownerIdA, ownerIdB),
    }));
  });
}

export default async function RivalryPage(props: PageProps<"/[league]/head-to-head/[pair]">) {
  const { league, pair } = await props.params;
  if (!isLeagueType(league)) notFound();

  const [ownerIdA, ownerIdB] = pair.split("_");
  if (!ownerIdA || !ownerIdB) notFound();

  const snapshot = getLeagueSnapshot(league);
  const grid = computeHeadToHeadGrid(snapshot);
  const managerA = grid.managers.find((m) => m.ownerId === ownerIdA);
  const managerB = grid.managers.find((m) => m.ownerId === ownerIdB);
  if (!managerA || !managerB) notFound();

  const record = getHeadToHeadCell(grid, ownerIdA, ownerIdB);
  const games = getRivalryGames(snapshot, ownerIdA, ownerIdB);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${league}/head-to-head`} className="text-sm text-fg-muted hover:text-fg">
          ← Head-to-Head
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-fg uppercase sm:text-3xl">
          {managerA.teamName} vs {managerB.teamName}
        </h1>
        <p className="text-fg-muted">
          {managerA.teamName} leads the all-time series {record.wins}-{record.losses}
          {record.ties > 0 ? `-${record.ties}` : ""}.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead>Week</TableHead>
            <TableHead className="text-right">{managerA.teamName}</TableHead>
            <TableHead className="text-right">{managerB.teamName}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => {
            const aWon = game.pointsA > game.pointsB;
            const bWon = game.pointsB > game.pointsA;
            return (
              <TableRow key={`${game.season}-${game.week}`}>
                <TableCell className="text-fg-muted">{game.season}</TableCell>
                <TableCell className="text-fg-muted">{game.week}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${aWon ? "font-semibold text-gold-400" : "text-fg-muted"}`}
                >
                  {game.pointsA.toFixed(1)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${bWon ? "font-semibold text-gold-400" : "text-fg-muted"}`}
                >
                  {game.pointsB.toFixed(1)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
