/**
 * Loads the 10 redraft managers into the `manager` table from the private
 * allowlist (data/private/pickem-allowlist.json — gitignored, it holds phone
 * numbers). Safe to re-run: it upserts name/phone/role but never touches
 * user_id, so re-seeding can't unlink anyone who has already claimed a team.
 *
 * Run with `npm run db:seed` against whatever DATABASE_URL .env.local points
 * at (the Neon dev branch locally; production once, before launch).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

type AllowlistEntry = {
  name: string;
  sleeperUserId: string;
  phone: string;
  role: "member" | "admin";
};

const entries: AllowlistEntry[] = JSON.parse(
  readFileSync(
    new URL("../data/private/pickem-allowlist.json", import.meta.url),
    "utf8",
  ),
);

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
await client.connect();

for (const e of entries) {
  await client.query(
    `insert into manager (sleeper_user_id, name, phone, role)
     values ($1, $2, $3, $4)
     on conflict (sleeper_user_id)
     do update set name = excluded.name, phone = excluded.phone, role = excluded.role`,
    [e.sleeperUserId, e.name, e.phone, e.role],
  );
}

const { rows } = await client.query(
  "select name, role, user_id is not null as claimed from manager order by name",
);
console.table(rows);
await client.end();
