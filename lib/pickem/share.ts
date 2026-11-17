import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { ledgerEntry, manager, prop, vote } from "@/lib/db/schema";

import { getCapTable } from "./ledger";
import { getRedraftScores, getRedraftTeams } from "./matchups";
import { leagueTotal, scoreOrder } from "./results";
import { announcementText, recapText, type AnnouncementFacts, type RecapFacts } from "./share-text";

type Prop = typeof prop.$inferSelect;

/** Shared links must point at the real site; locally they point at the dev server so they can be clicked. */
export const SITE_URL = process.env.NODE_ENV === "production" ? "https://digitaldashfl.com" : "http://localhost:3000";

/** The public page for a week's prop — what the WhatsApp link preview reads. */
export const propShareUrl = (p: Pick<Prop, "season" | "week">) => `${SITE_URL}/pickem/${p.season}/${p.week}`;
export const recapShareUrl = (p: Pick<Prop, "season" | "week">) => `${propShareUrl(p)}/recap`;

export function announcementFacts(p: Prop): AnnouncementFacts {
  return {
    week: p.week,
    question: p.question,
    options: p.options.map((o) => o.label),
    payoutCents: p.payoutCents,
    locksAt: p.locksAt,
    url: propShareUrl(p),
  };
}

/** Everything a recap states, gathered from the graded prop, the ledger, and Sleeper. */
export async function recapFacts(p: Prop): Promise<RecapFacts> {
  if (p.status !== "graded" || !p.result) throw new Error("only a graded prop has a recap");
  const result = p.result;
  const capSeason = p.season + 1;

  const [teams, weekScores, managers, paid, [{ voters }], caps] = await Promise.all([
    getRedraftTeams(),
    getRedraftScores(p.week),
    db.select({ id: manager.sleeperUserId, name: manager.name }).from(manager),
    db
      .select({ name: manager.name })
      .from(ledgerEntry)
      .innerJoin(manager, eq(ledgerEntry.managerId, manager.sleeperUserId))
      .where(eq(ledgerEntry.propId, p.id))
      .orderBy(asc(manager.name)),
    db.select({ voters: count() }).from(vote).where(eq(vote.propId, p.id)),
    getCapTable(capSeason),
  ]);

  // People say "Kharl", not the team name of the week — fall back to the team name.
  const managerNames = new Map(managers.map((m) => [m.id, m.name]));
  const nameFor = (rosterId: number) => {
    const t = teams.get(rosterId);
    return (t?.ownerId && managerNames.get(t.ownerId)) || t?.teamName || `Team ${rosterId}`;
  };
  const label = (key: string) => p.options.find((o) => o.key === key)?.label ?? key;

  const scores = result.scores;
  const finalScore = !scores
    ? null
    : p.type === "league_total"
      ? `${leagueTotal(scores).toFixed(2)} combined`
      : p.type === "top_scorer"
        ? null // the top scorers line already says it
        : scoreOrder(p.params, scores)
            .map(([id, pts]) => `${teams.get(id)?.teamName ?? nameFor(id)} ${pts.toFixed(2)}`)
            .join(" – ");

  return {
    week: p.week,
    question: p.question,
    outcome: result.push ? "Push: it landed exactly on the line" : result.winningOptions.map(label).join(" & "),
    finalScore,
    payoutCents: p.payoutCents,
    winners: paid.map((x) => x.name),
    voters,
    push: result.push,
    topScorers: [...weekScores]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, points]) => ({ name: nameFor(id), points })),
    caps: caps.map((c) => ({ name: c.name, capCents: c.capCents })),
    capSeason,
    url: recapShareUrl(p),
  };
}

const client = new Anthropic();

const FLAIR_PROMPT =
  "You add one fun line to a fantasy football league's WhatsApp post (friends who've played together for 10 years). " +
  "Playful hype or light trash talk, like a commissioner who enjoys the group chat. " +
  "One sentence, under 140 characters, at most one emoji, no hashtags. " +
  "Only use names, numbers, and facts from the post you're given — never invent stats, injuries, or results. " +
  "Reply with just the line.";

/**
 * Haiku — the cheapest Claude model; a one-liner from a short post costs a
 * fraction of a cent. Returns null on any failure: the post is complete
 * without it, so a Claude outage never blocks sharing.
 */
async function writeFlair(kind: "new prop" | "weekly recap", post: string): Promise<string | null> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: FLAIR_PROMPT,
      messages: [{ role: "user", content: `This is the ${kind} post:\n\n${post}` }],
    });
    const text = response.content.find((b) => b.type === "text");
    if (response.stop_reason !== "end_turn" || !text || text.type !== "text") return null;
    return text.text.trim().replace(/^"|"$/g, "") || null;
  } catch (error) {
    console.error("[pickem] writing share flair failed:", error);
    return null;
  }
}

export async function draftAnnouncement(p: Prop): Promise<string> {
  const facts = announcementFacts(p);
  return announcementText(facts, await writeFlair("new prop", announcementText(facts, null)));
}

export async function draftRecap(p: Prop): Promise<string> {
  const facts = await recapFacts(p);
  return recapText(facts, await writeFlair("weekly recap", recapText(facts, null)));
}
