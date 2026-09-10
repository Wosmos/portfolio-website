"use client";
// Browser side of the analytics: batches events, measures real engaged time (not wall time), records
// scroll depth, and flushes on a timer, on tab hide and on page unload. One session id per tab, kept
// in sessionStorage so a reload continues the same visit.
//
// Nothing here reads cookies or fingerprints the device beyond what the request already carries; the
// identity is worked out server-side.

import { ev as vercelEvent, type EventName } from "@/lib/analytics";

interface QueuedEvent { name: string; path: string; target: string; value: number | null; meta: Record<string, string | number | boolean> }

const SESSION_KEY = "wosmo-session";
const FLUSH_MS = 12_000;
const IDLE_MS = 20_000;   // no interaction for this long and the clock stops

let queue: QueuedEvent[] = [];
let sessionId = "";
let engagedMs = 0;
let lastTick = 0;
let active = false;
let maxScroll = 0;
let timer = 0;
let started = false;

function newSessionId(): string {
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return id.replace(/-/g, "").slice(0, 32);
}
function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    sessionId = stored ?? newSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch { sessionId = newSessionId(); }
  return sessionId;
}

function utm(): Record<string, string> {
  const q = new URLSearchParams(location.search);
  const out: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign"] as const) {
    const v = q.get(`utm_${k}`);
    if (v) out[k] = v.slice(0, 80);
  }
  return out;
}

function payload(): string {
  const body = {
    session: getSessionId(),
    path: location.pathname,
    referrer: document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "",
    screen: `${innerWidth}x${innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    door: (() => { try { return localStorage.getItem("v3-door") ?? ""; } catch { return ""; } })(),
    engaged: Math.round(engagedMs / 1000),
    scroll: maxScroll,
    utm: utm(),
    events: queue,
  };
  return JSON.stringify(body);
}

function flush(final = false): void {
  if (!queue.length && engagedMs < 1000 && maxScroll === 0) return;
  const body = payload();
  queue = [];
  engagedMs = 0;
  // sendBeacon survives the page going away; fetch keepalive is the fallback
  const sent = final && "sendBeacon" in navigator
    ? navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))
    : false;
  if (!sent) void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

/** Queue an event for this site's own analytics, and mirror it to Vercel's when the name is one of theirs. */
export function track(name: string, opts: { target?: string; value?: number; meta?: Record<string, string | number | boolean>; vercel?: EventName } = {}): void {
  queue.push({ name, path: location.pathname, target: opts.target ?? "", value: opts.value ?? null, meta: opts.meta ?? {} });
  if (opts.vercel) vercelEvent(opts.vercel, { ...(opts.target ? { target: opts.target } : {}), ...opts.meta });
  if (queue.length >= 20) flush();
}
export const pageview = (): void => { maxScroll = 0; track("pageview"); };

function tick(): void {
  const now = performance.now();
  if (active && !document.hidden) engagedMs += Math.min(now - lastTick, IDLE_MS);
  lastTick = now;
}
function markActive(): void { tick(); active = true; }

/** Starts the tracker once per tab. Returns a teardown for React strict-mode remounts. */
export function startTracker(): () => void {
  if (started) return () => undefined;
  started = true;
  lastTick = performance.now();
  active = true;

  let idle = window.setTimeout(() => { tick(); active = false; }, IDLE_MS);
  const bump = (): void => { markActive(); clearTimeout(idle); idle = window.setTimeout(() => { tick(); active = false; }, IDLE_MS); };
  const onScroll = (): void => {
    bump();
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - innerHeight;
    const pct = scrollable > 40 ? Math.round(((scrollY + innerHeight) / doc.scrollHeight) * 100) : 100;
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
  };
  // one click event covers every button and link, so nothing needs wiring per component
  const onClick = (e: MouseEvent): void => {
    bump();
    const el = e.target instanceof Element ? e.target.closest("a, button, [data-track]") : null;
    if (!el) return;
    const label = el.getAttribute("data-track") ?? el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 60) ?? "";
    const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? "" : "";
    track("click", { target: label || href, meta: href ? { href: href.slice(0, 120) } : {} });
  };
  const onHide = (): void => { tick(); if (document.hidden) flush(true); };
  const onLeave = (): void => { tick(); flush(true); };

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("pointerdown", bump, { passive: true });
  addEventListener("keydown", bump);
  document.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onHide);
  addEventListener("pagehide", onLeave);
  timer = window.setInterval(() => { tick(); flush(); }, FLUSH_MS);

  return () => {
    started = false;
    clearInterval(timer); clearTimeout(idle);
    removeEventListener("scroll", onScroll); removeEventListener("pointerdown", bump); removeEventListener("keydown", bump);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("visibilitychange", onHide);
    removeEventListener("pagehide", onLeave);
    flush(true);
  };
}
