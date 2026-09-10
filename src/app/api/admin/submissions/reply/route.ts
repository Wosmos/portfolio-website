// Replying to a message from the admin, so the whole exchange starts and ends in one place. The reply
// goes out through Resend and the row moves to "replied" only once the send has actually succeeded.

import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { bad, ok, readBody, readId } from "@/lib/admin-crud";
import { escapeHtml } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 20_000;
// `onboarding@resend.dev` only delivers to the Resend account's own address; set CONTACT_FROM once a
// domain is verified so replies come from wosmo instead.
const FROM = process.env.CONTACT_FROM ?? "Portfolio <onboarding@resend.dev>";

function html(subject: string, message: string): string {
  const body = escapeHtml(message).replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#050508;color:#f2f5ff;font:14px/1.7 ui-monospace,Menlo,monospace">
    <div style="max-width:600px;margin:0 auto;padding:28px 20px">
      <p style="margin:0 0 18px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#00e5ff">wosmo · reply</p>
      <p style="margin:0 0 18px;color:rgba(242,245,255,.5)">${escapeHtml(subject)}</p>
      <div style="padding-top:16px;border-top:1px solid rgba(242,245,255,.1)">${body}</div>
    </div></body></html>`;
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[admin] reply: RESEND_API_KEY is not configured");
    return bad("Email is not configured: set RESEND_API_KEY", 500);
  }
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const payload = await readBody(request);
  if (!payload) return bad("Invalid JSON body", 400);
  const id = readId(payload.id);
  if (id === null) return bad("A numeric id is required", 400);
  const message = payload.body;
  if (typeof message !== "string" || message.trim() === "") return bad("body is required", 400);
  if (message.length > MAX_BODY) return bad(`body is longer than ${MAX_BODY} characters`, 400);

  try {
    const [row] = await db.select().from(t.submissions).where(eq(t.submissions.id, id));
    if (!row) return bad("No such submission", 404);

    const subject = `Re: ${row.subject}`;
    const { data, error } = await new Resend(key).emails.send({
      from: FROM,
      to: [row.email],
      subject,
      html: html(row.subject, message.trim()),
      text: message.trim(),
    });
    if (error) {
      console.error("[admin] reply resend:", error.name, error.message);
      return bad("Could not send the reply", 502);
    }
    await db.update(t.submissions).set({ state: "replied" }).where(eq(t.submissions.id, id));
    return ok({ success: true, id: data?.id ?? "", to: row.email, subject });
  } catch (e) {
    console.error("[admin] reply", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
