// Flight deck controller: boot → cockpit. Wheel = throttle, drag = look, keys = ship commands.
// Ported from prototypes/ship/ship.js. Everything is root-scoped and every listener, timer, rAF, tween,
// socket and the scene itself is torn down by the function `mountDeck` returns, so React can mount and
// unmount the deck (including StrictMode's double effect run) without leaking.

import { gsap } from "gsap";
import { person, projects, experience, skills, LANG_COLORS, type Project } from "@/data/portfolio";
import { createAudio, MUTE_KEY, storedMuted } from "@/lib/audio";
import type { FlightEventInfo, FlightEventName, SystemApi, SystemOptions } from "@/lib/three/types";

// ── public contract ─────────────────────────────────────
export interface LastPush { repo: string; at: string }
export interface DeckOptions {
  /** Project id to fly to once the deck is up (`/ship?to=<id>` from the reading site). */
  initialTarget?: string;
  /** Most recent public push, resolved on the server. `null` renders the "…" placeholder. */
  lastPush?: LastPush | null;
}

/** Root-scoped querySelector that throws instead of returning null. */
export function q<T extends Element>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`[deck] required element not found: ${sel}`);
  return el;
}
export function qa<T extends Element>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

// ── local types ─────────────────────────────────────────
type PanelName = "pilot" | "log" | "comms" | "diag" | "bbox" | "next";
const PANEL_TITLES: Record<PanelName, string> = { pilot: "pilot", log: "mission log", comms: "comms", diag: "diagnostics", bbox: "black box", next: "next mission" };
const isPanelName = (s: string | undefined): s is PanelName => s !== undefined && s in PANEL_TITLES;

interface Live { on: boolean; rtt: number | null }
interface BlackBoxEntry { at: string; from: string; to: string; dur: string }
interface Fps { frames: number; last: number; value: number }
interface CalloutNode { path: SVGPathElement; dot: SVGCircleElement; dot2: SVGCircleElement; lab: HTMLDivElement }
interface HudContent { idx: string; meta: string; title: string; tag: string; desc: string; mods: string; demo: string; links: string; range: string; comp?: string }
interface SceneModule { createSystem(opts: SystemOptions): SystemApi }
type DashDrag = "tape" | "thr" | null;
type Cleanup = () => void;

/** Non-standard Chrome-only heap readout. */
interface PerformanceWithMemory extends Performance { memory?: { usedJSHeapSize: number } }
/** iOS 13+ permission gate on the DeviceOrientationEvent constructor. */
interface OrientationEventStatic { prototype: DeviceOrientationEvent; requestPermission?: () => Promise<"granted" | "denied"> }

const LANG_DESC: Readonly<Record<string, string>> = {
  TypeScript: "app + api logic", JavaScript: "scripts, glue", Go: "services, concurrency", Rust: "native core", Python: "pipelines, tooling",
  Shell: "installers, ci", PowerShell: "windows installer", HTML: "docs site", CSS: "styling", Ruby: "homebrew formula", SQL: "schema, queries",
  Nix: "dev env", Other: "config, misc", crust: "surface · the product",
};
const ORBIT_AU: readonly number[] = [17, 25, 34, 45, 58, 73, 90, 110];
const KONAMI: readonly string[] = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const BLACKBOX_KEY = "wsf-blackbox";
const DOOR_KEY = "v3-door";
const REPO_SLUG = /^[\w.-]{1,100}$/;

