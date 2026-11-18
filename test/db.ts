import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "@/lib/db/schema";

/**
 * A real Postgres for integration tests, in-process (PGlite): no server, no
 * network, never near the Neon databases. Built from the same migrations as
 * production, so the tests also check the migrations themselves.
 *
 * Use it by mocking the app's db module in a test file:
 *   vi.mock("@/lib/db", async () => ({ db: await (await import("@/test/db")).createTestDb() }));
 */
export async function createTestDb() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  return db;
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

/** Wipes every app table between tests. */
export async function resetTestDb(db: TestDb) {
  await db.execute(
    sql`truncate table ledger_entry, vote, prop, manager, session, account, verification, "user" restart identity cascade`,
  );
}

export const MANAGERS = {
  kharl: { sleeperUserId: "s-kharl", name: "Kharl", role: "admin" as const },
  matt: { sleeperUserId: "s-matt", name: "Matt", role: "admin" as const },
  jesse: { sleeperUserId: "s-jesse", name: "Jesse", role: "member" as const },
  binh: { sleeperUserId: "s-binh", name: "Binh", role: "member" as const },
};

export async function seedManagers(db: TestDb) {
  await db.insert(schema.manager).values(Object.values(MANAGERS));
}
