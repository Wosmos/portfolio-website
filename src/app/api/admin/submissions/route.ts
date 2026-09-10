// The inbox. Contact-form messages, newest first, with a state the admin moves them through.

import { desc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok, readBody, readId } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const STATES = ["new", "read", "replied", "archived", "spam"] as const;
export type SubmissionState = (typeof STATES)[number];
export const isState = (v: unknown): v is SubmissionState => STATES.some((s) => s === v);

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function readLimit(raw: string | null): number {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(n)));
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const params = new URL(request.url).searchParams;
  const state = params.get("state");
  if (state !== null && !isState(state)) return bad(`state must be one of ${STATES.join(", ")}`, 400);

  try {
    const where = state === null ? undefined : eq(t.submissions.state, state);
    const rows = await db
      .select()
      .from(t.submissions)
      .where(where)
      .orderBy(desc(t.submissions.createdAt))
      .limit(readLimit(params.get("limit")));
    return ok(rows);
  } catch (e) {
    console.error("[admin] submissions GET", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}

/** Moves a message between states and keeps a private note against it. */
export async function PATCH(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const body = await readBody(request);
  if (!body) return bad("Invalid JSON body", 400);
  const id = readId(body.id);
  if (id === null) return bad("A numeric id is required", 400);

  const patch: { state?: SubmissionState; notes?: string } = {};
  if (body.state !== undefined) {
    if (!isState(body.state)) return bad(`state must be one of ${STATES.join(", ")}`, 400);
    patch.state = body.state;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" || body.notes.length > 4000) return bad("notes must be text of at most 4000 characters", 400);
    patch.notes = body.notes;
  }
  if (patch.state === undefined && patch.notes === undefined) return bad("Nothing to update: send state or notes", 400);

  try {
    const rows = await db.update(t.submissions).set(patch).where(eq(t.submissions.id, id)).returning();
    const row = rows[0];
    if (!row) return bad("No such submission", 404);
    return ok(row);
  } catch (e) {
    console.error("[admin] submissions PATCH", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const id = readId(new URL(request.url).searchParams.get("id"));
  if (id === null) return bad("A numeric id is required", 400);
  try {
    const rows = await db.delete(t.submissions).where(eq(t.submissions.id, id)).returning();
    if (!rows[0]) return bad("No such submission", 404);
    return ok({ success: true });
  } catch (e) {
    console.error("[admin] submissions DELETE", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
