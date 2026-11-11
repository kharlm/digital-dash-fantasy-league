import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// One pool per server instance. Fluid Compute reuses instances across
// requests, so this is shared rather than reconnecting per request; Neon's
// pooled DATABASE_URL (pgbouncer) absorbs the fan-out across instances.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
