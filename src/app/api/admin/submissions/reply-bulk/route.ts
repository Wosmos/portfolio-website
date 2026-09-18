// Reply to several contact-form submissions in one action. Resend's Batch API sends up to 100 distinct
// emails in one call, each addressed to its own recipient — nobody selected ever sees anyone else's
// address, this is never a single email with many people on it. `batchValidation: "permissive"` is what
// makes one bad recipient not sink the whole batch: the response carries per-index errors alongside the
// successes, so a submission is only ever marked "replied" once its own email actually sent.

import { Resend } from "resend";
import { inArray } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok, readBody } from "@/lib/admin-crud";
import { replyEmailHtml } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 20_000;
const MAX_ITEMS = 100;   // Resend's own ceiling per batch call
const FROM = process.env.CONTACT_FROM ?? "Portfolio <onboarding@resend.dev>";

interface Item { id: number; body: string }

function readItems(v: unknown): Item[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_ITEMS) return null;
  const out: Item[] = [];
  const seen = new Set<number>();
  for (const raw of v) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const id = Number(r.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return null;
    if (typeof r.body !== "string" || r.body.trim() === "" || r.body.length > MAX_BODY) return null;
    seen.add(id);
    out.push({ id, body: r.body.trim() });
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[admin] reply-bulk: RESEND_API_KEY is not configured");
    return bad("Email is not configured: set RESEND_API_KEY", 500);
  }
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const payload = await readBody(request);
  if (!payload) return bad("Invalid JSON body", 400);
  const items = readItems(payload.items);
  if (!items) return bad("items must be a non-empty array of {id, body}, up to 100", 400);

  try {
    const rows = await db.select().from(t.submissions).where(inArray(t.submissions.id, items.map((i) => i.id)));
    const byId = new Map(rows.map((r) => [r.id, r]));

    const resultsById = new Map<number, { ok: boolean; error?: string }>();
    const sendable: { item: Item; row: (typeof rows)[number] }[] = [];
    for (const item of items) {
      const row = byId.get(item.id);
      if (!row) resultsById.set(item.id, { ok: false, error: "no such submission" });
      else sendable.push({ item, row });
    }

    if (sendable.length) {
      const { data, error } = await new Resend(key).batch.send(
        sendable.map(({ item, row }) => ({
          from: FROM, to: [row.email], subject: `Re: ${row.subject}`,
          html: replyEmailHtml(row.subject, item.body), text: item.body,
        })),
        { batchValidation: "permissive" },
      );
      if (error) {
        console.error("[admin] reply-bulk resend:", error.name, error.message);
        for (const { item } of sendable) resultsById.set(item.id, { ok: false, error: error.message });
      } else {
        const failedAt = new Map((data?.errors ?? []).map((e) => [e.index, e.message]));
        const okIds: number[] = [];
        let cursor = 0;
        sendable.forEach(({ item }, i) => {
          const failure = failedAt.get(i);
          if (failure) { resultsById.set(item.id, { ok: false, error: failure }); return; }
          const sent = data?.data[cursor++];
          resultsById.set(item.id, sent ? { ok: true } : { ok: false, error: "not sent" });
          if (sent) okIds.push(item.id);
        });
        if (okIds.length) await db.update(t.submissions).set({ state: "replied" }).where(inArray(t.submissions.id, okIds));
      }
    }

    const results = items.map((item) => {
      const r = resultsById.get(item.id) ?? { ok: false, error: "not sent" };
      return { id: item.id, ok: r.ok, error: r.error };
    });
    return ok({ results });
  } catch (e) {
    console.error("[admin] reply-bulk", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
