import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SnapshotTeam } from "@/lib/sleeper/snapshot-types";

export function StandingsTable({ teams }: { teams: SnapshotTeam[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Record</TableHead>
          <TableHead className="text-right">PF</TableHead>
          <TableHead className="text-right">PA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team, index) => (
          <TableRow key={team.rosterId}>
            <TableCell className="text-fg-subtle">{team.finish ?? index + 1}</TableCell>
            <TableCell className="font-medium text-fg">{team.teamName}</TableCell>
            <TableCell className="text-right tabular-nums">
              {team.wins}-{team.losses}
              {team.ties > 0 ? `-${team.ties}` : ""}
            </TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {team.pointsFor.toFixed(1)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {team.pointsAgainst.toFixed(1)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
