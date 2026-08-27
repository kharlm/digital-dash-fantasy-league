import { getNewsBlurbs } from "@/lib/news/generate";

/**
 * Sits below the Hero on the homepage. Hidden entirely when there's nothing
 * to report (same convention as SiteTicker) — most of the preseason, before
 * any trades or games have happened, that's the correct and expected state,
 * not an empty-state bug to paper over.
 */
export async function NewsSection() {
  const blurbs = await getNewsBlurbs();
  if (blurbs.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-2xl px-6 pb-16">
      <h2 className="mb-4 text-center text-xs font-medium tracking-[0.3em] text-fg-subtle uppercase">
        League News
      </h2>
      <ul className="space-y-3">
        {blurbs.map((blurb) => (
          <li
            key={blurb.id}
            className="flex items-start gap-3 rounded-lg border border-navy-600 bg-navy-800 px-4 py-3"
          >
            <span className="mt-0.5 shrink-0 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
              {blurb.kind === "trade" ? "Trade" : "Score"}
            </span>
            <p className="text-sm text-fg">{blurb.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
