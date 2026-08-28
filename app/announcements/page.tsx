import type { Metadata } from "next";

import { LEAGUES } from "@/config/leagues";
import { getAnnouncements } from "@/lib/data/announcements";

export const metadata: Metadata = {
  title: "Announcements",
  description: "League news, draft logistics, and other announcements — Digital Dash Fantasy League.",
};

// Announcement `date` values are plain "YYYY-MM-DD" strings with no time
// component, which `new Date()` parses as UTC midnight — formatting that in
// any timezone behind UTC (all of the US) shifts the displayed day back by
// one. Pinning the formatter to UTC keeps it matched to how the string was
// parsed, regardless of the viewer's own timezone.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function AnnouncementsPage() {
  const announcements = getAnnouncements();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">Announcements</h1>
        <p className="text-fg-muted">Draft logistics, league news, and anything else worth knowing.</p>
      </div>

      {announcements.length === 0 ? (
        <p className="text-fg-muted">No announcements yet.</p>
      ) : (
        <ul className="space-y-4">
          {announcements.map((a) => (
            <li key={a.id} className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-fg uppercase">{a.title}</h2>
                {a.league ? (
                  <span className="shrink-0 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-navy-950 uppercase">
                    {LEAGUES[a.league].name}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-fg-muted">{a.body}</p>
              <p className="mt-3 text-xs text-fg-subtle">{DATE_FORMAT.format(new Date(a.date))}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
