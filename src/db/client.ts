// Neon over HTTP: one round trip per query, no connection pool to manage, which is what a serverless
// route wants. `db` is null when DATABASE_URL is absent so the site still builds and renders from the
// static records in src/data/portfolio.ts.

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let cached: Db | null | undefined;

export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? drizzle(neon(url), { schema }) : null;
  if (!url) console.warn("[db] DATABASE_URL is not set — falling back to the static content records");
  return cached;
}
export { schema };
