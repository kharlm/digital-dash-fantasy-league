import { notFound } from "next/navigation";

import { LEAGUES, isLeagueType } from "@/config/leagues";
import { getDraftPickOwnership } from "@/lib/data/draft-picks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function generateStaticParams() {
  // Dynasty-only — see lib/data/draft-picks.ts for why.
  return [{ league: "dynasty" }];
}

export default async function DraftPicksPage(props: PageProps<"/[league]/draft-picks">) {
  const { league } = await props.params;
  if (!isLeagueType(league) || league !== "dynasty") notFound();

  const ownership = await getDraftPickOwnership();
  const seasons = [...new Set(ownership.map((p) => p.season))];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">
          {LEAGUES[league].name} Draft Picks
        </h1>
        <p className="text-fg-muted">
          Who owns each future pick after trades — live from Sleeper, not a manually kept doc.
        </p>
      </div>

      {seasons.map((season) => (
        <section key={season} className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-fg uppercase">{season}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Round</TableHead>
                <TableHead>Original Team</TableHead>
                <TableHead>Current Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownership
                .filter((p) => p.season === season)
                .map((p) => (
                  <TableRow key={`${p.season}-${p.round}-${p.originalTeam}`}>
                    <TableCell className="text-fg-subtle">{p.round}</TableCell>
                    <TableCell className="text-fg-muted">{p.originalTeam}</TableCell>
                    <TableCell className={p.traded ? "font-medium text-gold-400" : "text-fg"}>
                      {p.currentOwner}
                      {p.traded ? (
                        <span className="ml-2 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
                          Traded
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
