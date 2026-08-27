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
export async function SiteTicker() {
  const [staticItems, newsBlurbs] = await Promise.all([getTickerItems(), getNewsBlurbs()]);

  const items = [
    ...newsBlurbs.map((blurb) => ({ id: blurb.id, text: blurb.text, breaking: true })),
    ...staticItems.map((item) => ({ ...item, breaking: false })),
  ];
  if (items.length === 0) return null;

  // Rendered twice back-to-back so the CSS loop (translateX -50%) has no
  // visible seam — see the .ticker-track keyframes for why that works.
  const doubled = [...items, ...items];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-navy-600 bg-navy-900/95 backdrop-blur">
      <div className="ticker-track flex w-max items-center gap-10 py-2">
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
