// One visitor's whole history: the profile, their recent sessions, their recent events and why the
// intent engine gave them the score it did. The id is the salted hash the tracker derives, so this is a
// device-and-network profile, not a person's name.
//
// The lead score here is recomputed from the history that comes back rather than read off the row: the
// row's copy is the running one /api/track keeps up to date batch by batch, and this is the audit of it.

import { desc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok } from "@/lib/admin-crud";
import { scoreVisitor, signalsFrom, type LeadScore } from "@/lib/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSIONS = 20;
const EVENTS = 100;
const ID = /^[a-f0-9]{8,64}$/;

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const { id } = await context.params;
  if (!ID.test(id)) return bad("That is not a visitor id", 400);

  try {
    const [[visitor], sessions, events] = await db.batch([
      db.select().from(t.visitors).where(eq(t.visitors.id, id)),
      db.select().from(t.sessions).where(eq(t.sessions.visitorId, id)).orderBy(desc(t.sessions.startedAt)).limit(SESSIONS),
      db.select().from(t.events).where(eq(t.events.visitorId, id)).orderBy(desc(t.events.at)).limit(EVENTS),
    ]);
    if (!visitor) return bad("No such visitor", 404);

    const lead: LeadScore = scoreVisitor(signalsFrom({
      profile: visitor,
      events,
      maxScroll: Math.max(0, ...sessions.map((s) => s.maxScroll)),
      pagesInSession: Math.max(0, ...sessions.map((s) => s.pageviews)),
      automation: visitor.isBot,
      // only the last hundred events came back, so the stored score keeps whatever happened before them
      previous: { score: visitor.score, why: visitor.scoreWhy },
    }));

    return ok({ visitor, sessions, events, lead });
  } catch (e) {
    console.error("[admin] visitor GET", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}

/** Sessions and events carry ON DELETE CASCADE, so removing the profile removes the whole trail. */
export async function DELETE(_request: Request, context: Context): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const { id } = await context.params;
  if (!ID.test(id)) return bad("That is not a visitor id", 400);

  try {
    const rows = await db.delete(t.visitors).where(eq(t.visitors.id, id)).returning({ id: t.visitors.id });
    if (!rows[0]) return bad("No such visitor", 404);
    return ok({ success: true });
  } catch (e) {
    console.error("[admin] visitor DELETE", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
