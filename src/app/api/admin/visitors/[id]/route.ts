// One visitor's whole history: the profile, their recent sessions and their recent events. The id is
// the salted hash the tracker derives, so this is a device-and-network profile, not a person's name.

import { desc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok } from "@/lib/admin-crud";

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
    const [visitor] = await db.select().from(t.visitors).where(eq(t.visitors.id, id));
    if (!visitor) return bad("No such visitor", 404);
    const [sessions, events] = await Promise.all([
      db.select().from(t.sessions).where(eq(t.sessions.visitorId, id)).orderBy(desc(t.sessions.startedAt)).limit(SESSIONS),
      db.select().from(t.events).where(eq(t.events.visitorId, id)).orderBy(desc(t.events.at)).limit(EVENTS),
    ]);
    return ok({ visitor, sessions, events });
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
