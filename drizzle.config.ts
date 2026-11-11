import { defineConfig } from "drizzle-kit";

// Migrations use the direct (unpooled) connection — pgbouncer's transaction
// pooling doesn't play well with DDL. `npm run db:generate` writes SQL to
// drizzle/; `npm run db:migrate` applies it to whatever .env.local points at.
export default defineConfig({
  schema: "./lib/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
