import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatEastern, formatMoney } from "@/lib/pickem/format";
import { getPublicProp, parseWeekParams } from "@/lib/pickem/public";

/**
 * Public page for one week's prop — where the WhatsApp announcement links,
 * so the link preview (opengraph-image.tsx here) works without a login.
 * Voting itself stays on /pickem.
 */

async function load(params: PageProps<"/pickem/[season]/[week]">["params"]) {
  const parsed = parseWeekParams(await params);
  const p = parsed && (await getPublicProp(parsed.season, parsed.week));
  if (!p) notFound();
  return p;
}

export async function generateMetadata({ params }: PageProps<"/pickem/[season]/[week]">): Promise<Metadata> {
  const p = await load(params);
  return {
    title: `Week ${p.week} Pick'em`,
    description: `${p.question} · Win ${formatMoney(p.payoutCents)} · Locks ${formatEastern(p.locksAt)}`,
  };
}

export default async function PublicPropPage({ params }: PageProps<"/pickem/[season]/[week]">) {
  const p = await load(params);
  const graded = p.status === "graded";
  const locked = p.locksAt <= new Date();

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
        Week {p.week} Pick&apos;em
      </span>
      <h1 className="mt-3 font-display text-2xl font-semibold text-fg uppercase sm:text-3xl">{p.question}</h1>
      <ul className="mt-4 space-y-2">
        {p.options.map((o) => (
          <li key={o.key} className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-3 text-fg">
            {o.label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-fg-muted">
        Win {formatMoney(p.payoutCents)} toward next year&apos;s auction · {locked ? "Locked" : "Locks"}{" "}
        {formatEastern(p.locksAt)}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {graded ? (
          <Link
            href={`/pickem/${p.season}/${p.week}/recap`}
            className="rounded-lg bg-gold-500 px-4 py-3 font-semibold text-navy-950 hover:bg-gold-400"
          >
            See the result →
          </Link>
        ) : (
          <Link href="/pickem" className="rounded-lg bg-gold-500 px-4 py-3 font-semibold text-navy-950 hover:bg-gold-400">
            {locked ? "See everyone's picks →" : "Vote →"}
          </Link>
        )}
      </div>
    </div>
  );
}
