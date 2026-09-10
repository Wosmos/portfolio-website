// Admin session: a bcrypt-checked password, then an HMAC-signed cookie carrying only an expiry.
// There is no user table because there is one user. Failed attempts are throttled per instance and
// recorded (hashed) so a burst is visible in the admin.

import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, schema as t } from "@/db/client";
import { hashVisitor } from "@/lib/fingerprint";

const COOKIE = "wosmo_admin";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
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

// Per-instance login throttle: five wrong passwords in ten minutes and that source waits.
const attempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
function throttled(who: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(who) ?? []).filter((x) => now - x < WINDOW_MS);
  attempts.set(who, recent);
  if (attempts.size > 1000) attempts.clear();
  return recent.length >= MAX_ATTEMPTS;
}
function noteAttempt(who: string): void {
  const list = attempts.get(who) ?? [];
  list.push(Date.now());
  attempts.set(who, list);
}

export type LoginResult = "ok" | "invalid" | "throttled" | "unconfigured";

export async function login(username: string, password: string): Promise<LoginResult> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !hash) return "unconfigured";

  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const who = await hashVisitor(h.get("x-forwarded-for") ?? "", ua, "");
  if (throttled(who)) return "throttled";

  const ok = username === expectedUser && (await bcrypt.compare(password, hash));
  const db = getDb();
  if (db) {
    try { await db.insert(t.adminLogins).values({ ok, fromHash: who, userAgent: ua.slice(0, 300) }); }
    catch (e) { console.error("[auth] could not record the attempt", e); }
  }
  if (!ok) { noteAttempt(who); return "invalid"; }

  const expires = Date.now() + TTL_MS;
  const payload = String(expires);
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", expires: new Date(expires),
  });
  return "ok";
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
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
  return Response.json({ error: "Not authorised" }, { status: 401 });
}
