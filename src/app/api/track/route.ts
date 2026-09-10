// Analytics ingest. One POST per batch of events from the browser; everything that identifies a person
// (IP, user agent, language) is hashed into a visitor id on the way in and then discarded.
//
// Cost, because this endpoint is called by every visitor and pays for itself in latency:
//
//   before — up to seven sequential round trips per request (visitor upsert, session upsert, events
//   insert, two daily upserts in a loop, a count(distinct) select, a daily update).
//
//   now — at most two. The first is a single `db.batch([…])`, which Neon runs as one HTTPS request and
//   one transaction: the visitor upsert (RETURNING the row, so scoring needs no read), the session
//   upsert, one multi-row insert for every event in the batch, one two-row insert for the day counters,
//   and the uniques recount only when a visit actually began. The second is the score write, and it is
//   skipped whenever the score has not moved — which is most batches, because the score ratchets.
//
// Nothing is written for me (the wosmo_no_track cookie, the ADMIN_VISITOR_HASHES allow-list, or a
// session that touched an /admin path) and nothing at all is written for a crawler.

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb, schema as t } from "@/db/client";
import { clientIp, geoFrom, hashVisitor, isAllowListedOwner, isPrivateIp, looksAutomated, NO_TRACK_COOKIE, parseAgent } from "@/lib/fingerprint";
import { scoreVisitor, signalsFrom } from "@/lib/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENTS = 30;
const SESSION_GAP_MS = 30 * 60 * 1000;   // a gap this long starts a new visit

// One visitor hash may send this many batches per minute. A real tab flushes a handful of times a
// minute at most (see src/lib/tracker.ts), so anything above this is a loop or a script. The counter
// lives in the instance's memory on purpose: it is not a security control — the endpoint writes nothing
// an attacker wants — it is a guard against one misbehaving client, and one client lands on one warm
// instance. A cold instance starting with an empty map costs us nothing.
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;
const seen = new Map<string, number[]>();

