// Everything the analytics dashboard draws, in one response, so the client makes one request instead
// of a dozen. Every number is counted by Postgres — nothing here pulls a table into JS to reduce it.

import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { getDb, schema as t, type Db } from "@/db/client";
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

/** The five headline numbers, in two queries rather than five. */
async function totals(db: Db): Promise<{ visitors: number; sessions: number; pageviews: number; events: number; converted: number }> {
  const [people] = await db
    .select({
      visitors: count,
      converted: sql<number>`(count(*) filter (where ${t.visitors.converted}))::int`,
      pageviews: sql<number>`coalesce(sum(${t.visitors.pageviews}), 0)::int`,
      events: sql<number>`coalesce(sum(${t.visitors.events}), 0)::int`,
    })
    .from(t.visitors)
    .where(eq(t.visitors.isBot, false));
  const [sessionCount] = await db.select({ n: count }).from(t.sessions);
  return {
    visitors: people?.visitors ?? 0,
    sessions: sessionCount?.n ?? 0,
    pageviews: people?.pageviews ?? 0,
    events: people?.events ?? 0,
    converted: people?.converted ?? 0,
  };
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const days = readDays(new URL(request.url).searchParams.get("days"));
  const since = new Date(Date.now() - days * 86_400_000);
  const sinceDay = dayOf(since);
  const live = eq(t.visitors.isBot, false);

  try {
    const [head, series, topPaths, topReferrers, topCountries, devices, browsers, doors, recent, eventTargets] = await Promise.all([
      totals(db),

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
        .where(and(ne(t.sessions.referrer, ""), gte(t.sessions.startedAt, since)))
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
        })
        .from(t.visitors)
        .where(live)
        .orderBy(desc(t.visitors.lastSeen))
        .limit(RECENT),

      db
        .select({ name: t.events.name, key: t.events.target, count })
        .from(t.events)
        .where(and(ne(t.events.target, ""), gte(t.events.at, since)))
        .groupBy(t.events.name, t.events.target)
        .orderBy(desc(count))
        .limit(TOP_EVENTS),
    ]);

    return ok({
      days,
      since: since.toISOString(),
      totals: head,
      series: fill(Math.min(days, 365), series),
      topPaths,
      topReferrers,
      topCountries,
      devices,
      browsers,
      doors,
      recentVisitors: recent,
      eventTargets,
    });
  } catch (e) {
    console.error("[admin] stats", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
