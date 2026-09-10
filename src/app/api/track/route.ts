// Analytics ingest. One POST per batch of events from the browser; everything that identifies a
// person (IP, user agent, language) is hashed into a visitor id on the way in and then discarded.
//
// The endpoint is deliberately dumb: it upserts the visitor, upserts the session, appends the events
// and rolls the day counters. No queue, no third party.

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { clientIp, geoFrom, hashVisitor, parseAgent } from "@/lib/fingerprint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENTS = 30;
const SESSION_GAP_MS = 30 * 60 * 1000;   // a gap this long starts a new visit

interface Incoming {
  session?: unknown; path?: unknown; referrer?: unknown; screen?: unknown; timezone?: unknown;
  door?: unknown; engaged?: unknown; scroll?: unknown; utm?: unknown;
  events?: unknown;
}
interface EventIn { name: string; path: string; target: string; value: number | null; meta: Record<string, string | number | boolean> }

const str = (v: unknown, max = 300): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const NAME = /^[a-z_]{2,40}$/;

function readEvents(v: unknown): EventIn[] {
  if (!Array.isArray(v)) return [];
  const out: EventIn[] = [];
  for (const raw of v.slice(0, MAX_EVENTS)) {
    if (typeof raw !== "object" || raw === null) continue;
    const e = raw as Record<string, unknown>;
    const name = str(e.name, 40);
    if (!NAME.test(name)) continue;
    const meta: Record<string, string | number | boolean> = {};
    if (typeof e.meta === "object" && e.meta !== null) {
      for (const [k, val] of Object.entries(e.meta).slice(0, 8)) {
        if (typeof val === "string") meta[k.slice(0, 24)] = val.slice(0, 120);
        else if (typeof val === "number" || typeof val === "boolean") meta[k.slice(0, 24)] = val;
      }
    }
    out.push({ name, path: str(e.path, 200), target: str(e.target, 160), value: num(e.value), meta });
  }
  return out;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const db = getDb();
  if (!db) return NextResponse.json({ ok: false }, { status: 204 });

  let body: Incoming;
  try { body = (await request.json()) as Incoming; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const get = (n: string): string | null => request.headers.get(n);
  const ua = get("user-agent") ?? "";
  const agent = parseAgent(ua);
  if (agent.isBot) return NextResponse.json({ ok: true, skipped: "bot" });   // never counted, never stored

  const language = (get("accept-language") ?? "").split(",")[0] ?? "";
  const visitorId = await hashVisitor(clientIp(get), ua, language);
  const geo = geoFrom(get);
  const sessionId = str(body.session, 64) || `${visitorId}-${Date.now()}`;
  const path = str(body.path, 200) || "/";
  const referrer = str(body.referrer, 300);
  const events = readEvents(body.events);
  const pageviews = events.filter((e) => e.name === "pageview").length;
  const engaged = Math.max(0, Math.min(3600, num(body.engaged) ?? 0));
  const scroll = Math.max(0, Math.min(100, num(body.scroll) ?? 0));
  const door = ["read", "fly"].includes(str(body.door, 8)) ? str(body.door, 8) : "";
  const utm = typeof body.utm === "object" && body.utm !== null ? (body.utm as Record<string, unknown>) : {};
  const now = new Date();

  try {
    // visitor: created on the first sight, then counters only ever move forward
    await db.insert(t.visitors).values({
      id: visitorId, firstSeen: now, lastSeen: now, visits: 1, pageviews, events: events.length,
      engagedSeconds: engaged, country: geo.country, region: geo.region, city: geo.city,
      timezone: str(body.timezone, 64), device: agent.device, os: agent.os, browser: agent.browser,
      screen: str(body.screen, 24), language, firstReferrer: referrer, firstLanding: path,
      utmSource: str(utm.source, 80), utmMedium: str(utm.medium, 80), utmCampaign: str(utm.campaign, 80),
      door,
    }).onConflictDoUpdate({
      target: t.visitors.id,
      set: {
        lastSeen: now,
        pageviews: sql`${t.visitors.pageviews} + ${pageviews}`,
        events: sql`${t.visitors.events} + ${events.length}`,
        engagedSeconds: sql`${t.visitors.engagedSeconds} + ${engaged}`,
        // a gap of more than half an hour counts as coming back
        visits: sql`${t.visitors.visits} + CASE WHEN ${t.visitors.lastSeen} < ${new Date(now.getTime() - SESSION_GAP_MS)} THEN 1 ELSE 0 END`,
        country: sql`CASE WHEN ${t.visitors.country} = '' THEN ${geo.country} ELSE ${t.visitors.country} END`,
        city: sql`CASE WHEN ${t.visitors.city} = '' THEN ${geo.city} ELSE ${t.visitors.city} END`,
        // someone who uses both sides is worth knowing about
        door: door ? sql`CASE WHEN ${t.visitors.door} = '' THEN ${door} WHEN ${t.visitors.door} = ${door} THEN ${door} ELSE 'both' END` : sql`${t.visitors.door}`,
      },
    });

    await db.insert(t.sessions).values({
      id: sessionId, visitorId, startedAt: now, lastAt: now, pageviews, events: events.length,
      engagedSeconds: engaged, maxScroll: Math.round(scroll), entryPath: path, exitPath: path, referrer,
    }).onConflictDoUpdate({
      target: t.sessions.id,
      set: {
        lastAt: now,
        pageviews: sql`${t.sessions.pageviews} + ${pageviews}`,
        events: sql`${t.sessions.events} + ${events.length}`,
        engagedSeconds: sql`${t.sessions.engagedSeconds} + ${engaged}`,
        maxScroll: sql`GREATEST(${t.sessions.maxScroll}, ${Math.round(scroll)})`,
        exitPath: path,
      },
    });

    if (events.length) {
      await db.insert(t.events).values(events.map((e) => ({
        visitorId, sessionId, name: e.name, path: e.path || path, target: e.target, value: e.value, meta: e.meta, at: now,
      })));
    }

    if (pageviews > 0) {
      const day = now.toISOString().slice(0, 10);
      for (const key of [path, ""]) {           // "" is the site-wide row
        await db.insert(t.daily).values({ day, path: key, visits: 1, pageviews, uniques: 1, engagedSeconds: engaged })
          .onConflictDoUpdate({
            target: [t.daily.day, t.daily.path],
            set: {
              pageviews: sql`${t.daily.pageviews} + ${pageviews}`,
              visits: sql`${t.daily.visits} + 1`,
              engagedSeconds: sql`${t.daily.engagedSeconds} + ${engaged}`,
            },
          });
      }
      // uniques are counted honestly: one per visitor per day, resolved from the events table
      const day2 = now.toISOString().slice(0, 10);
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(distinct ${t.events.visitorId})::int` })
        .from(t.events)
        .where(and(eq(t.events.name, "pageview"), sql`${t.events.at} >= ${`${day2} 00:00:00+00`}`));
      await db.update(t.daily).set({ uniques: count }).where(and(eq(t.daily.day, day2), eq(t.daily.path, "")));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[track]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 200 });   // never surface analytics failures
  }
}
