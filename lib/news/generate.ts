import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

import { getRecentActivity } from "./activity";

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
 * The only Anthropic call in the app. Returns [] rather than throwing when
 * there's nothing to report (the common case in the preseason) or when the
 * activity fetch or API call fails — a quiet ticker beats a broken one.
 */
async function generateBlurbs(): Promise<NewsBlurb[]> {
  let activity;
  try {
    activity = await getRecentActivity();
  } catch {
    return [];
  }
  if (activity.trades.length === 0 && activity.scores.length === 0) return [];

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
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

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = JSON.parse(textBlock.text) as { blurbs: { kind: "trade" | "score"; text: string }[] };
    return parsed.blurbs.map((b, i) => ({ id: `news-${i}`, kind: b.kind, text: b.text }));
  } catch {
    return [];
  }
}

/**
 * Cached for 15 minutes so the ticker — rendered on every page via the root
 * layout — doesn't call the Anthropic API on every request. Trades and
 * scores don't change fast enough to need anything tighter.
 */
export const getNewsBlurbs = unstable_cache(generateBlurbs, ["news-blurbs"], {
  revalidate: 900,
});
