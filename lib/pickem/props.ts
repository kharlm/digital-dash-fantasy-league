import type { PropOption, PropParams, PropType } from "@/lib/db/schema";

/**
 * Turns what the commissioner fills in into a prop's stored question,
 * options and grading params — one builder per prop type. Option keys are
 * stable identifiers the grader returns as winners: "over"/"under",
 * `r<rosterId>` for a team.
 */

type TeamRef = { rosterId: number; teamName: string };

export type PropInput =
  | { type: "spread"; favorite: TeamRef; underdog: TeamRef; line: number }
  | { type: "straight_up"; a: TeamRef; b: TeamRef }
  | { type: "team_total"; team: TeamRef; line: number }
  | { type: "top_scorer"; teams: TeamRef[] };

export type BuiltProp = {
  type: PropType;
  question: string;
  options: PropOption[];
  params: PropParams;
};

export const PROP_TYPE_LABELS: Record<PropType, string> = {
  spread: "Spread (over/under on the margin)",
  straight_up: "Straight up (who wins)",
  team_total: "Team total (over/under on points)",
  top_scorer: "Top scorer of the week",
};

/** 10 -> "10.0", 7.5 -> "7.5" — lines read like a sportsbook's. */
export function formatLine(line: number): string {
  return line.toFixed(1);
}

export const teamKey = (rosterId: number) => `r${rosterId}`;

/** Suggested lines go to the nearest half point, never below 0.5. */
export function suggestLine(points: number): number {
  return Math.max(0.5, Math.round(points * 2) / 2);
}

export function buildProp(input: PropInput): BuiltProp {
  switch (input.type) {
    case "spread": {
      const { favorite: f, underdog: u, line } = input;
      const l = formatLine(line);
      return {
        type: "spread",
        question: `${f.teamName} vs. ${u.teamName} — Line: ${f.teamName} -${l}`,
        options: [
          { key: "over", label: `Over: ${f.teamName} wins by more than ${l}` },
          { key: "under", label: `Under: ${f.teamName} wins by less than ${l} or loses` },
        ],
        params: { favoriteRosterId: f.rosterId, underdogRosterId: u.rosterId, line },
      };
    }
    case "straight_up": {
      const { a, b } = input;
      return {
        type: "straight_up",
        question: `${a.teamName} vs. ${b.teamName} — who wins?`,
        options: [
          { key: teamKey(a.rosterId), label: a.teamName },
          { key: teamKey(b.rosterId), label: b.teamName },
        ],
        params: { rosterIdA: a.rosterId, rosterIdB: b.rosterId },
      };
    }
    case "team_total": {
      const { team, line } = input;
      const l = formatLine(line);
      return {
        type: "team_total",
        question: `${team.teamName} total points — Line: ${l}`,
        options: [
          { key: "over", label: `Over: more than ${l} points` },
          { key: "under", label: `Under: fewer than ${l} points` },
        ],
        params: { rosterId: team.rosterId, line },
      };
    }
    case "top_scorer":
      return {
        type: "top_scorer",
        question: "Who scores the most points this week?",
        options: [...input.teams]
          .sort((x, y) => x.teamName.localeCompare(y.teamName))
          .map((t) => ({ key: teamKey(t.rosterId), label: t.teamName })),
        params: {},
      };
  }
}
