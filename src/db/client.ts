// Neon over HTTP. `db` is null when DATABASE_URL is absent so the site still builds and renders from
// the static records in src/data/portfolio.ts.
//
// DO NOT "FIX" THIS INTO A POOL. `drizzle-orm/neon-http` is a stateless driver: every statement is an
// HTTPS request to Neon's SQL endpoint, so there is no socket, no handshake to keep warm and no pool to
// exhaust. That is exactly what a serverless route wants — a Vercel function that freezes mid-request
// cannot leak a connection it never opened, and a hundred concurrent invocations cost Neon nothing but
// a hundred requests. A `pg` Pool or `neon-serverless` (WebSockets) in the same place would open one
// connection per instance, and the instances are not ours to count.
//
// The cost of HTTP is that each statement is its own round trip, which is a latency problem, not a
// connection problem: the fix is fewer statements, not a pool. `db.batch([…])` sends several statements
// in one request inside one transaction — /api/track uses it — and that covers the only reason we would
// otherwise reach for `neon-serverless`, which is needing more than one statement to be atomic.
//
// `cached` is module scope, so it survives between invocations on a warm instance and the driver is
// built once. Nothing here holds state that matters if the instance dies.

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
