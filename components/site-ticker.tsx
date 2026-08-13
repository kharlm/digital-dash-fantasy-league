import { getTickerItems } from "@/lib/data/ticker";

/**
 * Fixed to the bottom of every page, not just the homepage — a persistent
 * broadcast-style ticker rather than a homepage widget. Server-rendered:
 * the scroll itself is a CSS animation (see .ticker-track in globals.css),
 * so there's no client JS cost to a continuously-moving strip of text.
 */
export function SiteTicker() {
  const items = getTickerItems();
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
            <span aria-hidden className="text-orange-500">
              ●
            </span>
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
