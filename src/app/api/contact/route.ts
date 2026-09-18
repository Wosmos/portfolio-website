import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { person } from "@/data/portfolio";
import { clientIp, geoFrom, hashVisitor } from "@/lib/fingerprint";
import { contactAll, contactByEmail, contactByIp, requestIp, sourceKey, tooMany, waitFor } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This is the one route the public can reach that costs money and lands in a human inbox, so it is
// limited three ways at once — by source, by the address being claimed, and in total per instance —
// and it also refuses a submission that arrived faster than a person could have typed it.
const MIN_FILL_MS = 2_000;
const MAX_BODY = 12_000;

const MAX = { name: 100, email: 254, subject: 150, message: 5000 } as const;
type Field = keyof typeof MAX;
const FIELDS = Object.keys(MAX) as Field[];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `onboarding@resend.dev` only delivers to the Resend account's own address. Verify a domain at
// resend.com/domains and set CONTACT_FROM to send from wosmo instead.
const FROM = process.env.CONTACT_FROM ?? "Portfolio Contact <onboarding@resend.dev>";
const TO = process.env.CONTACT_TO ?? person.email;

const bad = (error: string, status: number): NextResponse => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("[contact] RESEND_API_KEY is not configured");
      return bad("Email service is not configured", 500);
    }
    const ip = requestIp(request);
    const bySource = contactByIp.hit(await sourceKey("contact", ip));
    if (!bySource.ok) return tooMany(`That is enough messages for now. Try again ${waitFor(bySource.retryAfter)}.`, bySource.retryAfter);
    const everyone = contactAll.hit("all");
    if (!everyone.ok) return tooMany(`The inbox is busy. Try again ${waitFor(everyone.retryAfter)}.`, everyone.retryAfter);

    // a body this long is not a message, it is someone testing what the endpoint accepts
    const text = await request.text().catch(() => "");
    if (text.length > MAX_BODY) return bad("That message is too long", 413);
    const body: unknown = (() => { try { return JSON.parse(text) as unknown; } catch { return null; } })();
    if (body === null || typeof body !== "object") return bad("Invalid JSON", 400);
    const raw = body as Record<string, unknown>;

    // Honeypot: a hidden field real visitors never fill. The bot still gets a plain "success" so it
    // learns nothing, but the trip is logged and kept (state: "spam") instead of silently discarded —
    // an off-screen-positioned honeypot used to get filled by browser/password-manager autofill on a
    // real visitor's machine, and that message must stay recoverable, not vanish without a trace.
    if (typeof raw.website === "string" && raw.website.trim() !== "") {
      console.warn("[contact] honeypot tripped", { website: raw.website.slice(0, 80) });
      const db = getDb();
      if (db) {
        const pick = (k: Field): string => (typeof raw[k] === "string" ? (raw[k] as string).slice(0, MAX[k]) : "");
        try {
          const get = (n: string): string | null => request.headers.get(n);
          const ua = get("user-agent") ?? "";
          const lang = (get("accept-language") ?? "").split(",")[0] ?? "";
          const visitorId = await hashVisitor(clientIp(get), ua, lang);
          const geo = geoFrom(get);
          await db.insert(t.submissions).values({
            name: pick("name"), email: pick("email"), subject: pick("subject"), message: pick("message"),
            visitorId, country: geo.country, city: geo.city, referrer: (get("referer") ?? "").slice(0, 300),
            userAgent: ua.slice(0, 300), emailId: "", state: "spam",
          });
        } catch (dbErr) {
          console.error("[contact] could not store the flagged submission", dbErr instanceof Error ? dbErr.message : dbErr);
        }
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const values: Record<Field, string> = { name: "", email: "", subject: "", message: "" };
    for (const field of FIELDS) {
      const v = raw[field];
      if (typeof v !== "string" || v.trim() === "" || v.length > MAX[field]) return bad(`Invalid ${field}`, 400);
      values[field] = v.trim();
    }
    if (!EMAIL.test(values.email)) return bad("Invalid email format", 400);

    // The form stamps itself when it renders. Nothing legitimate arrives two seconds later, and a
    // missing or nonsense stamp is treated as fine so an old cached page still works.
    const stamp = Number(raw.at);
    if (Number.isFinite(stamp) && stamp > 0 && Date.now() - stamp < MIN_FILL_MS) {
      return bad("That was too quick — have another look and send it again", 400);
    }
    const byEmail = contactByEmail.hit(await sourceKey("contact-email", values.email.toLowerCase()));
    if (!byEmail.ok) return tooMany(`You have already written a few times. Try again ${waitFor(byEmail.retryAfter)}.`, byEmail.retryAfter);

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

    // optional phone push. NTFY_TOPIC is a topic name on ntfy.sh (or NTFY_URL for a self-hosted
    // server); failures are logged and ignored — the email is what must not be lost.
    const notify = async (): Promise<void> => {
      const topic = process.env.NTFY_TOPIC;
      if (!topic) return;
      const base = process.env.NTFY_URL ?? "https://ntfy.sh";
      try {
        const r = await fetch(`${base}/${topic}`, {
          method: "POST",
          headers: {
            title: `Portfolio: ${values.name}`,
            tags: "envelope",
            click: "https://mail.google.com/",
            ...(process.env.NTFY_TOKEN ? { authorization: `Bearer ${process.env.NTFY_TOKEN}` } : {}),
          },
          body: `${values.subject}\n${values.email}\n\n${values.message.slice(0, 400)}`,
        });
        if (!r.ok) console.error("[contact] ntfy", r.status);
      } catch (e) { console.error("[contact] ntfy", e instanceof Error ? e.message : e); }
    };

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
    // keep a copy so the admin inbox has a history, and tie it to the visitor profile that sent it
    const db = getDb();
    if (db) {
      try {
        const get = (n: string): string | null => request.headers.get(n);
        const ua = get("user-agent") ?? "";
        const lang = (get("accept-language") ?? "").split(",")[0] ?? "";
        const visitorId = await hashVisitor(clientIp(get), ua, lang);
        const geo = geoFrom(get);
        await db.insert(t.submissions).values({
          name: values.name, email: values.email, subject: values.subject, message: values.message,
          visitorId, country: geo.country, city: geo.city, referrer: (get("referer") ?? "").slice(0, 300),
          userAgent: ua.slice(0, 300), emailId: data?.id ?? "",
        });
        await db.update(t.visitors).set({ converted: true }).where(eq(t.visitors.id, visitorId));
      } catch (dbErr) {
        console.error("[contact] could not store the submission", dbErr instanceof Error ? dbErr.message : dbErr);
      }
    }
    await notify();
    return NextResponse.json({ success: true, message: "Email sent successfully", id: data?.id }, { status: 200 });
  } catch (e) {
    console.error("[contact]", e instanceof Error ? e.message : e);
    return bad("Internal server error", 500);
  }
}
