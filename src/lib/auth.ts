// Admin session: a bcrypt-checked password, then an HMAC-signed cookie carrying only an expiry.
// There is no user table because there is one user. Failed attempts are throttled per instance and
// recorded (hashed) so a burst is visible in the admin.

import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, schema as t } from "@/db/client";
import { hashVisitor } from "@/lib/fingerprint";

const COOKIE = "wosmo_admin";
// Dropped alongside the session so /api/track skips the owner's own visits. Not a security cookie.
const NO_TRACK = "wosmo_no_track";
// Set for ten minutes on sign-out so the middleware can send the dashboard's post-logout navigation
// (a hardcoded /admin/login) back to the secret URL instead of a 404. Signed, so only someone who
// held a session a moment ago gets that courtesy.
const EXIT = "wosmo_admin_exit";
const EXIT_TTL_MS = 10 * 60 * 1000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const YEAR_S = 365 * 24 * 60 * 60;
const encoder = new TextEncoder();

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return s;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(mac).toString("base64url");
}
/** Constant-time compare so a wrong signature cannot be probed byte by byte. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Per-instance throttle: N attempts in a window and that source waits. One map per caller so the
// knock endpoint cannot spend the login budget, or the other way round.
interface Limiter { blocked(who: string): boolean; note(who: string): void }
function limiter(max: number, windowMs: number): Limiter {
  const seen = new Map<string, number[]>();
  return {
    blocked(who) {
      const now = Date.now();
      const recent = (seen.get(who) ?? []).filter((x) => now - x < windowMs);
      seen.set(who, recent);
      if (seen.size > 1000) seen.clear();
      return recent.length >= max;
    },
    note(who) {
      const list = seen.get(who) ?? [];
      list.push(Date.now());
      seen.set(who, list);
    },
  };
}

const logins = limiter(5, 10 * 60 * 1000);
/** Five knocks per source per ten minutes: enough for a mistimed triple-click, useless for a sweep. */
export const knocks = limiter(5, 10 * 60 * 1000);

/** The hashed request source both throttles key on: no raw IP is ever kept. */
export async function requestSource(): Promise<string> {
  const h = await headers();
  return hashVisitor(h.get("x-forwarded-for") ?? "", h.get("user-agent") ?? "", "");
}

// The panel lives at /<ADMIN_PATH>/admin, rewritten by src/middleware.ts. Server-only: prefixing this
// with NEXT_PUBLIC_ would compile the secret into every client bundle.
const DEV_SEGMENT = "admin-dev";
let warned = false;

/** The secret segment, or null when it is missing in production — in which case nothing is reachable. */
export function adminSegment(): string | null {
  const raw = process.env.ADMIN_PATH?.trim();
  if (raw && /^[A-Za-z0-9._~-]{16,}$/.test(raw)) return raw;
  if (process.env.NODE_ENV === "production") {
    if (!warned) { warned = true; console.error("[admin] ADMIN_PATH is missing or too short; the panel is unreachable"); }
    return null;
  }
  if (!warned) { warned = true; console.warn(`[admin] ADMIN_PATH is not set; using /${DEV_SEGMENT}/admin in development`); }
  return DEV_SEGMENT;
}

/** The URL the panel answers on, or null when unconfigured. */
export function adminBase(): string | null {
  const segment = adminSegment();
  return segment === null ? null : `/${segment}/admin`;
}

export type LoginResult = "ok" | "invalid" | "throttled" | "unconfigured";

/** bcrypt's own shape: $2<variant>$<cost>$<22 salt + 31 digest>. */
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
let hashWarned = false;

// These two arrive mangled in the two ways this project has actually hit. A dashboard paste brings
// surrounding quotes or stray whitespace; a local .env.local has to write the hash as \$2b\$12\$…
// because next's dotenv would otherwise expand $2b and $12 into nothing. Undoing both here means one
// string works in either place, instead of the same value being right locally and wrong in production.
function envValue(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^(["'])([\s\S]*)\1$/, "$2").replace(/\\\$/g, "$");
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const expectedUser = envValue(process.env.ADMIN_USERNAME);
  const hash = envValue(process.env.ADMIN_PASSWORD_HASH);
  if (!expectedUser || !hash) return "unconfigured";
  // bcryptjs answers a plain false for a hash that is not a hash — it does not throw — so a truncated
  // or expanded value is indistinguishable from a wrong password at the API, and you spend an hour
  // retyping a password that was always right. A malformed hash is a configuration fault; say so.
  if (!BCRYPT.test(hash)) {
    if (!hashWarned) {
      hashWarned = true;
      console.error(`[auth] ADMIN_PASSWORD_HASH is not a bcrypt hash (${hash.length} chars, expected 60) — it is probably dotenv-expanded or truncated`);
    }
    return "unconfigured";
  }

  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const who = await requestSource();
  if (logins.blocked(who)) return "throttled";

  const ok = username === expectedUser && (await bcrypt.compare(password, hash));
  const db = getDb();
  if (db) {
    try { await db.insert(t.adminLogins).values({ ok, fromHash: who, userAgent: ua.slice(0, 300) }); }
    catch (e) { console.error("[auth] could not record the attempt", e); }
  }
  if (!ok) { logins.note(who); return "invalid"; }

  const expires = Date.now() + TTL_MS;
  const payload = String(expires);
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", expires: new Date(expires),
  });
  jar.delete(EXIT);
  // Readable by nothing that matters, so httpOnly buys nothing; /api/track only needs it to be sent.
  jar.set(NO_TRACK, "1", {
    httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: YEAR_S,
  });
  return "ok";
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
  // wosmo_no_track deliberately survives sign-out. It exists so the owner's own browsing never lands
  // in the analytics tables, and the owner browses the public site signed out far more than signed in
  // — clearing it here would start counting exactly the traffic it was set to exclude.
  const expires = Date.now() + EXIT_TTL_MS;
  const payload = String(expires);
  jar.set(EXIT, `${payload}.${await sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", expires: new Date(expires),
  });
}

export async function isAdmin(): Promise<boolean> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value;
    if (!raw) return false;
    const [payload, mac] = raw.split(".");
    if (!payload || !mac) return false;
    if (!same(mac, await sign(payload))) return false;
    const expires = Number(payload);
    return Number.isFinite(expires) && expires > Date.now();
  } catch {
    return false;
  }
}

/** Guard for every admin API route: returns null when the caller is allowed. */
export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "Not authorised" }, { status: 401, headers: { "cache-control": "no-store" } });
}
