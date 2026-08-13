import { notFound } from "next/navigation";

import { LEAGUE_TYPES, isLeagueType } from "@/config/leagues";
import { LeagueNav } from "@/components/league-nav";

export function generateStaticParams() {
  return LEAGUE_TYPES.map((league) => ({ league }));
}

export default async function LeagueLayout(props: LayoutProps<"/[league]">) {
  const { league } = await props.params;
  if (!isLeagueType(league)) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <LeagueNav league={league} />
      <div className="pt-6">{props.children}</div>
    </div>
  );
}
