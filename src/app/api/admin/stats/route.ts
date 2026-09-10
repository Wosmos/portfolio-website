// Everything the analytics dashboard draws, in one response, so the client makes one request instead of
// a dozen. Every number is counted by Postgres — nothing here pulls a table into JS to reduce it — and
// the whole set goes to Neon as a single batched request rather than a dozen parallel ones.
//
// Who counts as a person: not me, and not a bot. `visitors.isOwner` and `visitors.isBot` are excluded
// from every figure below unless `?include=owner` (or `bot`, or `all`) asks for them. The tables that
// have no visitor column — `daily` — are kept honest at the other end instead: /api/track never writes
// a day row for an owner or a bot, so the series and the page ranking are already clean.

import { and, desc, eq, gte, ne, sql, type SQL } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const TOP = 10;
const TOP_EVENTS = 20;
const RECENT = 20;

export interface Tally {
  key: string;
  count: number;
}
export interface DayPoint {
  day: string;
  pageviews: number;
  visits: number;
  uniques: number;
}

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const count = sql<number>`count(*)::int`;

function readDays(raw: string | null): number {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(1, Math.trunc(n)));
}

/**
 * `include=owner,bot` — or `all` for both. The same rule as /api/admin/visitors, kept as its own few
 * lines here rather than imported across route modules.
 */
function peopleOnly(raw: string | null): SQL | undefined {
  const wanted = new Set((raw ?? "").toLowerCase().split(",").map((s) => s.trim()));
  const clauses: SQL[] = [];
  if (!(wanted.has("owner") || wanted.has("owners") || wanted.has("all"))) clauses.push(eq(t.visitors.isOwner, false));
  if (!(wanted.has("bot") || wanted.has("bots") || wanted.has("all"))) clauses.push(eq(t.visitors.isBot, false));
  return clauses.length ? and(...clauses) : undefined;
}

