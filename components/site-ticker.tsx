import { getTickerItems } from "@/lib/data/ticker";
import { getNewsBlurbs } from "@/lib/news/generate";

/**
 * Fixed to the bottom of every page, not just the homepage — a persistent
 * broadcast-style ticker rather than a homepage widget. Server-rendered, and
 * async since it also reads the (cached, see lib/news/generate.ts)
 * AI-written trade/score blurbs: the scroll itself is a CSS animation (see
 * .ticker-track in globals.css), so there's no client JS cost to a
 * continuously-moving strip of text.
 */
// Sizing for the duration estimate below: text-sm Inter averages ~7px per
// character; each item also carries its marker plus the gap-10 (40px).
const APPROX_CHAR_PX = 7;
const BULLET_PX = 8 + 8;
const BREAKING_BADGE_PX = 64 + 8;
const ITEM_GAP_PX = 40;
const SCROLL_PX_PER_SECOND = 60;
const MIN_LOOP_SECONDS = 20;

export async function SiteTicker() {
  const [staticItems, newsBlurbs] = await Promise.all([getTickerItems(), getNewsBlurbs()]);

  const items = [
    ...newsBlurbs.map((blurb) => ({ id: blurb.id, text: blurb.text, breaking: true })),
    ...staticItems.map((item) => ({ ...item, breaking: item.breaking ?? false })),
  ];
  if (items.length === 0) return null;

  // Rendered twice back-to-back so the CSS loop (translateX -50%) has no
  // visible seam — see the .ticker-track keyframes for why that works.
  const doubled = [...items, ...items];

  // A fixed loop duration made the scroll speed depend on how much content
  // there was: 6 static items crawled, while in-season (20+ AI blurbs) the
  // same 45s raced. Instead, estimate one copy's width and derive the
  // duration from a constant speed. Estimate, not measurement — it's
  // server-rendered, and close is all that matters for a reading pace.
  const copyWidthPx = items.reduce(
    (sum, item) => sum + item.text.length * APPROX_CHAR_PX + (item.breaking ? BREAKING_BADGE_PX : BULLET_PX) + ITEM_GAP_PX,
    0,
  );
  const durationSeconds = Math.max(MIN_LOOP_SECONDS, Math.round(copyWidthPx / SCROLL_PX_PER_SECOND));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-navy-600 bg-navy-900/95 backdrop-blur">
      <div
        className="ticker-track flex w-max items-center gap-10 py-2"
        style={{ "--ticker-duration": `${durationSeconds}s` } as React.CSSProperties}
      >
        {doubled.map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 text-sm whitespace-nowrap text-fg-muted"
          >
            {item.breaking ? (
              <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
                Breaking
              </span>
            ) : (
              <span aria-hidden className="text-orange-500">
                ●
              </span>
            )}
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
