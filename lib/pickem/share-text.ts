import { formatMoney } from "./format";

/**
 * The WhatsApp posts an admin shares: the new prop and the weekly recap.
 * Pure text from facts, so every number in a post comes from the database
 * or Sleeper — Claude only supplies the optional `flair` line.
 */

export type AnnouncementFacts = {
  week: number;
  question: string;
  options: string[]; // option labels, in order
  payoutCents: number;
  locksAt: Date;
  url: string;
};

export type RecapFacts = {
  week: number;
  question: string;
  outcome: string; // "Over: more than 1200.0 points combined", or the push line
  finalScore: string | null; // "1258.34 combined", "Nobie 130.12 – Band-Aid 110.00"
  payoutCents: number;
  winners: string[]; // manager names that were paid
  voters: number;
  push: boolean;
  topScorers: { name: string; points: number }[];
  caps: { name: string; capCents: number }[]; // highest first
  capSeason: number;
  url: string;
};

const LOCK_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

/** "Thu 8:10 PM ET" — the league is in Florida, and the post is read the same week. */
export function formatLockShort(date: Date): string {
  return `${LOCK_FORMAT.format(date).replace(",", "")} ET`;
}

const OVER_UNDER_EMOJI: Record<string, string> = { over: "📈", under: "📉" };

export function announcementText(f: AnnouncementFacts, flair: string | null): string {
  const options = f.options.map((label) => {
    const side = label.split(":")[0].toLowerCase();
    return `${OVER_UNDER_EMOJI[side] ?? "•"} ${label}`;
  });
  return [
    `🏈 Week ${f.week} PICK'EM`,
    "",
    f.question,
    "",
    ...options,
    "",
    `Pick before ${formatLockShort(f.locksAt)} and win ${formatMoney(f.payoutCents)}! 🐂🎯`,
    ...(flair ? ["", flair] : []),
    "",
    `Vote 👉 ${f.url}`,
  ].join("\n");
}

export function recapText(f: RecapFacts, flair: string | null): string {
  const each = `+${formatMoney(f.payoutCents)} each`;
  const paid = f.push
    ? `It landed exactly on the line, so all ${f.voters} voters get paid (${each}).`
    : f.winners.length
      ? `${f.winners.length} of ${f.voters} got it right: ${f.winners.join(", ")} (${each})`
      : `Nobody of the ${f.voters} who voted got it right.`;

  return [
    `🏆 Week ${f.week} Pick'em Recap`,
    "",
    f.question,
    `✅ ${f.outcome}${f.finalScore ? ` (final: ${f.finalScore})` : ""}`,
    paid,
    ...(f.topScorers.length
      ? ["", `🔥 Top scorers: ${f.topScorers.map((t) => `${t.name} ${t.points.toFixed(2)}`).join(" · ")}`]
      : []),
    ...(flair ? ["", flair] : []),
    "",
    `💰 ${f.capSeason} auction caps`,
    f.caps.map((c) => `${c.name} ${formatMoney(c.capCents)}`).join(" · "),
    "",
    `Full standings 👉 ${f.url}`,
  ].join("\n");
}