/** One row per day in the window, so a gap in `daily` shows as a zero rather than a missing point. */
function fill(days: number, rows: readonly DayPoint[]): DayPoint[] {
  const found = new Map(rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];
  const start = Date.now() - (days - 1) * 86_400_000;
  for (let i = 0; i < days; i++) {
    const day = dayOf(new Date(start + i * 86_400_000));
    out.push(found.get(day) ?? { day, pageviews: 0, visits: 0, uniques: 0 });
  }
  return out;
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const params = new URL(request.url).searchParams;
  const days = readDays(params.get("days"));
  const since = new Date(Date.now() - days * 86_400_000);
  const sinceDay = dayOf(since);
  const live = peopleOnly(params.get("include"));

  try {
    const [
      [people], [sessionCount], series, topPaths, topReferrers, topCountries,
      devices, browsers, doors, intents, recent, eventTargets,
    ] = await db.batch([
      // the five headline numbers in one pass over the profiles
      db
        .select({
          visitors: count,
          converted: sql<number>`(count(*) filter (where ${t.visitors.converted}))::int`,
          pageviews: sql<number>`coalesce(sum(${t.visitors.pageviews}), 0)::int`,
          events: sql<number>`coalesce(sum(${t.visitors.events}), 0)::int`,
          engagedSeconds: sql<number>`coalesce(sum(${t.visitors.engagedSeconds}), 0)::int`,
        })
        .from(t.visitors)
        .where(live),

      // sessions belong to a visitor, so the join is what keeps my own visits out of the visit count
      db.select({ n: count }).from(t.sessions).innerJoin(t.visitors, eq(t.visitors.id, t.sessions.visitorId)).where(live),

      // the site-wide row of `daily` is the one with an empty path
      db
        .select({ day: t.daily.day, pageviews: t.daily.pageviews, visits: t.daily.visits, uniques: t.daily.uniques })
        .from(t.daily)
        .where(and(eq(t.daily.path, ""), gte(t.daily.day, sinceDay))),

      db
        .select({ key: t.daily.path, count: sql<number>`coalesce(sum(${t.daily.pageviews}), 0)::int` })
        .from(t.daily)
        .where(and(ne(t.daily.path, ""), gte(t.daily.day, sinceDay)))
        .groupBy(t.daily.path)
        .orderBy(desc(sql`coalesce(sum(${t.daily.pageviews}), 0)`))
        .limit(TOP),

      db
        .select({ key: t.sessions.referrer, count })
        .from(t.sessions)
        .innerJoin(t.visitors, eq(t.visitors.id, t.sessions.visitorId))
        .where(and(live, ne(t.sessions.referrer, ""), gte(t.sessions.startedAt, since)))
        .groupBy(t.sessions.referrer)
        .orderBy(desc(count))
        .limit(TOP),

      db
        .select({ key: t.visitors.country, count })
        .from(t.visitors)
        .where(and(live, ne(t.visitors.country, "")))
        .groupBy(t.visitors.country)
        .orderBy(desc(count))
        .limit(TOP),

      db.select({ key: t.visitors.device, count }).from(t.visitors).where(live).groupBy(t.visitors.device).orderBy(desc(count)).limit(TOP),

      db
        .select({ key: t.visitors.browser, count })
        .from(t.visitors)
        .where(and(live, ne(t.visitors.browser, "")))
        .groupBy(t.visitors.browser)
        .orderBy(desc(count))
        .limit(TOP),

      // read · fly · both — which side of the site each visitor uses
      db
        .select({ key: t.visitors.door, count })
        .from(t.visitors)
        .where(and(live, ne(t.visitors.door, "")))
        .groupBy(t.visitors.door)
        .orderBy(desc(count))
        .limit(TOP),

      // how interested they were, as bands: hot · warm · curious · passing
      db.select({ key: t.visitors.intent, count }).from(t.visitors).where(live).groupBy(t.visitors.intent).orderBy(desc(count)).limit(TOP),

      db
        .select({
          id: t.visitors.id,
          firstSeen: t.visitors.firstSeen,
          lastSeen: t.visitors.lastSeen,
          visits: t.visitors.visits,
          pageviews: t.visitors.pageviews,
          events: t.visitors.events,
          engagedSeconds: t.visitors.engagedSeconds,
          country: t.visitors.country,
          city: t.visitors.city,
          device: t.visitors.device,
          os: t.visitors.os,
          browser: t.visitors.browser,
          door: t.visitors.door,
          converted: t.visitors.converted,
          label: t.visitors.label,
          firstReferrer: t.visitors.firstReferrer,
          firstLanding: t.visitors.firstLanding,
          score: t.visitors.score,
          intent: t.visitors.intent,
          scoreWhy: t.visitors.scoreWhy,
          isOwner: t.visitors.isOwner,
          isBot: t.visitors.isBot,
        })
        .from(t.visitors)
        .where(live)
        .orderBy(desc(t.visitors.lastSeen))
        .limit(RECENT),

      db
        .select({ name: t.events.name, key: t.events.target, count })
        .from(t.events)
        .innerJoin(t.visitors, eq(t.visitors.id, t.events.visitorId))
        .where(and(live, ne(t.events.target, ""), gte(t.events.at, since)))
        .groupBy(t.events.name, t.events.target)
        .orderBy(desc(count))
        .limit(TOP_EVENTS),
    ]);

    return ok({
      days,
      since: since.toISOString(),
      totals: {
        visitors: people?.visitors ?? 0,
        sessions: sessionCount?.n ?? 0,
        pageviews: people?.pageviews ?? 0,
        events: people?.events ?? 0,
        converted: people?.converted ?? 0,
        engagedSeconds: people?.engagedSeconds ?? 0,
      },
      series: fill(Math.min(days, 365), series),
      topPaths,
      topReferrers,
      topCountries,
      devices,
      browsers,
      doors,
      intents,
      recentVisitors: recent,
      eventTargets,
    });
  } catch (e) {
    console.error("[admin] stats", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
