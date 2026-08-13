import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManagerTrend } from "@/lib/sleeper/snapshot-types";

export function TrendsTable({ trends }: { trends: ManagerTrend[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Manager</TableHead>
          <TableHead className="text-right">Seasons</TableHead>
          <TableHead className="text-right">Record</TableHead>
          <TableHead className="text-right">Avg Finish</TableHead>
          <TableHead className="text-right">Best</TableHead>
          <TableHead className="text-right">Worst</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trends.map((trend) => (
          <TableRow key={trend.ownerId}>
            <TableCell className="font-medium text-fg">{trend.teamName}</TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {trend.seasonsPlayed}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {trend.wins}-{trend.losses}
              {trend.ties > 0 ? `-${trend.ties}` : ""}
            </TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {trend.avgFinish?.toFixed(1) ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {trend.bestFinish ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums text-fg-muted">
              {trend.worstFinish ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
