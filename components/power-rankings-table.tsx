import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PowerRanking } from "@/lib/data/records";

export function PowerRankingsTable({ rankings }: { rankings: PowerRanking[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Record</TableHead>
          <TableHead className="text-right">PF</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.map((team, index) => (
          <TableRow key={team.ownerId}>
            <TableCell className="text-fg-subtle">{index + 1}</TableCell>
            <TableCell className="font-medium text-fg">{team.teamName}</TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {team.wins}-{team.losses}
            </TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {team.pointsFor.toFixed(1)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-gold-400">
              {team.score.toFixed(1)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
