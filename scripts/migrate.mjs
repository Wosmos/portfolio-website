import { readFileSync, readdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  const body = readFileSync(`drizzle/${f}`, "utf8");
  const statements = body.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  for (const s of statements) {
    try { await sql.query(s); } catch (e) { if (!/already exists/i.test(String(e.message))) throw e; }
  }
  console.log("applied", f, `(${statements.length} statements)`);
}
const rows = await sql.query("select table_name from information_schema.tables where table_schema='public' order by 1");
console.log("tables:", rows.map((r) => r.table_name).join(", "));
