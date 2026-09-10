// Rate limiting: fixed windows in memory, keyed by a hashed source.
//
// Serverless means per-instance memory. Every instance keeps its own map, so "five an hour" is five an
// hour *on this instance*, and a request that lands on a cold one starts from zero. That makes this a
// coarse brake rather than a guarantee, which is why the numbers below are picked to be useful anyway:
// tight enough that one machine cannot fill the inbox, loose enough that a person never meets them.
// A shared store (Upstash, Vercel KV) would make them exact without changing the shape here.
//
// Nothing that identifies a person is held: the keys are salted SHA-256, like the visitor ids.

import { headers } from "next/headers";
import { clientIp, sha256 } from "@/lib/fingerprint";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export interface Rule {
  /** How many hits one key may spend in a window. */
  limit: number;
  windowMs: number;
}

export type Verdict = { readonly ok: true } | { readonly ok: false; readonly retryAfter: number };

export interface Limiter {
  /** Counts one hit against the key and says whether it is allowed. */
  hit(key: string): Verdict;
  /** Reads the window without spending anything — for a pre-flight that must not cost a hit. */
  peek(key: string): Verdict;
}

/** Keys one limiter holds before the coldest windows are dropped. Bounds a long-lived instance. */
const MAX_KEYS = 5000;

interface Window {
  start: number;
  hits: number;
}

export function limiter(rule: Rule, maxKeys = MAX_KEYS): Limiter {
  const windows = new Map<string, Window>();

  const prune = (now: number): void => {
    if (windows.size <= maxKeys) return;
    for (const [key, w] of windows) if (now - w.start >= rule.windowMs) windows.delete(key);
    // Still over: drop the oldest windows first — they are the ones closest to expiring anyway, so a
    // flood of fresh keys cannot wipe the window of whoever is being throttled.
    if (windows.size > maxKeys) {
      const cold = [...windows.entries()].sort((a, b) => a[1].start - b[1].start).slice(0, windows.size - maxKeys);
      for (const [key] of cold) windows.delete(key);
    }
  };

  const read = (key: string, spend: boolean): Verdict => {
    const now = Date.now();
    const open = windows.get(key);
    const w = open && now - open.start < rule.windowMs ? open : { start: now, hits: 0 };
    if (w.hits >= rule.limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((w.start + rule.windowMs - now) / SECOND)) };
    }
    if (spend) {
      w.hits += 1;
      windows.set(key, w);
      prune(now);
    }
    return { ok: true };
  };

  return { hit: (key) => read(key, true), peek: (key) => read(key, false) };
}

// ── keys ────────────────────────────────────────────────

/** Salted like a visitor id, so the map cannot be turned back into addresses or e-mail addresses. */
export async function sourceKey(...parts: readonly string[]): Promise<string> {
  const salt = process.env.ANALYTICS_SALT ?? "unsalted-development";
  return (await sha256(`rate|${parts.join("|")}|${salt}`)).slice(0, 32);
}

/** The address the platform says a request came from; "" when it cannot be told (which is one bucket). */
export const requestIp = (request: Request): string => clientIp((name) => request.headers.get(name));

// ── answers ─────────────────────────────────────────────

/** Seconds as something a form can print: "in 4 minutes", "in 30 seconds". */
export function waitFor(seconds: number): string {
  if (seconds < 90) return `in ${Math.max(1, Math.round(seconds))} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes < 90 ? `in ${minutes} minutes` : `in ${Math.ceil(minutes / 60)} hours`;
}

export function tooMany(message: string, retryAfter: number): Response {
  return Response.json({ error: message }, {
    status: 429,
    headers: { "retry-after": String(retryAfter), "cache-control": "no-store" },
  });
}

// ── the limits this site runs ───────────────────────────
// The contact form is the only one of these the public can reach, so it is the tightest: per address,
// per e-mail address, and a global cap so a botnet spread over many addresses still cannot fill the
// inbox. The rest are brakes on things that are already behind a password.

export const LIMITS = {
  contactIp: { limit: 5, windowMs: HOUR },
  contactEmail: { limit: 3, windowMs: HOUR },
  contactAll: { limit: 60, windowMs: HOUR },
  knock: { limit: 5, windowMs: 10 * MINUTE },
  adminWrite: { limit: 300, windowMs: 5 * MINUTE },
} as const satisfies Record<string, Rule>;

export const contactByIp = limiter(LIMITS.contactIp);
export const contactByEmail = limiter(LIMITS.contactEmail);
/** One key, so it counts every submission this instance has seen. */
export const contactAll = limiter(LIMITS.contactAll, 1);
export const knocks = limiter(LIMITS.knock);
const adminWrites = limiter(LIMITS.adminWrite);

/**
 * The brake on admin writes. They are already behind the session cookie, so this is not the lock —
 * it stops a stuck panel, a runaway script or a stolen cookie from hammering the database.
 */
export async function limitAdminWrite(): Promise<Response | null> {
  const h = await headers();
  const key = await sourceKey("admin", clientIp((name) => h.get(name)), h.get("user-agent") ?? "");
  const verdict = adminWrites.hit(key);
  if (verdict.ok) return null;
  return tooMany(`Too many changes at once. Try again ${waitFor(verdict.retryAfter)}.`, verdict.retryAfter);
}
