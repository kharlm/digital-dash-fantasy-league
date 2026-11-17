import { ImageResponse } from "next/og";

import { formatMoney } from "@/lib/pickem/format";
import { getPublicProp, parseWeekParams } from "@/lib/pickem/public";
import { formatLockShort } from "@/lib/pickem/share-text";

/**
 * The card WhatsApp shows under the announcement's link: the prop, the
 * prize, and when voting locks. Drawn from the database on request — the
 * share link is unique per week, so WhatsApp's own caching never shows an
 * old week.
 */

export const alt = "This week's DDFL Pick'em";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const NAVY = "#050b1a";
const CARD = "#0f1c42";
const BORDER = "#223a6b";
const GOLD = "#f5b418";
const ORANGE = "#f97316";
const MUTED = "#9fb0d6";

export default async function Image({ params }: { params: Promise<{ season: string; week: string }> }) {
  const parsed = parseWeekParams(await params);
  const p = parsed && (await getPublicProp(parsed.season, parsed.week));

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: NAVY, padding: 64, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", background: ORANGE, color: NAVY, fontSize: 30, fontWeight: 700, padding: "6px 16px", borderRadius: 8 }}>
            {p ? `WEEK ${p.week} PICK'EM` : "DDFL PICK'EM"}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: MUTED }}>DDFL</div>
        </div>

        <div style={{ display: "flex", fontSize: p && p.question.length > 60 ? 50 : 60, fontWeight: 700, marginTop: 36, lineHeight: 1.15 }}>
          {p ? p.question : "This week's prop"}
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 36 }}>
          {/* Top scorer has a card per team — too many to draw; say it instead. */}
          {(p && p.options.length > 3 ? [{ key: "any", label: `Pick any of the ${p.options.length} teams` }] : (p?.options ?? [])).map((o) => (
            <div
              key={o.key}
              style={{ display: "flex", flex: 1, background: CARD, border: `2px solid ${BORDER}`, borderRadius: 14, padding: "18px 22px", fontSize: 28 }}
            >
              {o.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", alignItems: "baseline", fontSize: 40 }}>
          {p ? (
            <>
              <div style={{ display: "flex", color: GOLD, fontWeight: 700 }}>Win {formatMoney(p.payoutCents)}</div>
              <div style={{ display: "flex", color: MUTED, fontSize: 32, marginLeft: 28 }}>Pick before {formatLockShort(p.locksAt)}</div>
            </>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
