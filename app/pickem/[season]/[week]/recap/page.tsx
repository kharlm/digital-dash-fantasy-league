import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatMoney } from "@/lib/pickem/format";
import { getPublicProp, parseWeekParams } from "@/lib/pickem/public";
import { recapFacts } from "@/lib/pickem/share";

/**
 * Public recap for a graded week — where the WhatsApp recap links. Its
 * preview image (opengraph-image.tsx here) is the auction caps chart that
 * replaces the commissioner's spreadsheet screenshot.
 */

async function load(params: PageProps<"/pickem/[season]/[week]/recap">["params"]) {
  const parsed = parseWeekParams(await params);
  const p = parsed && (await getPublicProp(parsed.season, parsed.week));
  if (!p || p.status !== "graded") notFound();
  return p;
}

export async function generateMetadata({ params }: PageProps<"/pickem/[season]/[week]/recap">): Promise<Metadata> {
  const p = await load(params);
  return {
    title: `Week ${p.week} Pick'em recap`,
    description: `${p.season + 1} auction caps after Week ${p.week}: $200 base + Pick'em winnings.`,
  };
}

export default async function RecapPage({ params }: PageProps<"/pickem/[season]/[week]/recap">) {
  const f = await recapFacts(await load(params));
  const maxWinnings = Math.max(...f.caps.map((c) => c.capCents - 200_00), 1);

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
        Week {f.week} recap
      </span>
      <h1 className="mt-3 font-display text-2xl font-semibold text-fg uppercase sm:text-3xl">{f.question}</h1>
      <p className="mt-3 text-fg">
        ✅ {f.outcome}
        {f.finalScore ? <span className="text-fg-muted"> · final {f.finalScore}</span> : null}
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        {f.push
          ? `Landed exactly on the line — all ${f.voters} voters paid ${formatMoney(f.payoutCents)}.`
          : f.winners.length
            ? `${f.winners.length} of ${f.voters} got it right (+${formatMoney(f.payoutCents)} each): ${f.winners.join(", ")}`
            : `Nobody of the ${f.voters} who voted got it right.`}
      </p>
      {f.topScorers.length ? (
        <p className="mt-1 text-sm text-fg-muted">
          Top scorers: {f.topScorers.map((t) => `${t.name} ${t.points.toFixed(2)}`).join(" · ")}
        </p>
      ) : null}

      <h2 className="mt-8 mb-3 font-display text-xl font-semibold text-fg uppercase">{f.capSeason} Auction caps</h2>
      <ul className="overflow-hidden rounded-lg border border-navy-600 bg-navy-800">
        {f.caps.map((c) => {
          const won = c.capCents - 200_00;
          return (
            <li key={c.name} className="flex items-center gap-3 border-b border-navy-600/50 px-4 py-2.5 text-sm last:border-0">
              <span className="w-20 shrink-0 font-medium text-fg">{c.name}</span>
              <span className="h-3 flex-1">
                {won > 0 ? (
                  <span className="block h-3 rounded-r bg-gold-600" style={{ width: `${(won / maxWinnings) * 100}%` }} />
                ) : null}
              </span>
              <span className="w-12 text-right text-fg-muted tabular-nums">+{formatMoney(won)}</span>
              <span className="w-14 text-right font-display font-semibold text-fg tabular-nums">{formatMoney(c.capCents)}</span>
            </li>
          );
        })}
      </ul>

      <Link href="/pickem/ledger" className="mt-6 inline-block text-sm text-gold-400 hover:text-gold-300">
        Week-by-week history →
      </Link>
    </div>
  );
}
