"use client";
// Browser side of the analytics: batches events, measures real engaged time (not wall time), records
// scroll depth, and sends as rarely as it can get away with. One session id per tab, kept in
// sessionStorage so a reload continues the same visit.
//
// The flush schedule, because "why is this thing running constantly" is a fair question:
//
//   · the first batch goes at 2.5 seconds and only ever once per page load, so a three-second visit
//     still counts without turning every later click into another 2.5-second timer
//   · after that a single self-rescheduling timer runs, starting at 15 seconds and doubling to a
//     ceiling of two minutes — a reader who is quietly reading is reported less and less often
//   · the timer stops itself the moment there is nothing to say: an empty queue, no new engaged
//     seconds and no deeper scroll than was already reported. A queued event restarts it at 15s
//   · it never fires while the tab is hidden; hide and unload send whatever is left by beacon
//   · duplicate pageviews for the same path inside a second, and depth marks already reported, are
//     dropped here rather than being sent for the server to ignore
//
// Nothing here reads cookies or fingerprints the device beyond what the request already carries; the
// identity is worked out server-side.

import { ev as vercelEvent, type EventName } from "@/lib/analytics";

interface QueuedEvent { name: string; path: string; target: string; value: number | null; meta: Record<string, string | number | boolean> }

const SESSION_KEY = "wosmo-session";
const FIRST_MS = 2_500;    // the one early batch
const MIN_MS = 15_000;     // where the backing-off timer starts
const MAX_MS = 120_000;    // and where it stops backing off
const IDLE_MS = 20_000;    // no interaction for this long and the clock stops
const MAX_QUEUE = 20;
const DUPE_MS = 1_000;     // a second pageview for the same path inside this is a remount, not a visit

let queue: QueuedEvent[] = [];
let sessionId = "";
let fresh = false;
let engagedMs = 0;
let lastTick = 0;
let active = false;
let maxScroll = 0;
let sentScroll = 0;
let depthSent = new Set<number>();
let lastPageview = { path: "", at: 0 };
let timer = 0;
let firstFlush = 0;
let earlyDone = false;
let delay = MIN_MS;
let started = false;

function newSessionId(): string {
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return id.replace(/-/g, "").slice(0, 32);
}
function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    // no stored id means this visit is starting now, which is the only moment the server should count
    // a new visit — a reload finds the id again and continues the same one
    fresh = stored === null;
    sessionId = stored ?? newSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch { sessionId = newSessionId(); fresh = true; }
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
    fresh,
    // one half of the server's headless heuristic; the rest is read off the request headers
    wd: navigator.webdriver === true,
    events: queue,
  };
  return JSON.stringify(body);
}

/** Is there anything worth a request? Engaged time and scroll only count once. */
function pending(): boolean {
  return queue.length > 0 || engagedMs >= 1000 || maxScroll > sentScroll;
}

function flush(final = false): void {
  if (!pending()) return;
  if (!final && document.hidden) return;
  const body = payload();
  queue = [];
  engagedMs = 0;
  sentScroll = maxScroll;
  fresh = false;
  // sendBeacon survives the page going away; fetch keepalive is the fallback
  const sent = final && "sendBeacon" in navigator
    ? navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))
    : false;
  if (!sent) void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

function schedule(ms: number): void {
  clearTimeout(timer);
  timer = window.setTimeout(onTimer, ms);
}

function onTimer(): void {
  tick();
  // Nothing queued, or nobody home: let the timer die rather than wake up to do nothing. `wake()` puts
  // it back the moment there is something to report.
  if (document.hidden || !pending()) { timer = 0; return; }
  flush();
  delay = Math.min(MAX_MS, delay * 2);
  schedule(delay);
}

/** Something happened: reset the backoff and make sure a timer exists. */
function wake(): void {
  delay = MIN_MS;
  if (!timer && earlyDone) schedule(delay);
}

/** Queue an event for this site's own analytics, and mirror it to Vercel's when the name is one of theirs. */
export function track(name: string, opts: { target?: string; value?: number; meta?: Record<string, string | number | boolean>; vercel?: EventName } = {}): void {
  const path = location.pathname;
  if (name === "pageview") {
    // React remounts and a replaced history entry both fire this twice for the same page
    const at = Date.now();
    if (lastPageview.path === path && at - lastPageview.at < DUPE_MS) return;
    lastPageview = { path, at };
  }
  queue.push({ name, path, target: opts.target ?? "", value: opts.value ?? null, meta: opts.meta ?? {} });
  if (opts.vercel) vercelEvent(opts.vercel, { ...(opts.target ? { target: opts.target } : {}), ...opts.meta });
  if (queue.length >= MAX_QUEUE) { flush(); delay = MIN_MS; schedule(delay); return; }
  wake();
  // a visitor who leaves in three seconds should still be counted, so the first batch goes early rather
  // than waiting for the interval or for a beacon a closing tab may not deliver. Once only: re-arming
  // it on every event is what made this endpoint look like it was running all the time.
  if (!earlyDone && !firstFlush) {
    firstFlush = window.setTimeout(() => {
      firstFlush = 0;
      earlyDone = true;
      tick();
      flush();
      schedule(delay);
    }, FIRST_MS);
  }
}
export const pageview = (): void => { maxScroll = 0; sentScroll = 0; depthSent = new Set(); track("pageview"); };

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
  const bump = (): void => {
    markActive();
    clearTimeout(idle);
    idle = window.setTimeout(() => { tick(); active = false; }, IDLE_MS);
    // interaction on its own is not worth a request, but it does mean the clock is running again
    if (!timer && earlyDone && pending()) schedule(delay);
  };
  const onScroll = (): void => {
    bump();
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - innerHeight;
    const pct = scrollable > 40 ? Math.round(((scrollY + innerHeight) / doc.scrollHeight) * 100) : 100;
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
    // one event per quarter, once per page: "landed" and "read to the end" are different visits
    for (const mark of [25, 50, 75, 100]) {
      if (maxScroll >= mark && !depthSent.has(mark)) {
        depthSent.add(mark);
        track("read_depth", { value: mark, vercel: "read_depth", meta: { depth: mark } });
      }
    }
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
  // Typing into the contact form is the strongest signal short of sending it, and it is one listener
  // rather than a hook in the form component. Once per tab: it is intent, not a count.
  let formStarted = false;
  const onFocus = (e: FocusEvent): void => {
    if (formStarted || !(e.target instanceof Element)) return;
    const form = e.target.closest("form");
    if (!form?.querySelector("[name=message]")) return;
    formStarted = true;
    track("contact_start");
  };
  const onHide = (): void => { tick(); if (document.hidden) flush(true); };
  const onLeave = (): void => { tick(); flush(true); };
  const onShow = (): void => { if (!document.hidden) { lastTick = performance.now(); bump(); } };

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("pointerdown", bump, { passive: true });
  addEventListener("keydown", bump);
  document.addEventListener("click", onClick, true);
  document.addEventListener("focusin", onFocus, true);
  document.addEventListener("visibilitychange", onHide);
  document.addEventListener("visibilitychange", onShow);
  addEventListener("pagehide", onLeave);

  return () => {
    started = false;
    clearTimeout(timer); clearTimeout(idle); clearTimeout(firstFlush);
    timer = 0; firstFlush = 0;
    removeEventListener("scroll", onScroll); removeEventListener("pointerdown", bump); removeEventListener("keydown", bump);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("focusin", onFocus, true);
    document.removeEventListener("visibilitychange", onHide);
    document.removeEventListener("visibilitychange", onShow);
    removeEventListener("pagehide", onLeave);
    flush(true);
  };
}