const pad2 = (n: number): string => String(n).padStart(2, "0");
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const hex = (n: number): string => "#" + n.toString(16).padStart(6, "0");
const deg360 = (theta: number): number => ((theta * 180 / Math.PI) % 360 + 360) % 360;
const clock = (tz?: string): string => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz });
const relTime = (iso: string): string => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`;
};
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function readBlackBox(): BlackBoxEntry[] {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(BLACKBOX_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((f): f is BlackBoxEntry => typeof f === "object" && f !== null && "at" in f && "from" in f && "to" in f && "dur" in f);
  } catch { return []; }
}
function storageSet(store: "local" | "session", key: string, value: string): void {
  try { (store === "local" ? localStorage : sessionStorage).setItem(key, value); } catch { /* private mode / quota — cosmetic only */ }
}
function gpuName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    if (!gl || !ext) return "n/a";
    const name: unknown = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof name === "string" ? name : "n/a";
  } catch { return "n/a"; }
}
function heapMb(): string {
  const perf: PerformanceWithMemory = performance;
  return perf.memory ? `${Math.round(perf.memory.usedJSHeapSize / 1048576)} MB` : "n/a";
}
function orientationStatic(): OrientationEventStatic | null {
  if (typeof DeviceOrientationEvent === "undefined") return null;
  const ctor: OrientationEventStatic = DeviceOrientationEvent;
  return ctor;
}

// ── mission durations (panels) ──────────────────────────
const ym = (s: string): number => { const [y, m] = s.split("-").map(Number); return y * 12 + (m - 1); };
const nowYm = (): number => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); };
const months = (x: { start: string; end: string | null }): number => (x.end ? ym(x.end) : nowYm()) - ym(x.start) + 1;
const dur = (m: number): string => (m >= 12 ? `${Math.floor(m / 12)}y ${m % 12 ? `${m % 12}m` : ""}`.trim() : `${m}m`);
const fmt = (s: string | null): string => (s ? s.replace("-", ".") : "now");

export function mountDeck(root: HTMLElement, opts: DeckOptions = {}): Cleanup {
  // ── lifecycle bookkeeping ─────────────────────────────
  let disposed = false;
  const disposers: Cleanup[] = [];
  const timers = new Set<number>();
  const intervals = new Set<number>();
  const sockets = new Set<WebSocket>();
  const tweens = new Set<gsap.core.Animation>();
  let rafId = 0;

  function listen<K extends keyof WindowEventMap>(t: Window, type: K, fn: (e: WindowEventMap[K]) => void, o?: boolean | AddEventListenerOptions): void;
  function listen<K extends keyof DocumentEventMap>(t: Document, type: K, fn: (e: DocumentEventMap[K]) => void, o?: boolean | AddEventListenerOptions): void;
  function listen<K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, o?: boolean | AddEventListenerOptions): void;
  function listen<K extends keyof HTMLElementEventMap>(t: Element, type: K, fn: (e: HTMLElementEventMap[K]) => void, o?: boolean | AddEventListenerOptions): void;
  function listen(t: EventTarget, type: string, fn: EventListener, o?: boolean | AddEventListenerOptions): void {
    t.addEventListener(type, fn, o);
    disposers.push(() => t.removeEventListener(type, fn, o));
  }
  const timer = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };
  const clear = (id: number): void => { window.clearTimeout(id); timers.delete(id); };
  const every = (fn: () => void, ms: number): number => { const id = window.setInterval(fn, ms); intervals.add(id); return id; };
  const wait = (ms: number): Promise<void> => new Promise((r) => { timer(r, ms); });
  const anim = <T extends gsap.core.Animation>(a: T): T => { tweens.add(a); return a; };

  // ── environment ───────────────────────────────────────
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const WS_URL = new URLSearchParams(location.search).get("ws") || "wss://echo.websocket.org";
  const audio = createAudio({ muted: storedMuted() });
  const html = document.documentElement;
  html.classList.add("is-deck");
  const MONO = getComputedStyle(html).getPropertyValue("--mono").trim() || "JetBrains Mono, monospace";
  // Kick the scene download off now so it is ready by the time the pilot presses start; still code-split.
  const scenePromise: Promise<SceneModule> = import("@/lib/three/scene");
  scenePromise.catch(() => { /* surfaced in start() */ });

  const $ = <T extends Element = HTMLElement>(sel: string, r: ParentNode = root): T => q<T>(sel, r);
  const $$ = <T extends Element = HTMLElement>(sel: string, r: ParentNode = root): T[] => qa<T>(sel, r);

  // ── elements ──────────────────────────────────────────
  const orbitCanvas = $<HTMLCanvasElement>("#orbit-canvas");
  const boot = $("#boot"), bootLog = $("#boot-log"), startBtn = $<HTMLButtonElement>("#start");
  const deck = $("#deck"), hud = $("#hud"), panel = $("#panel"), toast = $("#toast");
  const radarCanvas = $<HTMLCanvasElement>("#radar"), dashCanvas = $<HTMLCanvasElement>("#dash");
  const lockEl = $("#lock"), coSvg = $<SVGSVGElement>("#callouts"), coLabels = $("#callout-labels");
  const cmd = $<HTMLFormElement>("#cmd"), cmdIn = $<HTMLInputElement>("#cmd-in"), cmdOut = $("#cmd-out");
  const beacon = $<HTMLButtonElement>("#beacon"), snd = $<HTMLButtonElement>("#snd"), gyroBtn = $<HTMLButtonElement>("#gyro");

  // ── deck state ────────────────────────────────────────
  let system: SystemApi | null = null, labelsEl: HTMLElement | null = null;
  let started = false, current: Project | null = null, coreOpen = false, tourTimer = 0, throttle = 0, panelOpen: PanelName | null = null;
  let energy = 1, hyperOn = false, beltNear = 0, rangeKm = false, clockLocal = false, lastPing = 0, toastTimer = 0, pressTimer = 0;
  const live: Live = { on: false, rtt: null };
  const lastPush: LastPush | null = opts.lastPush && REPO_SLUG.test(opts.lastPush.repo) ? opts.lastPush : null;
  const blackBox = readBlackBox();
  const fps: Fps = { frames: 0, last: performance.now(), value: 0 };

  function showToast(msg: string, ms = 2600): void {
    toast.textContent = msg; toast.classList.add("is-on");
    clear(toastTimer); toastTimer = timer(() => toast.classList.remove("is-on"), ms);
  }
  function scramble(el: HTMLElement, text: string, d = 0.7): gsap.core.Tween {
    const chars = "▚▞▟▙◢◣◤◥█▓▒░ABCDEFGHKLMNPRSTUVWXYZ0123456789"; const o = { p: 0 };
    return anim(gsap.to(o, { p: 1, duration: reduced ? 0 : d, ease: "power2.out",
      onUpdate: () => { const n = Math.round(o.p * text.length); el.textContent = text.slice(0, n) + text.slice(n).split("").map((c) => (c === " " ? " " : chars[(Math.random() * chars.length) | 0])).join(""); },
      onComplete: () => { el.textContent = text; } }));
  }
  function typewrite(el: HTMLElement, text: string, d: number): gsap.core.Tween {
    el.textContent = ""; const o = { n: 0 }; let last = 0;
    return anim(gsap.to(o, { n: text.length, duration: d, ease: "none", onUpdate: () => { const n = Math.round(o.n); el.textContent = text.slice(0, n); if (n - last >= 3) { last = n; audio.type(); } } }));
  }
  function lamp(id: string, state: "" | "on" | "warn" | "bad"): void {
    const el = $(`#lamp-${id}`); el.classList.remove("on", "warn", "bad"); if (state) el.classList.add(state);
  }

  // ── uplink ────────────────────────────────────────────
  function connect(log: (line: string, cls?: string) => void): Promise<boolean> {
    return new Promise((resolve) => {
      const t0 = performance.now(); let settled = false;
      const done = (ok: boolean): void => { if (!settled) { settled = true; resolve(ok); } };
      log(`> uplink ${WS_URL}`);
      let ws: WebSocket;
      try { ws = new WebSocket(WS_URL); } catch { log("x invalid url", "bad"); done(false); return; }
      sockets.add(ws);
      const to = timer(() => { log("x no answer · static mode", "bad"); try { ws.close(); } catch { /* already closed */ } done(false); }, 4000);
      ws.addEventListener("open", () => { log(`> open ${Math.round(performance.now() - t0)}ms`, "ok"); ws.send(`ping:${performance.now()}`); });
      ws.addEventListener("message", (e: MessageEvent) => {
        const m = String(e.data); if (!m.startsWith("ping:")) return;
        const rtt = Math.round(performance.now() - Number(m.slice(5)));
        if (!settled) {
          clear(to); log(`> rtt ${rtt}ms`, "ok"); live.on = true; live.rtt = rtt;
          every(() => { if (ws.readyState === WebSocket.OPEN) ws.send(`ping:${performance.now()}`); }, 4000);
          done(true);
        } else live.rtt = rtt;
        renderTele();
      });
      ws.addEventListener("error", () => { clear(to); log("x unreachable · static mode", "bad"); done(false); });
      ws.addEventListener("close", () => { sockets.delete(ws); live.on = false; if (!disposed) renderTele(); });
    });
  }

  // ── boot ──────────────────────────────────────────────
  const log = (line: string, cls?: string): void => { const s = document.createElement("span"); s.textContent = line + "\n"; if (cls) s.className = cls; bootLog.appendChild(s); };
  async function start(): Promise<void> {
    if (started || disposed) return; started = true;
    audio.resume(); audio.click(); void audio.startAmbient(); void audio.startLoop("belt");
    startBtn.disabled = true;
    const lines = ["> WSF-01 flight deck", "> loading system … 8 bodies, 1 star, 1 belt", "> pilot · wasif malik · software engineer", "> go · systems · next.js"];
    for (const l of lines) { log(l); await wait(reduced ? 0 : 160); audio.tick(); }
    if (disposed) return;
    void connect(log);
    await wait(reduced ? 0 : 500);
    if (disposed) return;
    anim(gsap.to(boot, { opacity: 0, duration: 0.7, ease: "power2.inOut", onComplete: () => { boot.style.display = "none"; } }));
    const ok = await initDeck();
    if (!ok || disposed) return;
    // deep link from the reading site: /ship?to=<project id> jumps there once the deck is up
    const to = projects.find((p) => p.id === opts.initialTarget);
    if (to) timer(() => select(to), reduced ? 100 : 1400);
  }
  listen(startBtn, "click", () => { void start(); });
  listen(window, "keydown", (e) => { if (!started && (e.key === "Enter" || e.key === " ")) void start(); });
  if (opts.initialTarget) {
    // arrived via "fly there": skip the press-start wait; the audio context resumes on the first gesture
    $(".boot__btn .sf__in").textContent = "launching …";
    listen(window, "pointerdown", () => audio.resume(), { once: true });
    timer(() => { void start(); }, reduced ? 0 : 600);
  }
  for (const a of $$<HTMLAnchorElement>("[data-door]")) listen(a, "click", () => storageSet("local", DOOR_KEY, a.dataset.door ?? "read"));

  // ── targets ───────────────────────────────────────────
  function renderTargets(): void {
    $("#tgt-count").textContent = pad2(projects.length);
    $("#targets").innerHTML = projects.map((p, i) => `<li><button class="tgt" type="button" data-id="${p.id}"><span class="tgt__n">${pad2(i + 1)}</span><span class="tgt__name">${esc(p.title)}</span></button></li>`).join("");
    // these buttons are re-created by innerHTML, so their listeners die with them
    for (const b of $$<HTMLButtonElement>(".tgt[data-id]")) b.addEventListener("click", () => { const p = projects.find((x) => x.id === b.dataset.id); if (p) select(p); });
  }
  listen($<HTMLButtonElement>(".tgt--sun"), "click", selectSun);
  function markCurrent(): void {
    for (const b of $$(".tgt")) b.classList.toggle("is-cur", (current !== null && b.dataset.id === current.id) || (coreOpen && b.hasAttribute("data-sun")));
  }

  // ── telemetry ─────────────────────────────────────────
  function renderTele(): void {
    if (!system) return;
    const h = system.heading();
    $("#tl-state").textContent = h.flying ? "in flight" : current ? `holding · ${current.title.toLowerCase()}` : coreOpen ? "holding · core" : "orbiting";
    const link = $("#tl-link"); link.textContent = live.on ? `live · ${live.rtt}ms` : "static"; link.classList.toggle("on", live.on);
    $("#tl-push").textContent = lastPush ? `${lastPush.repo} · ${relTime(lastPush.at)}` : "…";
    $("#tl-clock").textContent = clockLocal ? `${clock()} local` : `${clock(person.tz)} pkt`;
    const tgt = current ? h.bodies.find((b) => b.id === current?.id) : undefined;
    const au = tgt ? Math.hypot(h.pos.x - tgt.x, h.pos.z - tgt.z) : Math.hypot(h.pos.x, h.pos.z);
    const fmtR = (v: number): string => rangeKm ? `${(v * 149.6).toFixed(0)} Mkm` : `${v.toFixed(1)} au`;
    $("#tl-range").textContent = tgt ? fmtR(au) : `${fmtR(au)} from core`;
    $("#tl-eta").textContent = h.flying ? `T−${Math.max(0, (1 - h.flightT) * h.flightDur).toFixed(1)} s` : "—";
    lamp("link", live.on ? "on" : "bad");
    lamp("belt", beltNear > 0.6 ? "warn" : beltNear > 0.15 ? "on" : "");
    lamp("lock", h.hot >= 0 || h.sunHot ? "on" : current || coreOpen ? "on" : "");
    lamp("hyper", hyperOn ? "warn" : "");
    lamp("fuel", energy < 0.2 ? "bad" : energy < 0.5 ? "warn" : "");
  }
  every(renderTele, 250);

  // ── radar ─────────────────────────────────────────────
  function drawRadar(): void {
    const c = radarCanvas, g = c.getContext("2d"); if (!g) return;
    const W = c.width, H = c.height, cx = W / 2, cy = H / 2;
    g.clearRect(0, 0, W, H);
    if (!system) return;
    const h = system.heading(), scale = (W / 2 - 12) / 118;
    g.strokeStyle = "rgba(0,229,255,.16)"; g.lineWidth = 1;
    for (const b of h.bodies) { g.beginPath(); g.arc(cx, cy, b.r * scale, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "#ffc978"; g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI * 2); g.fill();
    for (const b of h.bodies) { const on = current !== null && b.id === current.id; g.fillStyle = on ? "#00e5ff" : "rgba(242,245,255,.8)"; g.beginPath(); g.arc(cx + b.x * scale, cy + b.z * scale, on ? 3 : 1.8, 0, Math.PI * 2); g.fill(); }
    const sx = clamp(cx + h.pos.x * scale, 6, W - 6), sz = clamp(cy + h.pos.z * scale, 6, H - 6), ang = Math.atan2(-h.pos.z, -h.pos.x);
    g.save(); g.translate(sx, sz); g.rotate(ang); g.fillStyle = "#00e5ff"; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, 4); g.lineTo(-2, 0); g.lineTo(-4, -4); g.closePath(); g.fill(); g.restore();
    const a = (performance.now() / 2400) % (Math.PI * 2);
    if (typeof g.createConicGradient === "function") {
      const grad = g.createConicGradient(a, cx, cy); grad.addColorStop(0, "rgba(0,229,255,.22)"); grad.addColorStop(0.12, "rgba(0,229,255,0)"); grad.addColorStop(1, "rgba(0,229,255,0)");
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2); g.fill();
    }
  }
  listen(radarCanvas, "click", (e) => {
    if (!system) return;
    const c = radarCanvas, r = c.getBoundingClientRect(), W = c.width, scale = (W / 2 - 12) / 118;
    const mx = (e.clientX - r.left) * (W / r.width) - W / 2, mz = (e.clientY - r.top) * (W / r.height) - W / 2;
    const h = system.heading();
    let best: (typeof h.bodies)[number] | null = null, bd = 12;
    for (const b of h.bodies) { const d = Math.hypot(b.x * scale - mx, b.z * scale - mz); if (d < bd) { bd = d; best = b; } }
    if (Math.hypot(mx, mz) < 8) { selectSun(); return; }
    if (best) { const p = projects.find((x) => x.id === best?.id); if (p) select(p); return; }
    const theta = Math.atan2(mx, mz);
    system.setHeading(theta); showToast(`heading ${String(Math.round(deg360(theta))).padStart(3, "0")}°`, 1200); audio.tick();
  });

  // ── main instrument: horizon ball · heading tape · throttle · energy · velocity ──
  function drawDash(): void {
    const c = dashCanvas; if (!system) return;
    const g = c.getContext("2d"); if (!g) return;
    const W = c.width, H = c.height, h = system.heading();
    g.clearRect(0, 0, W, H);
    g.font = `10px ${MONO}`; g.textBaseline = "top";

    // heading tape (top band)
    const deg = deg360(h.theta), pxPerDeg = 3.6, cx = W * 0.5;
    for (let d = -70; d <= 70; d += 5) {
      const val = ((Math.round(deg / 5) * 5 + d) % 360 + 360) % 360;
      let diff = val - deg; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
      const x = cx + diff * pxPerDeg; if (x < 150 || x > W - 150) continue;
      const major = val % 30 === 0;
      g.strokeStyle = major ? "rgba(0,229,255,.75)" : "rgba(242,245,255,.28)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 6); g.lineTo(x, major ? 18 : 12); g.stroke();
      if (major) { g.fillStyle = "rgba(242,245,255,.72)"; g.textAlign = "center"; g.fillText(String(val).padStart(3, "0"), x, 20); }
    }
    g.fillStyle = "#00e5ff"; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx - 4, 6); g.lineTo(cx + 4, 6); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,229,255,.9)"; g.textAlign = "center"; g.fillText(`HDG ${String(Math.round(deg)).padStart(3, "0")}°`, cx, 34);

    // artificial horizon (left half of the lower band): pitch from phi, roll from camera z
    const hx = W * 0.27, hy = H * 0.66, hr = 40;
    g.save(); g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.clip();
    const pitch = (h.phi - 0.27) * 120, roll = -h.roll;
    g.translate(hx, hy + pitch); g.rotate(roll);
    g.fillStyle = "rgba(0,229,255,.10)"; g.fillRect(-100, -200, 200, 200);
    g.fillStyle = "rgba(255,181,71,.10)"; g.fillRect(-100, 0, 200, 200);
    g.strokeStyle = "rgba(0,229,255,.8)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-100, 0); g.lineTo(100, 0); g.stroke();
    g.strokeStyle = "rgba(242,245,255,.35)"; for (const k of [-2, -1, 1, 2]) { g.beginPath(); g.moveTo(-14, k * 14); g.lineTo(14, k * 14); g.stroke(); }
    g.restore();
    g.strokeStyle = "rgba(0,229,255,.35)"; g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#00e5ff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx - 16, hy); g.lineTo(hx - 5, hy); g.moveTo(hx + 5, hy); g.lineTo(hx + 16, hy); g.moveTo(hx, hy - 3); g.lineTo(hx, hy + 3); g.stroke();
    g.fillStyle = "rgba(242,245,255,.45)"; g.textAlign = "center"; g.fillText("ATT", hx, hy + hr + 4);

    // velocity + eta (centre of lower band)
    const vel = h.flying ? h.speed * 9.6 : 0;
    g.fillStyle = "rgba(242,245,255,.45)"; g.textAlign = "center"; g.fillText("VEL au/s", cx, H * 0.46);
    g.fillStyle = h.flying ? "#00e5ff" : "rgba(242,245,255,.8)"; g.font = `700 22px ${MONO}`; g.fillText(vel.toFixed(1), cx, H * 0.55);
    g.font = `10px ${MONO}`; g.fillStyle = "rgba(242,245,255,.45)";
    g.fillText(h.flying ? `ETA ${Math.max(0, (1 - h.flightT) * h.flightDur).toFixed(1)}s` : (current ? "holding" : coreOpen ? "at core" : "orbit"), cx, H * 0.78);

    // throttle + energy (right of lower band): two vertical gauges
    const gx = W * 0.74, gy = H * 0.44, gh = H * 0.46, gw = 10;
    const drawGauge = (x: number, v: number, col: string, label: string, detents: readonly number[]): void => {
      g.fillStyle = "rgba(242,245,255,.08)"; g.fillRect(x, gy, gw, gh);
      g.fillStyle = col; g.fillRect(x, gy + gh * (1 - v), gw, gh * v);
      g.strokeStyle = "rgba(242,245,255,.25)"; for (const d of detents) { const yy = gy + gh * (1 - d); g.beginPath(); g.moveTo(x - 4, yy); g.lineTo(x + gw + 4, yy); g.stroke(); }
      g.fillStyle = "rgba(242,245,255,.45)"; g.textAlign = "center"; g.fillText(label, x + gw / 2, gy + gh + 4);
    };
    drawGauge(gx, (throttle + 0.6) / 1.6, "#00e5ff", "THR", [0.375, 0.7, 1]);
    drawGauge(gx + 46, energy, energy < 0.2 ? "#ff4d5e" : energy < 0.5 ? "#ffb547" : "rgba(0,229,255,.75)", "NRG", [0.25, 0.5, 0.75]);
    g.fillStyle = "rgba(242,245,255,.7)"; g.textAlign = "left"; g.fillText(`${Math.round(throttle * 100)} %`, gx + 100, gy + 2); g.fillText(`${Math.round(energy * 100)} %`, gx + 100, gy + 16);
    g.fillStyle = "rgba(242,245,255,.3)"; g.fillText(`${fps.value} fps`, gx + 100, gy + gh - 10);
  }

  // ── target lock reticle (follows the hovered / current planet) ──
  function drawLock(): void {
    if (!system) return;
    const h = system.heading();
    const idx = h.hot >= 0 ? h.hot : current ? projects.indexOf(current) : -1;
    const b = h.bodies[idx];
    if (idx < 0 || h.flying || !b) { lockEl.classList.remove("is-on"); return; }
    const p = system.project({ x: b.x, y: b.y, z: b.z });
    if (p.z > 1) { lockEl.classList.remove("is-on"); return; }
    const dist = Math.hypot(h.pos.x - b.x, h.pos.y - b.y, h.pos.z - b.z);
    const px = clamp((b.size * 900) / (2 * Math.tan(21 * Math.PI / 180) * dist) * 2.6, 44, 220);
    lockEl.style.width = lockEl.style.height = `${px}px`; lockEl.style.left = `${p.x}px`; lockEl.style.top = `${p.y}px`;
    $(".lock__t", lockEl).textContent = `${projects[idx].title} · ${dist.toFixed(1)} au`;
    lockEl.classList.add("is-on");
  }

  // ── cutaway callouts: one leader per layer, anchored on the cut face, labels stacked beside the planet ──
  let coNodes: CalloutNode[] = [];
  const clearCallouts = (): void => { if (coNodes.length) { coSvg.innerHTML = ""; coLabels.innerHTML = ""; coNodes = []; } };
  function drawCallouts(): void {
    if (!system || !current) { clearCallouts(); return; }
    const anchors = system.layerAnchors(current.id);
    if (!anchors.length) { clearCallouts(); return; }
    if (coNodes.length !== anchors.length) {
      coSvg.innerHTML = ""; coLabels.innerHTML = "";
      coNodes = anchors.map((a) => {
        const col = hex(a.color);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("stroke", col); path.setAttribute("stroke-opacity", ".85");
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("class", "dot"); dot.setAttribute("r", "2.6"); dot.setAttribute("fill", "#050508"); dot.setAttribute("stroke", col);
        const dot2 = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot2.setAttribute("r", "1.2"); dot2.setAttribute("fill", col);
        coSvg.append(path, dot, dot2);
        const lab = document.createElement("div"); lab.className = "co"; lab.style.setProperty("--c", col);
        lab.innerHTML = `<span class="co__row"><b>${esc(a.name)}</b><em>${a.pct.toFixed(1)}<i>%</i></em></span><small>${LANG_DESC[a.name] ?? ""}</small>`;
        lab.style.pointerEvents = "auto";
        const k = coLabels.childElementCount;
        // created and destroyed with the label nodes themselves — no tracking needed
        lab.addEventListener("pointerenter", () => { system?.highlightLayer(current?.id, k); lab.classList.add("is-hi"); audio.tick(); });
        lab.addEventListener("pointerleave", () => { system?.highlightLayer(current?.id, -1); lab.classList.remove("is-hi"); });
        coLabels.appendChild(lab); return { path, dot, dot2, lab };
      });
    }
    // labels live LEFT of the planet (the readout owns the right); shelf runs leftward, min one card apart
    const W = innerWidth;
    const minX = Math.min(...anchors.map((a) => a.x)); const colX = Math.max(W * 0.05, Math.min(minX - 110, W * 0.3));
    const order = anchors.map((a, i) => ({ a, i })).sort((p, q2) => p.a.y - q2.a.y);
    let lastY = -Infinity; const ys: number[] = new Array<number>(anchors.length).fill(0);
    const cardH = coNodes[0]?.lab.offsetHeight || 52, STEP = cardH + 16;   // measured card height + gap
    for (const { a, i } of order) { let y = a.y; if (y < lastY + STEP) y = lastY + STEP; ys[i] = y; lastY = y; }
    // centre the stack around the anchors' mean
    const mean = anchors.reduce((s, a) => s + a.y, 0) / anchors.length, meanY = ys.reduce((s, y) => s + y, 0) / ys.length, shift = mean - meanY;
    anchors.forEach((a, i) => {
      const n = coNodes[i]; if (!n) return;
      const y = ys[i] + shift, on = a.z < 1 && a.amount > 0.35;
      const midX = colX + 26, ex = colX;
      n.path.setAttribute("d", `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${midX.toFixed(1)},${y.toFixed(1)} L${ex.toFixed(1)},${y.toFixed(1)}`);
      n.path.setAttribute("stroke-dasharray", on ? "none" : "0 9999"); n.path.setAttribute("stroke-width", n.lab.classList.contains("is-hi") ? "2" : "1.1");
      n.dot.setAttribute("cx", a.x.toFixed(1)); n.dot.setAttribute("cy", a.y.toFixed(1)); n.dot2.setAttribute("cx", a.x.toFixed(1)); n.dot2.setAttribute("cy", a.y.toFixed(1));
      n.dot.style.opacity = n.dot2.style.opacity = on ? "1" : "0";
      n.lab.style.left = ""; n.lab.style.right = `${W - ex + 6}px`; n.lab.style.top = `${y}px`; n.lab.classList.toggle("is-on", on);
    });
  }

  // ── energy model: jumps cost, the sun recharges ──
  function tickEnergy(dt: number): void {
    if (!system) return;
    const h = system.heading(), r = Math.hypot(h.pos.x, h.pos.z);
    if (!h.flying) energy = clamp(energy + dt * (r < 40 ? 0.08 : 0.012), 0, 1);
  }

  // ── flights + readout ─────────────────────────────────
  function select(p: Project): void {
    if (!system || system.isFlying()) return;
    if (energy < 0.08) { showToast("energy low · drift toward the sun to recharge", 3000); audio.tick(); return; }
    current = p; coreOpen = false; closePanel(); closeHud(false); markCurrent(); deck.classList.add("is-flying");
    system.flyTo(p.id, () => { deck.classList.remove("is-flying"); openHud(p); });
  }
  function selectSun(): void {
    if (!system || system.isFlying()) return;
    current = null; coreOpen = true; closePanel(); closeHud(false); markCurrent(); deck.classList.add("is-flying");
    system.flyToSun(() => { deck.classList.remove("is-flying"); openCore(); });
  }
  function compositionHtml(p: Project): string {
    const langs = [...p.langs].sort((a, b) => b[1] - a[1]); if (!langs.length) return "";
    const total = langs.reduce((a, l) => a + l[1], 0);
    const colorOf = (n: string): string => hex(LANG_COLORS[n] ?? LANG_COLORS.Other);
    return `<span class="hud__k">composition · github languages · layers by volume share</span>
    <div class="comp__bar">${langs.map(([n, v]) => `<i style="flex-basis:${(v / total * 100).toFixed(2)}%;background:${colorOf(n)}"></i>`).join("")}</div>
    <div class="comp__legend">${langs.map(([n, v], k) => `<span data-layer="${k}" style="--c:${colorOf(n)}" class="${v < 1 ? "is-dim" : ""}"><b>${esc(n)}</b>${v.toFixed(1)}%</span>`).join("")}</div>`;
  }
  function fillHud({ idx, meta, title, tag, desc, mods, demo, links, range, comp }: HudContent): void {
    $(".hud__idx", hud).textContent = idx; $(".hud__meta", hud).innerHTML = meta; $(".hud__tag", hud).textContent = tag; $(".hud__mods", hud).innerHTML = mods;
    $(".hud__demo .sf__in", hud).innerHTML = demo; $(".hud__links", hud).innerHTML = links; $(".hud__range", hud).textContent = range;
    $(".hud__comp", hud).innerHTML = comp ?? ""; const cut = $<HTMLButtonElement>(".hud__cut", hud); cut.hidden = !comp; cut.classList.remove("is-on");
    for (const el of $$(".comp__legend [data-layer]", hud)) {
      const k = Number(el.dataset.layer);
      el.addEventListener("pointerenter", () => system?.highlightLayer(current?.id, k));
      el.addEventListener("pointerleave", () => system?.highlightLayer(current?.id, -1));
    }
    hud.setAttribute("aria-hidden", "false"); hud.classList.add("is-on"); audio.arrive();
    anim(gsap.timeline().fromTo(hud, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: reduced ? 0 : 0.5, ease: "power3.out" }, 0)
      .fromTo($$(".hud__bar, .hud__meta, .hud__title, .hud__tag, .hud__comp, .hud__mods, .hud__demo, .hud__links, .hud__nav", hud), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, stagger: 0.06, ease: "power2.out" }, 0.1)
      .add(() => { scramble($(".hud__title", hud), title, 0.8); }, 0.15)
      .fromTo($$(".mod i", hud), { scaleX: 0 }, { scaleX: 1, duration: reduced ? 0 : 0.7, stagger: 0.08, ease: "power3.out", transformOrigin: "left" }, 0.4)
      .add(() => { typewrite($(".hud__desc", hud), desc, reduced ? 0 : Math.min(2.4, desc.length / 85)); }, 0.35));
  }
  function openHud(p: Project): void {
    const i = projects.indexOf(p);
    const liveHost = p.live ? p.live.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
    fillHud({ idx: `${pad2(i + 1)} / ${pad2(projects.length)}`,
      meta: `<span>orbit ${pad2(i + 1)}</span><span>class · ${p.context}</span><span>epoch · ${p.year ?? "—"}</span><span class="${p.live ? "on" : ""}">status · ${p.live ? "live" : p.status ?? "source only"}</span>`,
      title: p.title, tag: p.tagline, desc: p.description,
      mods: `<span class="hud__k">systems aboard</span>` + p.stack.map((s, k) => `<div class="mod"><span>${pad2(k + 1)}</span><b>${s}</b><i style="--w:${70 + ((k * 37) % 30)}%"></i></div>`).join(""),
      demo: p.live ? `<span class="hud__k">uplink</span><a href="${p.live}" target="_blank" rel="noopener">${liveHost} ↗</a>` : `<span class="hud__k">uplink</span><span style="color:var(--fg-3)">no public deployment · demo capture pending</span>`,
      links: `<a href="${p.github}" target="_blank" rel="noopener">source on github ↗</a>${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">open live ↗</a>` : ""}`,
      range: `orbit radius · ${ORBIT_AU[i] ?? "—"} au`, comp: compositionHtml(p) });
  }
  function openCore(): void {
    audio.chord();
    fillHud({ idx: "core", meta: `<span>class · g-type</span><span class="on">status · available for hire</span><span>${person.location}</span>`,
      title: person.name, tag: "the star this system orbits", desc: `${person.positioning} Every planet out here is something I shipped.`,
      mods: `<span class="hud__k">core systems</span>` + skills.map((g, k) => `<div class="mod"><span>${pad2(k + 1)}</span><b>${g.group} · ${g.items.join(", ")}</b><i style="--w:${82 + ((k * 11) % 18)}%"></i></div>`).join(""),
      demo: `<span class="hud__k">uplink</span><a href="mailto:${person.email}">${person.email}</a>`,
      links: `<a href="${person.cv}" target="_blank" rel="noopener">resume ↓</a><a href="${person.github}" target="_blank" rel="noopener">github ↗</a><a href="${person.linkedin}" target="_blank" rel="noopener">linkedin ↗</a>`,
      range: "you found the core" });
    $(".hud__title", hud).textContent = "";
  }
  function closeHud(flyBack = true): void {
    if (hud.classList.contains("is-on")) {
      hud.setAttribute("aria-hidden", "true");
      anim(gsap.to(hud, { opacity: 0, x: 16, duration: reduced ? 0 : 0.3, ease: "power2.in", onComplete: () => hud.classList.remove("is-on") }));
    }
    if (flyBack && system?.focusedId()) {
      deck.classList.add("is-flying");
      system.unfocus(() => { deck.classList.remove("is-flying"); current = null; coreOpen = false; markCurrent(); });
    }
  }
  function step(dir: 1 | -1): void {
    if (!system || system.isFlying()) return;
    const i = current ? projects.indexOf(current) : -1;
    select(projects[(i + dir + projects.length) % projects.length]);
  }
  function toggleCutaway(): void {
    if (!system || !current || system.isFlying()) return;
    const on = !system.cutawayOpen(current.id);
    system.cutaway(current.id, on);
    $(".hud__cut", hud).classList.toggle("is-on", on);
    showToast(on ? `cutaway · ${current.title} · ${current.langs.length} layers · drag to inspect` : "cutaway closed", 1800);
    if (on) audio.chord(); else audio.click();
  }
  listen($(".hud__cut", hud), "click", toggleCutaway);
  listen($(".hud__close", hud), "click", () => closeHud(true));
  listen($(".hud__next", hud), "click", () => step(1));
  listen($(".hud__prev", hud), "click", () => step(-1));

  // ── panels: pilot · log · comms · diagnostics · black box · next mission ──
  const PANELS: Record<PanelName, () => string> = {
    pilot: () => `<div class="pilot"><div><p class="pilot__bio">I build the whole thing — schema, Go services, Next.js clients, deploy. Security-first: a zero-knowledge cloud platform, a concurrent WebSocket system across web and mobile, and client products spanning e-commerce, POS, HRMS and real estate.</p>
      <div class="pilot__meta"><span>callsign · <b>wosmo</b></span><span>base · <b>${person.location}</b></span><span>status · <b style="color:var(--cy)">available for hire</b></span><span>logged · <b>${dur(experience.reduce((a, x) => a + months(x), 0))}</b> across ${experience.length} stations</span></div></div>
    <div>${skills.map((g) => `<div class="skills__g"><span class="hud__k" style="margin:0">${g.group}</span><ul>${g.items.map((i) => `<li class="sf sf--chip"><span class="sf__in">${i}</span></li>`).join("")}</ul></div>`).join("")}</div></div>`,
    log: () => `<div class="log">${experience.map((x, i) => `<div class="mission sf sf--thin"><div class="sf__in">
      <div class="mission__top"><span>mission ${pad2(experience.length - i)}</span><span>${fmt(x.start)} → ${fmt(x.end)}</span><span>${dur(months(x))}</span><span class="mission__st ${x.end ? "" : "on"}">${x.end ? "complete" : "active"}</span></div>
      <h3 class="mission__co">${x.company}</h3><span class="mission__role">${x.title}</span><p class="mission__note">${x.note}</p>
      <ul class="mission__sys">${x.stack.map((s) => `<li class="sf sf--chip"><span class="sf__in">${s}</span></li>`).join("")}</ul></div></div>`).join("")}</div>`,
    comms: () => `<div class="comms"><span class="hud__k">open channel · replies within a day</span>
      <div class="comms__mail"><span>${person.email}</span><button type="button" data-copy>copy</button></div>
      <div class="comms__links"><a href="${person.github}" target="_blank" rel="noopener">github ↗</a><a href="${person.linkedin}" target="_blank" rel="noopener">linkedin ↗</a><a href="${person.hashnode}" target="_blank" rel="noopener">hashnode ↗</a><a href="${person.cv}" target="_blank" rel="noopener">resume ↓</a><a href="https://www.npmjs.com/package/${person.npmCard}" target="_blank" rel="noopener">npx ${person.npmCard} ↗</a></div></div>`,
    diag: () => {
      const h = system?.heading();
      const pos = h ? `${h.pos.x.toFixed(1)}, ${h.pos.y.toFixed(1)}, ${h.pos.z.toFixed(1)}` : "—", hdg = h ? `${deg360(h.theta).toFixed(0)}°` : "—";
      return `<div class="diag">
      <div><span>renderer</span><b>${esc(gpuName())}</b></div><div><span>frame rate</span><b>${fps.value} fps</b></div><div><span>viewport</span><b>${innerWidth}×${innerHeight} @${devicePixelRatio}x</b></div><div><span>js heap</span><b>${heapMb()}</b></div>
      <div><span>uplink rtt</span><b>${live.on ? `${live.rtt} ms` : "static"}</b></div><div><span>position</span><b>${pos}</b></div><div><span>heading</span><b>${hdg}</b></div><div><span>energy</span><b>${Math.round(energy * 100)} %</b></div>
      <div><span>sounds loaded</span><b>${audio.loaded.length} / 11</b></div><div><span>flights logged</span><b>${blackBox.length}</b></div><div><span>build</span><b>v3 · flight deck</b></div><div><span>engine</span><b>three.js r181 · gsap 3.13</b></div></div>`;
    },
    bbox: () => blackBox.length
      ? `<div class="bbox">${[...blackBox].reverse().map((f) => `<div><span>${esc(f.at)}</span><span>${esc(f.from)} → ${esc(f.to)}</span><span>${esc(f.dur)}s</span></div>`).join("")}</div>`
      : `<p style="color:var(--fg-3)">no flights recorded this session.</p>`,
    next: () => `<div class="comms"><span class="hud__k">orbit 09 · under construction</span><p class="pilot__bio">This site. A v3 rewrite of wosmos.vercel.app in Next 16 + React Three Fiber — the solar system you're flying through, the flight deck you're sitting in, the real WebSocket presence layer the door promises. You're looking at the prototype.</p>
      <div class="comms__links"><a href="https://github.com/Wosmos/portfolio-website" target="_blank" rel="noopener">github · portfolio-website ↗</a></div></div>`,
  };
  function openPanel(name: PanelName): void {
    if (panelOpen === name) { closePanel(); return; }
    panelOpen = name; $("#panel-title").textContent = PANEL_TITLES[name]; $("#panel-body").innerHTML = PANELS[name]();
    for (const k of $$(".key[data-panel]")) k.classList.toggle("is-on", k.dataset.panel === name);
    panel.setAttribute("aria-hidden", "false"); panel.classList.add("is-on"); audio.arrive();
    anim(gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, ease: "power3.out" }));
    const items = $$("#panel-body > * > *"); if (items.length) anim(gsap.from(items, { opacity: 0, y: 8, duration: reduced ? 0 : 0.5, stagger: 0.05, ease: "power2.out", delay: 0.1 }));
    const copy = panel.querySelector<HTMLButtonElement>("[data-copy]");
    copy?.addEventListener("click", () => {
      void navigator.clipboard?.writeText(person.email).then(() => { copy.dataset.copied = "true"; timer(() => { delete copy.dataset.copied; }, 1400); });
    });
  }
  function closePanel(): void {
    if (!panelOpen) return; panelOpen = null; for (const k of $$(".key[data-panel]")) k.classList.remove("is-on");
    panel.setAttribute("aria-hidden", "true");
    anim(gsap.to(panel, { opacity: 0, y: 10, duration: reduced ? 0 : 0.25, ease: "power2.in", onComplete: () => panel.classList.remove("is-on") }));
  }
  for (const k of $$<HTMLButtonElement>(".key[data-panel]")) listen(k, "click", () => { const name = k.dataset.panel; if (isPanelName(name)) openPanel(name); });
  listen($(".panel__close"), "click", closePanel);
  listen($("[data-tour]"), "click", () => tour());

  // ── tour ──────────────────────────────────────────────
  function tour(): void {
    if (!system || tourTimer) { abortTour(); return; }
    showToast("auto tour engaged · esc to abort", 3000); let i = -1;
    const hop = (): void => {
      i++;
      const p = projects[i];
      if (!p) { tourTimer = 0; closeHud(true); showToast("tour complete"); return; }
      current = p; coreOpen = false; markCurrent(); closeHud(false); deck.classList.add("is-flying");
      system?.flyTo(p.id, () => { deck.classList.remove("is-flying"); openHud(p); tourTimer = timer(hop, 4200); });
    };
    tourTimer = -1; hop();
  }
  function abortTour(): void { if (tourTimer) { if (tourTimer > 0) clear(tourTimer); tourTimer = 0; showToast("tour aborted"); } }

  // ── command line ──────────────────────────────────────
  const COMMANDS: Record<string, (arg: string) => string> = {
    help: () => "jump <name|n> · cutaway · status · whoami · tour · scan · log · diag · bbox · next · sun · home · clear · exit",
    status: () => {
      if (!system) return "systems offline";
      const h = system.heading();
      return `state ${h.flying ? "in flight" : "orbiting"} · pos ${h.pos.x.toFixed(1)},${h.pos.z.toFixed(1)} · hdg ${deg360(h.theta).toFixed(0)}° · energy ${Math.round(energy * 100)}% · uplink ${live.on ? `${live.rtt}ms` : "static"}`;
    },
    whoami: () => `${person.name} · ${person.role} · ${person.line} · ${person.location}`,
    scan: () => projects.map((p, i) => `${pad2(i + 1)}  ${p.title.padEnd(12)} ${String(ORBIT_AU[i] ?? "").padStart(3)} au  ${p.live ? "live" : "source"}`).join("\n"),
    jump: (arg) => {
      const a = arg.toLowerCase();
      const p = /^\d+$/.test(arg) ? projects[Number(arg) - 1] : projects.find((x) => x.id === a || x.title.toLowerCase() === a);
      if (!p) return `no target "${arg}"`; hideCmd(); select(p); return `jumping to ${p.title}`;
    },
    tour: () => { hideCmd(); tour(); return "tour engaged"; },
    log: () => { hideCmd(); openPanel("log"); return ""; }, diag: () => { hideCmd(); openPanel("diag"); return ""; }, bbox: () => { hideCmd(); openPanel("bbox"); return ""; }, next: () => { hideCmd(); openPanel("next"); return ""; },
    sun: () => { hideCmd(); selectSun(); return "core"; }, home: () => { hideCmd(); closeHud(true); return "returning"; },
    clear: () => { cmdOut.textContent = ""; return ""; }, exit: () => { hideCmd(); return ""; },
    hyperdrive: () => { hyper(); return "engaged"; },
    cutaway: () => { if (!current) return "hold at a planet first"; hideCmd(); toggleCutaway(); return "cutaway"; },
    flare: () => { if (!system) return "systems offline"; system.flare(); audio.chord(); return "flare"; },
  };
  function showCmd(): void { cmd.hidden = false; cmdIn.value = ""; cmdIn.focus(); }
  function hideCmd(): void { cmd.hidden = true; cmdIn.blur(); }
  listen(cmd, "submit", (e) => {
    e.preventDefault();
    const [name = "", ...rest] = cmdIn.value.trim().split(/\s+/); if (!name) return;
    const fn = Object.prototype.hasOwnProperty.call(COMMANDS, name.toLowerCase()) ? COMMANDS[name.toLowerCase()] : undefined;
    const out = fn ? fn(rest.join(" ")) : `unknown command "${name}" · try help`;
    if (out) cmdOut.textContent = `› ${cmdIn.value}\n${out}\n` + (cmdOut.textContent ?? "").slice(0, 1200);
    cmdIn.value = ""; audio.tick();
  });
  listen($("[data-cmd]"), "click", showCmd);

  // ── beacon ────────────────────────────────────────────
  function scheduleBeacon(): void { timer(spawnBeacon, 40_000 + Math.random() * 60_000); }
  function spawnBeacon(): void {
    beacon.hidden = false;
    const y = 120 + Math.random() * (innerHeight * 0.45);
    anim(gsap.fromTo(beacon, { left: -40, top: y }, { left: innerWidth + 40, duration: 26, ease: "none", onComplete: () => { beacon.hidden = true; scheduleBeacon(); } }));
  }
  listen(beacon, "click", () => { gsap.killTweensOf(beacon); beacon.hidden = true; audio.chord(); openPanel("next"); showToast("beacon recovered · orbit 09 decoded", 3200); scheduleBeacon(); });

  // ── hyperdrive ────────────────────────────────────────
  function hyper(): void {
    if (hyperOn) return; hyperOn = true; system?.setHyper(true); showToast("hyperdrive · orbital period ÷ 9", 4000); audio.chord();
    timer(() => { system?.setHyper(false); hyperOn = false; }, 10_000);
  }

  // ── sound toggle ──────────────────────────────────────
  const renderSnd = (): void => { snd.setAttribute("aria-pressed", String(!audio.muted)); snd.innerHTML = `<b>S</b> snd · ${audio.muted ? "off" : "on"}`; };
  listen(snd, "click", () => { audio.setMuted(!audio.muted); storageSet("local", MUTE_KEY, audio.muted ? "1" : "0"); renderSnd(); });
  renderSnd();

  // ── gyro (mobile tilt) ────────────────────────────────
  let gyroOn = false, base: { g: number; b: number } | null = null;
  const setTiltVars = (tx: number, ty: number): void => { html.style.setProperty("--tx", `${tx.toFixed(1)}px`); html.style.setProperty("--ty", `${ty.toFixed(1)}px`); };
  function onOrient(e: DeviceOrientationEvent): void {
    if (e.gamma == null || e.beta == null) return;
    if (!base) base = { g: e.gamma, b: e.beta };
    const dx = clamp((e.gamma - base.g) / 25, -1, 1), dy = clamp((e.beta - base.b) / 25, -1, 1);
    system?.setTilt(dx, -dy);
    setTiltVars(-dx * 10, dy * 6);
  }
  const stopGyro = (): void => { window.removeEventListener("deviceorientation", onOrient); gyroOn = false; base = null; };
  async function enableGyro(): Promise<void> {
    if (gyroOn) { stopGyro(); system?.setTilt(0, 0); gyroBtn.classList.remove("is-on"); return; }
    try {
      const ctor = orientationStatic();
      if (ctor?.requestPermission) { const r = await ctor.requestPermission(); if (r !== "granted") { showToast("tilt permission denied"); return; } }
    } catch { /* permission API absent or blocked — try listening anyway */ }
    if (disposed) return;
    window.addEventListener("deviceorientation", onOrient); gyroOn = true; gyroBtn.classList.add("is-on"); showToast("tilt engaged · move the phone");
  }
  if ("DeviceOrientationEvent" in window && !finePointer) { gyroBtn.hidden = false; listen(gyroBtn, "click", () => { void enableGyro(); }); }
  // desktop: a hint of the same parallax from the pointer
  if (finePointer) listen(window, "pointermove", (e) => { const dx = (e.clientX / innerWidth - 0.5) * 2, dy = (e.clientY / innerHeight - 0.5) * 2; setTiltVars(-dx * 6, -dy * 4); });

  // ── instruments that do things ────────────────────────
  function reping(): void {
    if (performance.now() - lastPing < 3000) { showToast(live.on ? `uplink · ${live.rtt} ms` : "uplink · static", 1400); return; }
    lastPing = performance.now(); showToast("re-pinging uplink…", 1400);
    void connect(() => {}).then((ok) => { if (!disposed) showToast(ok ? `uplink · ${live.rtt} ms` : "uplink · no answer", 1600); });
  }
  function recharge(): void { throttle = 1; system?.setThrottle(1); showToast("recharge · throttle to the core", 2000); }
  function toBelt(): void { throttle = 0.42; system?.setThrottle(throttle); showToast("holding at the belt", 1600); }
  listen($("#lamp-link"), "click", reping);
  listen($("#lamp-belt"), "click", toBelt);
  listen($("#lamp-lock"), "click", () => {
    const h = system?.heading(); if (!h) return;
    const hot = projects[h.hot];
    if (h.hot >= 0 && hot) { select(hot); return; }
    if (h.sunHot) { selectSun(); return; }
    if (current) { closeHud(true); return; }
    showToast("hover a planet to lock", 1400);
  });
  listen($("#lamp-hyper"), "click", () => hyper());
  listen($("#lamp-fuel"), "click", recharge);
  for (const row of $$(".tele__row[data-act]")) listen(row, "click", () => {
    const act = row.dataset.act;
    if (act === "state") { if (system?.focusedId()) closeHud(true); else showToast("orbiting · nothing to disengage", 1400); }
    if (act === "range") { rangeKm = !rangeKm; renderTele(); }
    if (act === "uplink") reping();
    if (act === "push") window.open(lastPush ? `https://github.com/Wosmos/${encodeURIComponent(lastPush.repo)}` : person.github, "_blank", "noopener");
    if (act === "clock") { clockLocal = !clockLocal; renderTele(); }
  });
  // dash canvas: drag the heading tape to turn, tap the horizon to level, drag the THR gauge, tap NRG to recharge
  {
    const c = dashCanvas; let mode: DashDrag = null, lastX = 0;
    const pt = (e: PointerEvent): { x: number; y: number } => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
    const thrFromY = (y: number): number => { const gy = c.height * 0.44, gh = c.height * 0.46; return clamp((1 - (y - gy) / gh) * 1.6 - 0.6, -0.6, 1); };
    listen(c, "pointerdown", (e) => {
      const { x, y } = pt(e), W = c.width, H = c.height;
      if (y < 40) { mode = "tape"; lastX = x; c.setPointerCapture(e.pointerId); }
      else if (Math.hypot(x - W * 0.27, y - H * 0.66) < 44) { system?.level(); showToast("attitude levelled", 1200); audio.tick(); }
      else if (x > W * 0.74 - 8 && x < W * 0.74 + 18 && y > H * 0.4) { mode = "thr"; throttle = thrFromY(y); system?.setThrottle(throttle); c.setPointerCapture(e.pointerId); }
      else if (x > W * 0.74 + 38 && x < W * 0.74 + 64 && y > H * 0.4) recharge();
    });
    listen(c, "pointermove", (e) => {
      if (!mode) return; const { x, y } = pt(e);
      if (mode === "tape") { system?.nudge((x - lastX) / 3.6 * Math.PI / 180); lastX = x; }
      if (mode === "thr") { throttle = thrFromY(y); system?.setThrottle(throttle); }
    });
    listen(window, "pointerup", () => { mode = null; });
  }

  // ── input ─────────────────────────────────────────────
  let kIdx = 0;
  listen(window, "keydown", (e) => {
    if (!started || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!cmd.hidden) { if (e.key === "Escape") hideCmd(); return; }
    kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : e.key === KONAMI[0] ? 1 : 0;
    if (kIdx === KONAMI.length) { kIdx = 0; hyper(); return; }
    const k = e.key.toLowerCase();
    if (e.key === "/") { e.preventDefault(); showCmd(); return; }
    if (e.key === "Escape") { if (panelOpen) { closePanel(); return; } abortTour(); if (system?.focusedId()) closeHud(true); }
    if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1);
    if (k === "x") toggleCutaway();
    if (/^[1-8]$/.test(e.key)) { const p = projects[Number(e.key) - 1]; if (p) select(p); }
    if (e.key === "9") openPanel("next");
    if (k === "p") openPanel("pilot"); if (k === "m") openPanel("log"); if (k === "c") openPanel("comms"); if (k === "d") openPanel("diag"); if (k === "b") openPanel("bbox");
    if (k === "t") tour(); if (k === "s") snd.click(); if (k === "0") selectSun();
  });
  listen(window, "wheel", (e) => { if (!system) return; throttle = clamp(throttle + e.deltaY * -0.0009, -0.6, 1); system.setThrottle(throttle); }, { passive: true });
  // long-press the sun → solar flare
  listen(orbitCanvas, "pointerdown", () => {
    const onSun = system?.pick()?.sun === true; clear(pressTimer);
    if (onSun) pressTimer = timer(() => { system?.flare(); audio.chord(); showToast("solar flare", 1800); }, 650);
  });
  listen(window, "pointerup", () => clear(pressTimer));
  listen(document, "pointerenter", (e) => { if (started && finePointer && e.target instanceof Element && e.target.closest("a, button, .lab")) audio.tick(); }, true);
  listen(document, "click", (e) => { if (started && e.target instanceof Element && e.target.closest("a, button:not(#start)")) audio.click(); }, true);

  // ── deck init ─────────────────────────────────────────
  async function initDeck(): Promise<boolean> {
    let mod: SceneModule;
    try { mod = await scenePromise; } catch (err) {
      console.error("[deck] scene failed to load", err);
      if (!disposed) { boot.style.display = ""; boot.style.opacity = "1"; log("x scene failed to load · reload to retry", "bad"); showToast("scene failed to load", 4000); }
      return false;
    }
    if (disposed) return false;
    const labels = document.createElement("div"); labels.className = "orbit__labels"; deck.prepend(labels); labelsEl = labels;
    let flightFrom = "system", flightStart = 0;
    const sys = mod.createSystem({ canvas: orbitCanvas, labelsEl: labels, projects, onSelect: select, onSunSelect: selectSun, reducedMotion: reduced,
      onFlightEvent: (name: FlightEventName, info: FlightEventInfo) => {
        if (name === "launch") { audio.warp(2.6 / (info.dur || 2.6)); energy = clamp(energy - clamp(info.dist / 260, 0.06, 0.32), 0, 1); flightStart = performance.now(); }
        if (name === "launchBack") { audio.retro(2.6 / (info.dur || 2.6)); flightStart = performance.now(); }
        if (name === "belt") audio.beltHit();
        if (name === "arrive" || name === "home") {
          const to = name === "home" ? "system" : current ? current.title : coreOpen ? "core" : "?";
          blackBox.push({ at: clock(), from: flightFrom, to, dur: ((performance.now() - flightStart) / 1000).toFixed(1) });
          if (blackBox.length > 40) blackBox.shift(); storageSet("session", BLACKBOX_KEY, JSON.stringify(blackBox)); flightFrom = to;
        }
      },
      onBeltLevel: (k: number) => { beltNear = k; audio.setLevel("belt", k); } });
    system = sys;
    sys.setActive(true); sys.setScroll(0);
    renderTargets(); renderTele();
    deck.setAttribute("aria-hidden", "false");
    anim(gsap.to(deck, { opacity: 1, duration: 1.2, ease: "power2.out", delay: 0.3 }));
    anim(gsap.from($$(".deck__id, .deck__mark, .screen, .keys"), { opacity: 0, y: 10, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.5 }));
    let lastT = performance.now();
    const loop = (now: number): void => {
      rafId = window.requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      fps.frames++; if (now - fps.last > 1000) { fps.value = fps.frames; fps.frames = 0; fps.last = now; }
      tickEnergy(dt); drawRadar(); drawDash(); drawLock(); drawCallouts();
    };
    loop(performance.now());
    scheduleBeacon();
    console.log("%c wosmo · flight deck ", "background:#050508;color:#00e5ff;font:12px/1.6 ui-monospace,monospace;border:1px solid #00e5ff;padding:4px 8px",
      "\n  1–8  jump · 0  the sun · 9  next mission · t  tour · /  command line · p m c d b  panels\n  long-press the sun · watch for a beacon · ↑↑↓↓←→←→ba\n");
    return true;
  }

  // ── teardown ──────────────────────────────────────────
  return () => {
    if (disposed) return; disposed = true;
    window.cancelAnimationFrame(rafId);
    for (const id of timers) window.clearTimeout(id); timers.clear();
    for (const id of intervals) window.clearInterval(id); intervals.clear();
    for (const d of disposers.splice(0)) d();
    stopGyro();
    for (const t of tweens) t.kill(); tweens.clear();
    gsap.killTweensOf([boot, deck, hud, panel, beacon]);
    for (const ws of sockets) { try { ws.close(); } catch { /* already closed */ } } sockets.clear();
    system?.dispose(); system = null;
    labelsEl?.remove(); labelsEl = null;
    clearCallouts();
    audio.setMuted(true); // AudioApi has no dispose; silence the orphaned context so nothing plays over the next route
    html.style.removeProperty("--tx"); html.style.removeProperty("--ty");
    html.classList.remove("is-deck");
  };
}
