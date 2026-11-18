import { ImageResponse } from "next/og";

import { formatMoney } from "@/lib/pickem/format";
import { BASE_CAP_CENTS, getCapTable } from "@/lib/pickem/ledger";
import { getPublicProp, parseWeekParams } from "@/lib/pickem/public";

/**
 * The card WhatsApp shows under the recap's link: the auction caps chart,
 * replacing the spreadsheet screenshot. Bars are winnings from $0 (the part
 * that differs between managers); the cap is printed beside each.
 */

export const alt = "DDFL auction caps after this week's Pick'em";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const NAVY = "#050b1a";
const GOLD = "#f5b418";
const BAR = "#c8860a";
const ORANGE = "#f97316";
const MUTED = "#9fb0d6";
const RULE = "#16274f";

export default async function Image({ params }: { params: Promise<{ season: string; week: string }> }) {
  const parsed = parseWeekParams(await params);
  const p = parsed && (await getPublicProp(parsed.season, parsed.week));
  const capSeason = (parsed?.season ?? new Date().getFullYear()) + 1;
  const rows = await getCapTable(capSeason);
  const max = Math.max(...rows.map((r) => r.winningsCents), 1);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: NAVY, padding: "44px 64px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", background: ORANGE, color: NAVY, fontSize: 26, fontWeight: 700, padding: "4px 14px", borderRadius: 8 }}>
            {p ? `WEEK ${p.week} RECAP` : "PICK'EM"}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{capSeason} Auction Caps</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 22, flex: 1, justifyContent: "space-between" }}>
          {rows.slice(0, 10).map((r) => (
            <div key={r.managerId} style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, borderBottom: `1px solid ${RULE}`, paddingBottom: 4 }}>
              <div style={{ display: "flex", width: 190 }}>{r.name}</div>
              <div style={{ display: "flex", flex: 1, height: 22 }}>
                {r.winningsCents > 0 ? (
                  <div style={{ display: "flex", height: 22, width: `${(r.winningsCents / max) * 100}%`, background: BAR, borderRadius: "0 5px 5px 0" }} />
                ) : null}
              </div>
              <div style={{ display: "flex", width: 90, justifyContent: "flex-end", color: MUTED }}>+{formatMoney(r.winningsCents)}</div>
              <div style={{ display: "flex", width: 110, justifyContent: "flex-end", color: GOLD, fontWeight: 700 }}>
                {formatMoney(r.capCents)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 22, color: MUTED }}>
          {formatMoney(BASE_CAP_CENTS)} base + Pick&apos;em winnings · digitaldashfl.com
        </div>
      </div>
    ),
    size,
  );
}
