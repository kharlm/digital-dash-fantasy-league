import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * The 10 redraft managers, keyed by Sleeper owner_id (the same identity the
 * rest of the site uses). A row exists before anyone signs in — seeded from
 * the private allowlist — and `userId` gets filled in when that person signs
 * in and picks their team. Unique on userId so one login can't hold two teams.
 */
export const manager = pgTable("manager", {
  sleeperUserId: text("sleeper_user_id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  userId: text("user_id")
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at"),
});

export type PropType =
  | "spread"
  | "straight_up"
  | "team_total"
  | "top_scorer"
  | "custom";

export type PropOption = { key: string; label: string };

/**
 * Type-specific inputs the grader needs. Stored with the prop so a graded
 * prop can always be re-explained exactly as it was set, even if the grading
 * code for its type changes later.
 */
export type PropParams =
  | { favoriteRosterId: number; underdogRosterId: number; line: number } // spread
  | { rosterIdA: number; rosterIdB: number } // straight_up
  | { rosterId: number; line: number } // team_total
  | Record<string, never>; // top_scorer, custom

export type PropResult = {
  winningOptions: string[]; // option keys; several on a tie
  push: boolean; // spread landed exactly on the line
  scores?: Record<number, number>; // rosterId -> points, as graded
  note?: string; // commissioner's override reason
};

/**
 * One prop per (season, week). Money is in whole cents so $0.50 payouts are
 * possible later without float rounding; the UI shows dollars.
 */
export const prop = pgTable(
  "prop",
  {
    id: serial("id").primaryKey(),
    season: integer("season").notNull(),
    week: integer("week").notNull(),
    type: text("type").$type<PropType>().notNull(),
    question: text("question").notNull(),
    options: jsonb("options").$type<PropOption[]>().notNull(),
    params: jsonb("params").$type<PropParams>().notNull(),
    payoutCents: integer("payout_cents").notNull(),
    pushPayoutCents: integer("push_payout_cents").notNull().default(0),
    locksAt: timestamp("locks_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["open", "graded", "void"] })
      .notNull()
      .default("open"),
    result: jsonb("result").$type<PropResult>(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    gradedAt: timestamp("graded_at"),
  },
  (t) => [
    unique("prop_season_week_unique").on(t.season, t.week),
    check("prop_payout_nonnegative", sql`${t.payoutCents} >= 0`),
  ],
);

/** A manager's pick; changeable (upsert) until the prop locks. */
export const vote = pgTable(
  "vote",
  {
    propId: integer("prop_id")
      .notNull()
      .references(() => prop.id, { onDelete: "cascade" }),
    managerId: text("manager_id")
      .notNull()
      .references(() => manager.sleeperUserId),
    option: text("option").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.propId, t.managerId] })],
);

/**
 * Append-only money record. `capSeason` is the auction the money applies to
 * (2026 Pick'em winnings -> 2027 cap). Unique on (propId, managerId) makes
 * grading idempotent: re-running the grader can't double-pay anyone.
 * Manual adjustments (backfill, corrections) have no propId.
 */
export const ledgerEntry = pgTable(
  "ledger_entry",
  {
    id: serial("id").primaryKey(),
    managerId: text("manager_id")
      .notNull()
      .references(() => manager.sleeperUserId),
    capSeason: integer("cap_season").notNull(),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").notNull(),
    propId: integer("prop_id").references(() => prop.id),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("ledger_prop_manager_unique").on(t.propId, t.managerId),
    index("ledger_cap_season_idx").on(t.capSeason),
  ],
);
