import { createHash } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

import { getRecentActivity, type LeagueActivity } from "./activity";

export interface NewsBlurb {
  id: string;
  kind: "trade" | "score";
  text: string;
}

const client = new Anthropic();

const SYSTEM_PROMPT =
  "You write short sports-ticker blurbs for a fantasy football league site. " +
  "One sentence per blurb, under 140 characters, no hashtags or emoji. " +
  "Cover every trade and score you're given — don't skip any and don't invent ones you weren't given. " +
  "For a trade, name the teams and what each side received. For a score, state the final score and who won.";

/**
 * The only Anthropic call in the app. Haiku: one-sentence blurbs from a
 * structured list are well within its range, at a small fraction of Opus's
 * per-token price. Throws on any failure so the caller can decline to cache
 * it (see getNewsBlurbs).
 */
async function writeBlurbs(activity: LeagueActivity): Promise<NewsBlurb[]> {
  const response = await client.messages.create({
    model: "claude-haiku-5-5",
    // ~22 blurbs is ~900 tokens of output, and thinking draws from the same
    // budget — 1024 risked truncating a busy week mid-list.
    max_tokens: 4096,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            blurbs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  kind: { type: "string", enum: ["trade", "score"] },
                  text: { type: "string" },
                },
                required: ["kind", "text"],
                additionalProperties: false,
              },
            },
          },
          required: ["blurbs"],
          additionalProperties: false,
        },
      },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(activity) }],
  });

  if (response.stop_reason !== "end_turn") {
    throw new Error(`unexpected stop_reason: ${response.stop_reason}`);
  }
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text block in response");

  const parsed = JSON.parse(textBlock.text) as { blurbs: { kind: "trade" | "score"; text: string }[] };
  return parsed.blurbs.map((b, i) => ({ id: `news-${i}`, kind: b.kind, text: b.text }));
}

/**
 * Sleeper is re-read at most every 15 minutes — that's cheap and keeps
 * trades timely.
 */
const getActivity = unstable_cache(getRecentActivity, ["news-activity"], { revalidate: 900 });

const WEEK = 60 * 60 * 24 * 7;

/**
 * Blurbs are cached by a hash of the activity they describe, so Claude is
 * only called when something actually changed (a new trade, or a new week's
 * final scores) — a few times a week — rather than every 15 minutes with
 * the same input. A failed call throws out of the cached function and so is
 * never cached: the next request simply tries again.
 *
 * Returns [] rather than throwing when there's nothing to report (the common
 * case in the preseason) or on failure — a quiet ticker beats a broken one —
 * but logs why, since a silent [] is how production went without blurbs
 * unnoticed.
 */
export async function getNewsBlurbs(): Promise<NewsBlurb[]> {
  let activity: LeagueActivity;
  try {
    activity = await getActivity();
  } catch (error) {
    console.error("[news] fetching Sleeper activity failed:", error);
    return [];
  }
  if (activity.trades.length === 0 && activity.scores.length === 0) return [];

  const key = createHash("sha256").update(JSON.stringify(activity)).digest("hex");
  try {
    return await unstable_cache(() => writeBlurbs(activity), ["news-blurbs", key], {
      revalidate: WEEK,
    })();
  } catch (error) {
    console.error("[news] generating blurbs failed:", error);
    return [];
  }
}
