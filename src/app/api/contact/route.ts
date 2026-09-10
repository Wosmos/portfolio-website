import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { person } from "@/data/portfolio";
import { escapeHtml } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort in-memory rate limit. Per-instance only (serverless instances do not share this map),
// so it is a coarse abuse brake rather than a guarantee.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();               // bound the map on a long-lived instance
  return recent.length > RATE_LIMIT;
}

const MAX = { name: 100, email: 254, subject: 150, message: 5000 } as const;
type Field = keyof typeof MAX;
const FIELDS = Object.keys(MAX) as Field[];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `onboarding@resend.dev` only delivers to the Resend account's own address. Verify a domain at
// resend.com/domains and set CONTACT_FROM to send from wosmo instead.
const FROM = process.env.CONTACT_FROM ?? "Portfolio Contact <onboarding@resend.dev>";
const TO = process.env.CONTACT_TO ?? person.email;

const bad = (error: string, status: number): NextResponse => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("[contact] RESEND_API_KEY is not configured");
      return bad("Email service is not configured", 500);
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) return bad("Too many requests. Please try again later.", 429);

    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== "object") return bad("Invalid JSON", 400);
    const raw = body as Record<string, unknown>;

    // Honeypot: a hidden field real visitors never fill. Accept and drop, so the bot learns nothing.
    if (typeof raw.website === "string" && raw.website.trim() !== "") return NextResponse.json({ success: true }, { status: 200 });

    const values: Record<Field, string> = { name: "", email: "", subject: "", message: "" };
    for (const field of FIELDS) {
      const v = raw[field];
      if (typeof v !== "string" || v.trim() === "" || v.length > MAX[field]) return bad(`Invalid ${field}`, 400);
      values[field] = v.trim();
    }
    if (!EMAIL.test(values.email)) return bad("Invalid email format", 400);

    const safe = {
      name: escapeHtml(values.name),
      email: escapeHtml(values.email),
      subject: escapeHtml(values.subject),
      message: escapeHtml(values.message).replace(/\n/g, "<br>"),
    };
    const rows: [string, string][] = [
      ["name", safe.name],
      ["email", `<a style="color:#00e5ff" href="mailto:${safe.email}">${safe.email}</a>`],
      ["subject", safe.subject],
      ["message", safe.message],
    ];
    const html = `<!doctype html><html><body style="margin:0;background:#050508;color:#f2f5ff;font:14px/1.6 ui-monospace,Menlo,monospace">
      <div style="max-width:600px;margin:0 auto;padding:28px 20px">
        <p style="margin:0 0 18px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#00e5ff">wosmo · portfolio contact</p>
        <table style="width:100%;border-collapse:collapse">
          ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:rgba(242,245,255,.5);width:90px;vertical-align:top;border-top:1px solid rgba(242,245,255,.1)">${k}</td><td style="padding:8px 0;border-top:1px solid rgba(242,245,255,.1)">${v}</td></tr>`).join("")}
        </table>
        <p style="margin:24px 0 0;font-size:11px;color:rgba(242,245,255,.35)">sent from the portfolio contact form · reply goes to the sender</p>
      </div></body></html>`;

    const { data, error } = await new Resend(key).emails.send({
      from: FROM,
      to: [TO],
      replyTo: values.email,
      subject: `Portfolio Contact: ${values.subject}`,
      html,
      text: `${values.name} <${values.email}>\n\n${values.message}`,
    });
    if (error) {
      console.error("[contact] resend:", error.name, error.message);
      return bad("Failed to send email", 502);
    }
    return NextResponse.json({ success: true, message: "Email sent successfully", id: data?.id }, { status: 200 });
  } catch (e) {
    console.error("[contact]", e instanceof Error ? e.message : e);
    return bad("Internal server error", 500);
  }
}
