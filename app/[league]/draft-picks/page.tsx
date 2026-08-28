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
                <TableHead className="w-16">Round</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownership
                .filter((p) => p.season === season)
                .map((p) => (
                  <TableRow key={`${p.season}-${p.round}-${p.originalTeam}`}>
                    <TableCell className="text-fg-subtle">{p.round}</TableCell>
                    <TableCell>
                      <span className={p.traded ? "font-medium text-gold-400" : "text-fg"}>{p.currentOwner}</span>
                      {p.traded ? (
                        <span className="ml-2 text-xs text-fg-subtle">from {p.originalTeam}</span>
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
