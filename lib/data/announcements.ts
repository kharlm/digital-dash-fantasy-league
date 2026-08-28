import type { LeagueType } from "@/config/leagues";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** Omit for an announcement that applies to the whole league group, not just one. */
  league?: LeagueType;
  /** ISO date this was posted — controls sort order and the displayed date. */
  date: string;
}

/**
 * Hand-authored, like the ticker's ANNOUNCEMENTS array — no generation
 * script needed since there's no external source or transform step, just
 * whatever the commissioner wants posted. Newest first is enforced by
 * getAnnouncements() below, not by list order here, so entries can be added
 * wherever's convenient.
 */
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "redraft-draft-location-2026",
    title: "Redraft Draft Location",
    body: "This year's Redraft draft will be held at 10912 Holly Cone Dr, Riverview, FL, starting at 2:00 PM.",
    league: "redraft",
    date: "2026-08-28",
  },
];

export function getAnnouncements(): Announcement[] {
  return [...ANNOUNCEMENTS].sort((a, b) => b.date.localeCompare(a.date));
}
