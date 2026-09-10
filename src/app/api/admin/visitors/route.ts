// The visitor list, paged, sorted and filtered by Postgres rather than by the browser — the table is
// the one thing here that grows without a ceiling.
//
// Owners (me) and bots are excluded from every count and every row unless `include` asks for them, so
// the totals in this response and in /api/admin/stats agree about who counts as a person.

import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PER = 25;
const MAX_PER = 200;

const SORTS: Readonly<Record<string, PgColumn>> = {
  lastSeen: t.visitors.lastSeen,
  firstSeen: t.visitors.firstSeen,
  score: t.visitors.score,
  visits: t.visitors.visits,
  pageviews: t.visitors.pageviews,
  engagedSeconds: t.visitors.engagedSeconds,
};
const INTENTS = ["hot", "warm", "curious", "passing", "bot"] as const;

/** The columns the admin table and the intent chips need. `scoreWhy` comes too, for the row tooltip. */
const COLUMNS = {
  id: t.visitors.id,
  firstSeen: t.visitors.firstSeen,
  lastSeen: t.visitors.lastSeen,
  visits: t.visitors.visits,
  pageviews: t.visitors.pageviews,
  events: t.visitors.events,
  engagedSeconds: t.visitors.engagedSeconds,
  country: t.visitors.country,
  region: t.visitors.region,
  city: t.visitors.city,
  timezone: t.visitors.timezone,
  device: t.visitors.device,
  os: t.visitors.os,
  browser: t.visitors.browser,
  screen: t.visitors.screen,
  language: t.visitors.language,
  firstReferrer: t.visitors.firstReferrer,
  firstLanding: t.visitors.firstLanding,
  utmSource: t.visitors.utmSource,
  utmMedium: t.visitors.utmMedium,
  utmCampaign: t.visitors.utmCampaign,
  door: t.visitors.door,
  converted: t.visitors.converted,
  label: t.visitors.label,
  isBot: t.visitors.isBot,
  isOwner: t.visitors.isOwner,
  score: t.visitors.score,
  intent: t.visitors.intent,
  scoreWhy: t.visitors.scoreWhy,
  scoredAt: t.visitors.scoredAt,
} as const;

const int = (raw: string | null, fallback: number, min: number, max: number): number => {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

/** `include=owner,bot` — or `all` for both. Anything else keeps them out. */
export function includeFilter(raw: string | null): SQL | undefined {
  const wanted = new Set((raw ?? "").toLowerCase().split(",").map((s) => s.trim()));
  const owners = wanted.has("owner") || wanted.has("owners") || wanted.has("all");
  const bots = wanted.has("bot") || wanted.has("bots") || wanted.has("all");
  const clauses: SQL[] = [];
  if (!owners) clauses.push(eq(t.visitors.isOwner, false));
  if (!bots) clauses.push(eq(t.visitors.isBot, false));
  return clauses.length ? and(...clauses) : undefined;
}

/** One box that searches the columns an admin would actually recognise a person by. */
function textFilter(q: string): SQL | undefined {
  if (!q) return undefined;
  const like = `%${q}%`;
  return or(
    ilike(t.visitors.country, like),
    ilike(t.visitors.city, like),
    ilike(t.visitors.region, like),
    ilike(t.visitors.device, like),
    ilike(t.visitors.browser, like),
    ilike(t.visitors.os, like),
    ilike(t.visitors.label, like),
    ilike(t.visitors.firstReferrer, like),
    ilike(t.visitors.firstLanding, like),
    ilike(t.visitors.id, `${q}%`),
  );
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const params = new URL(request.url).searchParams;
  const per = int(params.get("per"), DEFAULT_PER, 1, MAX_PER);
  const page = int(params.get("page"), 1, 1, 100_000);
  const sortKey = params.get("sort") ?? "lastSeen";
  const column = SORTS[sortKey] ?? SORTS.lastSeen;
  const dir = params.get("dir") === "asc" ? "asc" : "desc";
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const intent = params.get("intent") ?? "";

  const clauses: (SQL | undefined)[] = [includeFilter(params.get("include")), textFilter(q)];
  if (INTENTS.some((i) => i === intent)) clauses.push(eq(t.visitors.intent, intent));
  if (params.get("converted") === "1") clauses.push(eq(t.visitors.converted, true));
  if (params.get("door")) clauses.push(eq(t.visitors.door, (params.get("door") ?? "").slice(0, 8)));
  if (params.get("seen") === "known") clauses.push(ne(t.visitors.country, ""));
  const where = clauses.filter((c): c is SQL => c !== undefined);
  const filter = where.length ? and(...where) : undefined;

  try {
    // the page and its total in one HTTPS request; see the note on batching in src/db/client.ts
    const [rows, [totals]] = await db.batch([
      db
        .select(COLUMNS)
        .from(t.visitors)
        .where(filter)
        // a stable tiebreak, or two rows with the same score swap places between pages
        .orderBy(dir === "asc" ? asc(column) : desc(column), desc(t.visitors.id))
        .limit(per)
        .offset((page - 1) * per),
      db.select({ n: sql<number>`count(*)::int` }).from(t.visitors).where(filter),
    ]);

    const total = totals?.n ?? 0;
    return ok({ rows, total, page, per, pages: Math.max(1, Math.ceil(total / per)), sort: sortKey, dir });
  } catch (e) {
    console.error("[admin] visitors", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
