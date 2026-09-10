// Free-form key/value, for anything that does not deserve a column yet. GET returns every row, PUT
// upserts one key — so the client never has to send the whole set back — and DELETE drops one.

import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { revalidateContent } from "@/lib/content";
import { bad, ok, readBody } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;

export async function GET(): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);
  try {
    return ok(await db.select().from(t.settings).orderBy(t.settings.key));
  } catch (e) {
    console.error("[admin] settings GET", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}

export async function PUT(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const body = await readBody(request);
  if (!body) return bad("Invalid JSON body", 400);
  const key = body.key;
  if (typeof key !== "string" || !KEY.test(key)) return bad("key must be 1–64 characters of a–z, 0–9, dot, colon, dash or underscore", 400);
  if (!("value" in body)) return bad("value is required", 400);
  const value: unknown = body.value;
  if (value === undefined) return bad("value is required", 400);

  try {
    const now = new Date();
    const rows = await db
      .insert(t.settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: t.settings.key, set: { value, updatedAt: now } })
      .returning();
    revalidateContent();
    return ok(rows[0] ?? null);
  } catch (e) {
    console.error("[admin] settings PUT", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const key = new URL(request.url).searchParams.get("key");
  if (!key || !KEY.test(key)) return bad("A key is required", 400);
  try {
    const rows = await db.delete(t.settings).where(eq(t.settings.key, key)).returning();
    if (!rows[0]) return bad("No such setting", 404);
    revalidateContent();
    return ok({ success: true });
  } catch (e) {
    console.error("[admin] settings DELETE", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
