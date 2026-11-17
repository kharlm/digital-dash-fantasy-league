import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";

import { requireManager } from "@/lib/dal";
import { formatMoney } from "@/lib/pickem/format";
import { BASE_CAP_CENTS, getCapTable, getHistory } from "@/lib/pickem/ledger";

export const metadata: Metadata = {
  title: "Auction caps",
  description: "Everyone's auction budget: the $200 base plus Pick'em winnings.",
};

// 2026 Pick'em winnings fund the 2027 auction. Bump each season.
const CAP_SEASON = 2027;

export default async function LedgerPage() {
  const viewer = await requireManager("/pickem/ledger");
  const [table, { weeks, carryOvers }] = await Promise.all([getCapTable(CAP_SEASON), getHistory(CAP_SEASON)]);
  const maxWinnings = Math.max(...table.map((r) => r.winningsCents), 1);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/pickem" className="text-sm text-fg-muted hover:text-fg">
        ← Pick&apos;em
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold text-fg uppercase">{CAP_SEASON} Auction caps</h1>
      <p className="mb-6 text-fg-muted">$200 base + Pick&apos;em winnings from the {CAP_SEASON - 1} season.</p>

      <div className="overflow-hidden rounded-lg border border-navy-600 bg-navy-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-600 text-left text-xs text-fg-subtle uppercase">
              <th scope="col" className="w-10 py-2 pl-4 font-medium">
                #
              </th>
              <th scope="col" className="py-2 font-medium">
                Manager
              </th>
              <th scope="col" className="py-2 font-medium">
                Pick&apos;em winnings
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Cap
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const me = r.managerId === viewer.manager.sleeperUserId;
              // Rows animate in one after another, top down.
              const delay = `${i * 250}ms`;
              return (
                <tr key={r.managerId} className={`border-b border-navy-600/50 last:border-0 ${me ? "bg-gold-500/5" : ""}`}>
                  <td className="py-3 pl-4 text-fg-subtle tabular-nums">{r.rank}</td>
                  <td className={`py-3 pr-3 font-medium ${me ? "text-gold-400" : "text-fg"}`}>{r.name}</td>
                  <td className="py-3 pr-3">
                    {/* Bars show winnings from $0 — the part that differs.
                        The cap column carries the full figure. */}
                    <div className="flex items-center gap-2" title={`${r.name}: ${formatMoney(r.winningsCents)} won`}>
                      <div className="h-3 flex-1">
                        {r.winningsCents > 0 ? (
                          <div
                            className="bar-grow h-3 rounded-r bg-gold-600"
                            style={{ width: `${(r.winningsCents / maxWinnings) * 100}%`, animationDelay: delay }}
                          />
                        ) : null}
                      </div>
                      <span className="w-12 text-fg-muted tabular-nums">
                        <CountUp cents={r.winningsCents} prefix="+$" delay={delay} />
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-display text-base font-semibold text-fg tabular-nums">
                    <CountUp cents={r.capCents} fromCents={BASE_CAP_CENTS} delay={delay} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 mb-4 font-display text-xl font-semibold text-fg uppercase">Week by week</h2>
      {weeks.length === 0 && carryOvers.length === 0 ? (
        <p className="text-sm text-fg-muted">No graded weeks yet.</p>
      ) : (
        <ul className="space-y-3">
          {weeks.map((w) => (
            <li key={w.propId} className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display font-semibold text-fg uppercase">Week {w.week}</span>
                <span className="text-xs text-fg-subtle">{formatMoney(w.payoutCents)} each</span>
              </div>
              <p className="mt-1 text-sm text-fg-muted">{w.question}</p>
              <p className="mt-1 text-sm text-fg">Result: {w.result}</p>
              {w.note ? <p className="mt-1 text-xs text-fg-subtle">Commissioner&apos;s note: {w.note}</p> : null}
              <p className="mt-1 text-xs text-fg-muted">
                {w.paid.length ? `Paid: ${w.paid.join(", ")}` : "Nobody picked the winning side."}
              </p>
            </li>
          ))}
          {/* Carry-overs normally share one reason (e.g. "Weeks 1–10, from the
              WhatsApp spreadsheet") — say it once, then the amounts. */}
          {[...Map.groupBy(carryOvers, (c) => c.reason)].map(([reason, entries]) => (
            <li key={reason} className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-3">
              <span className="font-display font-semibold text-fg uppercase">Carried over</span>
              <p className="mt-1 text-sm text-fg-muted">{reason}</p>
              <p className="mt-1 text-xs text-fg-muted">
                {entries.map((c) => `${c.name} +${formatMoney(c.amountCents)}`).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A dollar figure that counts up from `fromCents` on load (CSS only — see
 * .count-up in globals.css). Screen readers get the plain figure. Amounts
 * with cents (a $0.50 payout) aren't whole numbers the counter can print,
 * so those just show as-is.
 */
function CountUp({ cents, fromCents = 0, prefix = "$", delay }: { cents: number; fromCents?: number; prefix?: string; delay: string }) {
  const text = `${prefix === "+$" ? "+" : ""}${formatMoney(cents)}`;
  if (cents % 100 !== 0 || fromCents % 100 !== 0) return text;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden
        className="count-up"
        style={
          {
            "--n": cents / 100,
            "--from": fromCents / 100,
            "--prefix": `"${prefix}"`,
            animationDelay: delay,
          } as CSSProperties
        }
      />
    </>
  );
}