function rateLimited(who: string): boolean {
  const now = Date.now();
  const recent = (seen.get(who) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
  recent.push(now);
  seen.set(who, recent);
  if (seen.size > 5000) seen.clear();   // the map is a cache, not a ledger
  return recent.length > RATE_MAX;
}

interface Incoming {
  session?: unknown; path?: unknown; referrer?: unknown; screen?: unknown; timezone?: unknown;
  door?: unknown; engaged?: unknown; scroll?: unknown; utm?: unknown; fresh?: unknown; wd?: unknown;
  events?: unknown;
}
interface EventIn { name: string; path: string; target: string; value: number | null; meta: Record<string, string | number | boolean> }

const str = (v: unknown, max = 300): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const NAME = /^[a-z_]{2,40}$/;
/** Booleans as literals rather than parameters, so Postgres never has to infer their type in an OR. */
const bool = (v: boolean): SQL => (v ? sql`true` : sql`false`);

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

const isAdminPath = (path: string): boolean => path.includes("/admin");

export async function POST(request: NextRequest): Promise<NextResponse> {
  // a beacon is a few hundred bytes; anything this large is someone probing the endpoint
  const raw = await request.text().catch(() => "");
  if (raw.length > 24_000) return new NextResponse(null, { status: 413 });
  // Mechanism one for not counting myself: the admin login drops this cookie, and it outlives the
  // session because I read the public site signed out far more often than signed in.
  if (request.cookies.get(NO_TRACK_COOKIE)?.value === "1") return new NextResponse(null, { status: 204 });

  const db = getDb();
  if (!db) return new NextResponse(null, { status: 204 });

  let body: Incoming;
  try { body = (await request.json()) as Incoming; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const get = (n: string): string | null => request.headers.get(n);
  const ua = get("user-agent") ?? "";
  const agent = parseAgent(ua);
  if (agent.isBot) return new NextResponse(null, { status: 204 });   // never counted, never stored

  const ip = clientIp(get);
  const language = (get("accept-language") ?? "").split(",")[0] ?? "";
  const visitorId = await hashVisitor(ip, ua, language);
  if (rateLimited(visitorId)) return new NextResponse(null, { status: 429 });

  const path = str(body.path, 200) || "/";
  const events = readEvents(body.events);
  const pageviews = events.filter((e) => e.name === "pageview").length;
  const engaged = Math.max(0, Math.min(3600, num(body.engaged) ?? 0));
  const scroll = Math.max(0, Math.min(100, num(body.scroll) ?? 0));

  // A flush that carries nothing is a bug in the client, not a visit: answer without touching Postgres.
  if (!events.length && engaged === 0 && scroll === 0) return new NextResponse(null, { status: 204 });

  // Mechanism two: the env allow-list, anything that touched the admin, and — in development only —
  // localhost. Flagged rather than dropped, so local testing still writes rows it can look at.
  const owner =
    isAllowListedOwner(visitorId) ||
    isAdminPath(path) || events.some((e) => isAdminPath(e.path)) ||
    (process.env.NODE_ENV !== "production" && isPrivateIp(ip));
  const automation = looksAutomated(get, { webdriver: body.wd === true });

  const geo = geoFrom(get);
  const sessionId = str(body.session, 64) || `${visitorId}-${Date.now()}`;
  const referrer = str(body.referrer, 300);
  const door = ["read", "fly"].includes(str(body.door, 8)) ? str(body.door, 8) : "";
  const utm = typeof body.utm === "object" && body.utm !== null ? (body.utm as Record<string, unknown>) : {};
  // The tracker sets this on the first flush of a session id, which is the only moment a visit begins.
  const fresh = body.fresh === true;
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const counted = !owner && !automation;

  try {
    // ── round trip one ────────────────────────────────────
    const upsertVisitor = db.insert(t.visitors).values({
      id: visitorId, firstSeen: now, lastSeen: now, visits: 1, pageviews, events: events.length,
      engagedSeconds: engaged, country: geo.country, region: geo.region, city: geo.city,
      timezone: str(body.timezone, 64), device: agent.device, os: agent.os, browser: agent.browser,
      screen: str(body.screen, 24), language, firstReferrer: referrer, firstLanding: path,
      utmSource: str(utm.source, 80), utmMedium: str(utm.medium, 80), utmCampaign: str(utm.campaign, 80),
      door, isOwner: owner, isBot: automation,
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
        // both flags are sticky: once a profile is mine, or scripted, it never quietly becomes a lead
        isOwner: sql`${t.visitors.isOwner} or ${bool(owner)}`,
        isBot: sql`${t.visitors.isBot} or ${bool(automation)}`,
      },
    }).returning({
      isOwner: t.visitors.isOwner, isBot: t.visitors.isBot, visits: t.visitors.visits,
      pageviews: t.visitors.pageviews, engagedSeconds: t.visitors.engagedSeconds,
      firstSeen: t.visitors.firstSeen, lastSeen: t.visitors.lastSeen, firstReferrer: t.visitors.firstReferrer,
      firstLanding: t.visitors.firstLanding, converted: t.visitors.converted,
      score: t.visitors.score, intent: t.visitors.intent, scoreWhy: t.visitors.scoreWhy,
    });

    const rest: BatchItem<"pg">[] = [
      db.insert(t.sessions).values({
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
      }),
    ];

    // one statement for the whole batch, however many events it carries
    if (events.length) {
      rest.push(db.insert(t.events).values(events.map((e) => ({
        visitorId, sessionId, name: e.name, path: e.path || path, target: e.target, value: e.value, meta: e.meta, at: now,
      }))));
    }

    // `daily` has no visitor column, so the only way to keep my own and a script's traffic out of the
    // dashboard's day series is to never write the rows in the first place.
    if (pageviews > 0 && counted) {
      const visit = fresh ? 1 : 0;
      rest.push(db.insert(t.daily)
        // two rows, one insert: the path's own row and the site-wide row, which is the one with no path
        .values([path, ""].map((key) => ({ day, path: key, visits: visit, pageviews, uniques: 0, engagedSeconds: engaged })))
        .onConflictDoUpdate({
          target: [t.daily.day, t.daily.path],
          set: {
            pageviews: sql`${t.daily.pageviews} + ${pageviews}`,
            visits: sql`${t.daily.visits} + ${visit}`,
            engagedSeconds: sql`${t.daily.engagedSeconds} + ${engaged}`,
          },
        }));

      // Uniques are counted honestly — one person per day, from the events table — but only when a visit
      // actually began, which is the only moment the number can change. It runs after the insert above
      // in the same transaction, so it sees this batch, and it costs no extra round trip.
      if (fresh) {
        rest.push(db.update(t.daily)
          .set({
            uniques: sql`(select count(distinct ${t.events.visitorId})::int from ${t.events}
              join ${t.visitors} on ${t.visitors.id} = ${t.events.visitorId}
              where ${t.events.name} = 'pageview' and ${t.events.at} >= ${`${day} 00:00:00+00`}
                and not ${t.visitors.isOwner} and not ${t.visitors.isBot})`,
          })
          .where(and(eq(t.daily.day, day), eq(t.daily.path, ""))));
      }
    }

    const [[profile]] = await db.batch([upsertVisitor, ...rest]);
    if (!profile) return NextResponse.json({ ok: true });

    // ── round trip two, when the score has actually moved ─
    const lead = scoreVisitor(signalsFrom({
      profile,
      events,
      maxScroll: scroll,
      automation: profile.isBot,
      previous: { score: profile.score, why: profile.scoreWhy },
    }));
    if (lead.score !== profile.score || lead.intent !== profile.intent) {
      await db.update(t.visitors)
        .set({ score: lead.score, intent: lead.intent, scoreWhy: lead.why, scoredAt: now })
        .where(eq(t.visitors.id, visitorId));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[track]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 200 });   // never surface analytics failures
  }
}
