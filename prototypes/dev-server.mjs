// Prototype dev server: static files from prototypes/ + POST /api/contact → Resend.
// Same contract as src/app/api/contact/route.ts so the form is tested end-to-end before the port.
//   node prototypes/dev-server.mjs            (port 4173)
// Reads RESEND_API_KEY from the repo's .env.local (never logged). Without it the endpoint answers 500.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const TO = "m.wasifmalik17@gmail.com";                 // same inbox as the Next route
const FROM = "Portfolio Contact <onboarding@resend.dev>";

// .env.local at the repo root (one level up), no dependency on dotenv
for (const f of [join(ROOT, "..", ".env.local"), join(ROOT, "..", ".env")]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const KEY = process.env.RESEND_API_KEY || "";

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".pdf": "application/pdf", ".woff2": "font/woff2", ".ico": "image/x-icon", ".md": "text/markdown; charset=utf-8" };

const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const MAX = { name: 100, email: 254, subject: 150, message: 5000 };
const hits = new Map(); const RATE = 5, WINDOW = 60 * 60 * 1000;
const limited = (ip) => { const now = Date.now(); const r = (hits.get(ip) || []).filter((t) => now - t < WINDOW); r.push(now); hits.set(ip, r); return r.length > RATE; };
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };

async function contact(req, res) {
  if (!KEY) return json(res, 500, { error: "Email service is not configured" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  if (limited(ip)) return json(res, 429, { error: "Too many requests. Please try again later." });
  let body = "";
  for await (const chunk of req) { body += chunk; if (body.length > 64_000) return json(res, 413, { error: "Payload too large" }); }
  let d; try { d = JSON.parse(body); } catch { return json(res, 400, { error: "Invalid JSON" }); }
  if (typeof d.website === "string" && d.website.trim()) return json(res, 200, { success: true }); // honeypot: accept and drop
  for (const [k, lim] of Object.entries(MAX)) { const v = d[k]; if (typeof v !== "string" || !v.trim() || v.length > lim) return json(res, 400, { error: `Invalid ${k}` }); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json(res, 400, { error: "Invalid email format" });
  const s = { name: esc(d.name), email: esc(d.email), subject: esc(d.subject), message: esc(d.message).replace(/\n/g, "<br>") };
  const html = `<!doctype html><html><body style="margin:0;background:#050508;color:#f2f5ff;font:14px/1.6 ui-monospace,Menlo,monospace">
    <div style="max-width:600px;margin:0 auto;padding:28px 20px">
      <p style="margin:0 0 18px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#00e5ff">wosmo · portfolio contact</p>
      <table style="width:100%;border-collapse:collapse">
        ${[["name", s.name], ["email", `<a style="color:#00e5ff" href="mailto:${s.email}">${s.email}</a>`], ["subject", s.subject]].map(([k, v]) => `<tr><td style="padding:8px 0;color:rgba(242,245,255,.5);width:90px;vertical-align:top;border-top:1px solid rgba(242,245,255,.1)">${k}</td><td style="padding:8px 0;border-top:1px solid rgba(242,245,255,.1)">${v}</td></tr>`).join("")}
        <tr><td style="padding:8px 0;color:rgba(242,245,255,.5);vertical-align:top;border-top:1px solid rgba(242,245,255,.1)">message</td><td style="padding:8px 0;border-top:1px solid rgba(242,245,255,.1)">${s.message}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;color:rgba(242,245,255,.35)">sent from the portfolio contact form · reply goes to the sender</p>
    </div></body></html>`;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: d.email, subject: `Portfolio Contact: ${d.subject}`, html }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("[contact] resend", r.status, j?.message || j?.name || ""); return json(res, 502, { error: "Failed to send email" }); }
    console.log(`[contact] sent ${j.id} from ${d.email}`);
    return json(res, 200, { success: true, message: "Email sent successfully", id: j.id });
  } catch (e) { console.error("[contact]", e.message); return json(res, 500, { error: "Internal server error" }); }
}

async function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const st = await stat(file);
    if (st.isDirectory()) { res.writeHead(301, { location: path + "/" }); return res.end(); }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream", "content-length": st.size, "cache-control": "no-cache" });
    res.end(await readFile(file));
  } catch { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); }
}

createServer(async (req, res) => {
  if (req.url.startsWith("/api/contact")) {
    if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST" }); return res.end(); }
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    return contact(req, res);
  }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  return serveStatic(req, res);
}).listen(PORT, () => console.log(`prototypes → http://localhost:${PORT}/   contact endpoint: ${KEY ? "configured" : "NO KEY (set RESEND_API_KEY in .env.local)"}`));
