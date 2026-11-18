/** Whole dollars print bare ("$2"), cents print in full ("$0.50") — auction dollars are almost always whole. */
export function formatMoney(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// The league is in Florida, and everyone thinks in Eastern kickoff times —
// pinned so server rendering (UTC on Vercel) matches what people expect.
const EASTERN = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

export function formatEastern(date: Date): string {
  return EASTERN.format(date);
}
