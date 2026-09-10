// Flight deck controller: boot → cockpit. Wheel = throttle, drag = look, keys = ship commands.
// Ported from prototypes/ship/ship.js. Everything is root-scoped and every listener, timer, rAF, tween,
// socket and the scene itself is torn down by the function `mountDeck` returns, so React can mount and
// unmount the deck (including StrictMode's double effect run) without leaking.

import { gsap } from "gsap";
import { ev } from "@/lib/analytics";
import { DEFAULT_ORBITS, eggFacts as staticFacts, person, projects as staticProjects, experience, skills, LANG_COLORS, type EggFact, type Project } from "@/data/portfolio";
import type { Contributions, RepoStar } from "@/lib/github";
import { createAudio, MUTE_KEY, storedMuted } from "@/lib/audio";
import type { FlightEventInfo, FlightEventName, SceneSettings, SystemApi, SystemOptions } from "@/lib/three/types";

// ── public contract ─────────────────────────────────────
export interface LastPush { repo: string; at: string }
export interface DeckOptions {
  /** Project id to fly to once the deck is up (`/ship?to=<id>` from the reading site). */
  initialTarget?: string;
  /** Most recent public push, resolved on the server. `null` renders the "…" placeholder. */
  lastPush?: LastPush | null;
  /** Projects from the database; the static records are the fallback. */
  projects?: readonly Project[];
  /** Distance from the sun per project, in the same order. */
  orbits?: readonly number[];
  /** The sun, sky, belt and camera values the admin edits. */
  scene?: SceneSettings;
  /** A year of public commit activity, or null when GitHub could not be read. */
  activity?: Contributions | null;
  /** The lines the cockpit whispers when a secret is found. Falls back to the static pool. */
  facts?: readonly EggFact[];
  /** The other repositories, drawn as background constellations sized by commit count. */
  repoStars?: readonly RepoStar[];
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
type PanelName = "pilot" | "log" | "comms" | "diag" | "bbox" | "next" | "secrets";
const PANEL_TITLES: Record<PanelName, string> = { pilot: "about me", log: "experience", comms: "contact", diag: "diagnostics", bbox: "flight log", next: "what i am building", secrets: "secrets" };
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

/** Every hidden thing, with the hint the manifest shows before it is found. */
interface Secret { id: string; name: string; hint: string }
const SECRETS: readonly Secret[] = [
  { id: "cmdline", name: "command line", hint: "one key opens a prompt. it is the one that asks questions" },
  { id: "diag", name: "diagnostics", hint: "the first letter of what an engineer does to a broken thing" },
  { id: "blackbox", name: "black box", hint: "every aircraft carries one. press its initial" },
  { id: "fact", name: "cosmic radio", hint: "press for a fact. f, for the obvious reason" },
  { id: "manifest", name: "this list", hint: "you are reading it" },
  { id: "konami", name: "hyperdrive", hint: "the oldest cheat code there is" },
  { id: "flare", name: "solar flare", hint: "hold the sun. do not let go" },
  { id: "beacon", name: "distress beacon", hint: "something drifts past, rarely. catch it" },
  { id: "next", name: "project 09", hint: "there are eight planets and nine projects" },
  { id: "dossier", name: "personnel file", hint: "knock three times on the ship's nameplate" },
  { id: "callsign", name: "callsign", hint: "type the pilot's handle. five letters, starts with w" },
  { id: "grandtour", name: "the grand tour", hint: "stand on all eight worlds in one visit" },
  { id: "geologist", name: "geologist", hint: "cut three different planets open" },
  { id: "sunstare", name: "heliophile", hint: "go back to the sun three times. it notices" },
  { id: "silence", name: "vacuum", hint: "flip the sound switch five times" },
  { id: "deepspace", name: "beyond the ecliptic", hint: "pull the zoom rocker all the way back" },
  { id: "npx", name: "the card", hint: "click the wordmark. there is a package behind it" },
  { id: "noreverse", name: "no reverse gear", hint: "try the right mouse button on open space" },
  { id: "radio", name: "long silence", hint: "touch nothing for ninety seconds" },
  { id: "midnight", name: "night shift", hint: "fly between midnight and five in the morning" },
];
const SECRETS_KEY = "wsf-secrets";

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
  const projects: readonly Project[] = opts.projects?.length ? opts.projects : staticProjects;
  const facts: readonly EggFact[] = opts.facts?.length ? opts.facts : staticFacts;
  const activity: Contributions | null = opts.activity ?? null;
  const ORBIT_AU: readonly number[] = opts.orbits?.length ? opts.orbits : DEFAULT_ORBITS;

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

  function showToast(msg: string, ms = 2600, fact = false): void {
    if (fact) toast.innerHTML = msg; else toast.textContent = msg;
    toast.classList.toggle("toast--fact", fact);
    toast.classList.add("is-on");
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
  /** A tap the ship will not honour: the bracket and the reticle blink amber so it never reads as dead. */
  let refuseTimer = 0;
  function refuse(): void {
    deck.classList.remove("is-refuse"); void deck.offsetWidth;   // restart the blink on a second tap
    deck.classList.add("is-refuse"); audio.tick();
    clear(refuseTimer); refuseTimer = timer(() => deck.classList.remove("is-refuse"), 460);
  }

  // ── the phone cockpit: a rail that is always up and a labelled sheet that pulls over the glass ──
  const grip = $<HTMLButtonElement>("#grip"), gripSt = $("#grip-st"), rotate = $("#rotate");
  const sheetOpen = (): boolean => deck.classList.contains("is-sheet");
  function setSheet(on: boolean): void {
    deck.classList.toggle("is-sheet", on);
    grip.setAttribute("aria-expanded", String(on));
  }
  const closeSheet = (): void => setSheet(false);
  listen(grip, "click", () => setSheet(!sheetOpen()));

  // one line, once a session, dismissible: a phone on its side is the closest thing to a canopy
  const ROTATE_KEY = "wsf-rotate";
  const landscape = (): boolean => matchMedia("(orientation: landscape)").matches;
  function dismissRotate(): void {
    if (rotate.hidden) return;
    rotate.hidden = true; storageSet("session", ROTATE_KEY, "1");
  }
  function offerRotate(): void {
    let seen = true;
    try { seen = sessionStorage.getItem(ROTATE_KEY) === "1"; } catch { seen = true; }
    if (seen || landscape() || !matchMedia("(max-width: 900px)").matches) return;
    rotate.hidden = false;
    timer(dismissRotate, 9000);
  }
  listen($("#rotate-x"), "click", dismissRotate);
  listen(window, "resize", () => { if (landscape()) dismissRotate(); });

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
    if (started || disposed) return; started = true; ev("deck_start");
    audio.resume();
    // the short cuts (hover, click, arrive, warp …) are fetched here — the loops below stream on their own
    void audio.load().then(() => { if (!disposed) audio.click(); });
    void audio.startAmbient(); void audio.startLoop("belt");
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
    setThrottle(throttle);
    stirred();
    timer(offerRotate, 2600);
    const hour = new Date().getHours();
    if (hour < 5) timer(() => findEgg("midnight", "me"), 4000);
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

  // ── secrets ───────────────────────────────────────────
  // Twenty hidden things. Finding one is remembered locally and counted in the manifest panel, so a
  // returning visitor keeps their collection. Nothing here is required to use the site.
  function readFound(): string[] {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(SECRETS_KEY) ?? "[]");
      return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    } catch { return []; }
  }
  const found = new Set<string>(readFound());
  const KIND_LABEL: Record<EggFact["kind"], string> = { space: "cosmic trivia", me: "personnel note", random: "unfiled" };

  /** A random line from the pool, shown in plain sentence case rather than as a system message. */
  function whisper(kind?: EggFact["kind"]): void {
    const pool = kind ? facts.filter((f) => f.kind === kind) : facts;
    const f = pool[Math.floor(Math.random() * pool.length)] ?? facts[0];
    if (!f) return;
    showToast(`<b>${KIND_LABEL[f.kind]}</b>${esc(f.text)}`, 7000, true);
  }

  function findEgg(id: string, kind?: EggFact["kind"]): void {
    const secret = SECRETS.find((x) => x.id === id);
    if (!secret || found.has(id)) return;
    found.add(id);
    storageSet("local", SECRETS_KEY, JSON.stringify([...found]));
    ev("easter_egg", { egg: id });
    audio.chord();
    showToast(`<b>secret ${pad2(found.size)} of ${pad2(SECRETS.length)} · ${esc(secret.name)}</b>${esc(pickFact(kind))}`, 7000, true);
  }
  function pickFact(kind?: EggFact["kind"]): string {
    const pool = kind ? facts.filter((f) => f.kind === kind) : facts;
    return (pool[Math.floor(Math.random() * pool.length)] ?? facts[0])?.text ?? "";
  }

  // counters the triggers below read
  const visited = new Set<string>(), cutOpen = new Set<string>();
  let sunVisits = 0, sndFlips = 0, idFlips = 0, idTimer = 0, typed = "";

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
    // a hovered or focused moon takes the "where" line, because it is the smaller, more specific answer
    const moon = h.moons.find((m) => m.focused) ?? h.moons.find((m) => m.hot);
    // in flight the line names the destination, so the name is on screen the whole way there
    const where = h.flying
      ? current ? `inbound · ${current.title.toLowerCase()}` : coreOpen ? "inbound · the sun" : "in flight"
      : moon
        ? `${moon.name.toLowerCase()} · ${moon.path ? `/${moon.path}` : "moon"}`
        : current ? `holding · ${current.title.toLowerCase()}` : coreOpen ? "holding · core" : "orbiting";
    $("#tl-state").textContent = where;
    gripSt.textContent = where;
    const link = $("#tl-link"); link.textContent = live.on ? `live · ${live.rtt}ms` : "static"; link.classList.toggle("on", live.on);
    $("#tl-push").textContent = lastPush ? `${lastPush.repo} · ${relTime(lastPush.at)}` : "…";
    $("#tl-clock").textContent = clockLocal ? `${clock()} local` : `${clock(person.tz)} pkt`;
    const tgt = current ? h.bodies.find((b) => b.id === current?.id) : undefined;
    // scene units are not astronomical units: the scale mode and the system span decide the rate
    const units = tgt ? Math.hypot(h.pos.x - tgt.x, h.pos.z - tgt.z) : Math.hypot(h.pos.x, h.pos.z);
    const au = units * (h.auPerUnit || 1);
    const fmtR = (v: number): string => {
      if (rangeKm) return v * 149.6 >= 100_000 ? `${(v * 149.6 / 1e6).toFixed(2)} bn km` : `${(v * 149.6).toFixed(0)} Mkm`;
      return v >= 10_000 ? `${(v / 63_241.1).toFixed(3)} ly` : v >= 100 ? `${v.toFixed(0)} au` : `${v.toFixed(1)} au`;
    };
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

  // ── main instrument ───────────────────────────────────
  // The canvas used to be a fixed 640×150 stretched into a ~368×105 box, which squashed the attitude
  // ball into an ellipse, left both top corners empty (the tape was clipped 150px in from each edge)
  // and pushed the ATT caption off the bottom. The backing store now matches the element's own box, and
  // one layout object describes every region, so the painter and the pointer handler cannot disagree.
  interface DashBox { x: number; y: number; w: number; h: number }
  interface DashLayout {
    w: number; h: number; pad: number;
    /** Small: unlabelled tape, no ATT caption, and the two gauges lie down as bars a thumb can drag. */
    compact: boolean;
    /** Pixel size of the velocity figure — the only text that changes with the box. */
    velSize: number;
    tape: DashBox;
    ball: { cx: number; cy: number; r: number };
    vel: { cx: number; top: number; mid: number; foot: number };
    thr: DashBox; nrg: DashBox; read: number;
  }
  let dashDpr = 1, dashW = 0, dashH = 0;

  function sizeDash(): void {
    const r = dashCanvas.getBoundingClientRect();
    if (r.width < 40 || r.height < 30) return;
    dashDpr = Math.min(2, devicePixelRatio || 1);
    dashW = Math.round(r.width); dashH = Math.round(r.height);
    const bw = Math.round(dashW * dashDpr), bh = Math.round(dashH * dashDpr);
    if (dashCanvas.width !== bw) dashCanvas.width = bw;
    if (dashCanvas.height !== bh) dashCanvas.height = bh;
  }

  /**
   * The phone rail: one 26px heading band with the state read out at its right end, then a single row
   * of [attitude · velocity · a wide throttle slider · an energy pad]. The throttle is horizontal here
   * because a 14px-tall vertical gauge is not a thing a thumb can set.
   */
  function dashRail(w: number, h: number): DashLayout {
    const pad = 6, tapeH = 26, rowY = tapeH + 2, rowH = Math.max(20, h - rowY - 2);
    const r = Math.min(14, rowH / 2 - 1);
    const nrgW = Math.min(80, Math.max(52, w * 0.2));
    const thrX = pad + r * 2 + 84;
    const barY = rowY + Math.max(4, (rowH - 14) / 2);
    return {
      w, h, pad, compact: true, velSize: 15,
      tape: { x: pad, y: 0, w: w - pad * 2, h: tapeH },
      ball: { cx: pad + r, cy: rowY + rowH / 2, r },
      vel: { cx: pad + r * 2 + 42, top: rowY + 1, mid: rowY + 11, foot: rowY + rowH },
      thr: { x: thrX, y: barY, w: Math.max(40, w - pad - nrgW - 10 - thrX), h: 14 },
      nrg: { x: w - pad - nrgW, y: barY, w: nrgW, h: 14 },
      read: w - pad - nrgW,
    };
  }
  /**
   * The landscape flank: too narrow for a row of instruments, tall enough for a stack. Band, then
   * attitude beside velocity, then the two gauges as full-width bars at the foot.
   */
  function dashStack(w: number, h: number): DashLayout {
    const pad = 6, tapeH = 26, barH = 14, barW = w - pad * 2;
    const nrgY = h - barH - 2, thrY = nrgY - barH - 6;
    const rowY = tapeH + 3, rowB = thrY - 6;
    const r = Math.max(11, Math.min(20, (rowB - rowY) / 2 - 2));
    return {
      w, h, pad, compact: true, velSize: 18,
      tape: { x: pad, y: 0, w: barW, h: tapeH },
      ball: { cx: pad + r, cy: (rowY + rowB) / 2, r },
      vel: { cx: (pad + r * 2 + 6 + w - pad) / 2, top: rowY + 2, mid: rowY + 14, foot: rowB - 11 },
      thr: { x: pad, y: thrY, w: barW, h: barH },
      nrg: { x: pad, y: nrgY, w: barW, h: barH },
      read: pad,
    };
  }

  function dashLayout(): DashLayout {
    const w = dashW || 640, h = dashH || 150;
    if (h < 96) return dashRail(w, h);
    if (w < 420) return dashStack(w, h);
    const pad = Math.max(6, Math.round(h * 0.07));
    const tapeH = Math.min(40, Math.max(26, h * 0.3));       // the top band
    const bandY = tapeH + pad * 0.4, bandH = h - bandY - pad * 0.6;
    const caption = 11;                                       // room under the ball and gauges for a label
    const r = Math.max(13, Math.min((bandH - caption) / 2 - 2, h * 0.29));
    const gw = Math.max(7, Math.round(w * 0.024));
    const read = w - 38;                                      // the % column
    const thrX = read - 52 - gw;
    const gapL = pad + 4 + r * 2 + 10;
    return {
      w, h, pad, compact: false, velSize: Math.round(Math.min(24, h * 0.22)),
      tape: { x: pad, y: 0, w: w - pad * 2, h: tapeH },
      ball: { cx: pad + 4 + r, cy: bandY + 2 + r, r },
      vel: { cx: gapL + (thrX - 10 - gapL) / 2, top: bandY + 1, mid: bandY + bandH * 0.3, foot: bandY + bandH - 11 },
      thr: { x: thrX, y: bandY + 2, w: gw, h: bandH - caption - 2 },
      nrg: { x: thrX + gw + 16, y: bandY + 2, w: gw, h: bandH - caption - 2 },
      read,
    };
  }

  // horizon ball · heading tape · throttle · energy · velocity
  function drawDash(): void {
    const c = dashCanvas; if (!system) return;
    const g = c.getContext("2d"); if (!g) return;
    sizeDash();
    const L = dashLayout(), h = system.heading();
    g.setTransform(dashDpr, 0, 0, dashDpr, 0, 0);
    g.clearRect(0, 0, L.w, L.h);
    g.font = `10px ${MONO}`; g.textBaseline = "top";

    // heading tape — the full width now, dissolving at the ends rather than stopping short of them
    const deg = deg360(h.theta), pxPerDeg = 3.6, cx = L.w * 0.5, reach = L.tape.w / 2;
    for (let d = -90; d <= 90; d += 5) {
      const val = ((Math.round(deg / 5) * 5 + d) % 360 + 360) % 360;
      let diff = val - deg; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
      const x = cx + diff * pxPerDeg;
      if (x < L.tape.x || x > L.tape.x + L.tape.w) continue;
      const major = val % 30 === 0;
      g.globalAlpha = Math.max(0, Math.min(1, (reach - Math.abs(x - cx)) / 26));
      g.strokeStyle = major ? "rgba(0,229,255,.75)" : "rgba(242,245,255,.28)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, L.compact ? 3 : 5); g.lineTo(x, (major ? 15 : 10) - (L.compact ? 3 : 0)); g.stroke();
      // in the rail the band's one text line belongs to HDG and the state, so the ticks go unlabelled
      if (major && !L.compact) { g.fillStyle = "rgba(242,245,255,.72)"; g.textAlign = "center"; g.fillText(String(val).padStart(3, "0"), x, 17); }
      g.globalAlpha = 1;
    }
    g.fillStyle = "#00e5ff"; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx - 4, 5); g.lineTo(cx + 4, 5); g.closePath(); g.fill();
    const hdg = `HDG ${String(Math.round(deg)).padStart(3, "0")}°`;
    const state = h.flying ? `ETA ${Math.max(0, (1 - h.flightT) * h.flightDur).toFixed(1)}s` : current ? "holding" : coreOpen ? "at core" : "orbit";
    g.fillStyle = "rgba(0,229,255,.9)";
    if (L.compact) {
      // the band's bottom line carries what the tall panel says under the velocity block
      g.textAlign = "left"; g.fillText(hdg, L.tape.x, L.tape.h - 11);
      g.fillStyle = h.flying ? "#00e5ff" : "rgba(242,245,255,.45)"; g.textAlign = "right";
      g.fillText(state, L.tape.x + L.tape.w, L.tape.h - 11);
    } else { g.textAlign = "center"; g.fillText(hdg, cx, L.tape.h - 12); }

    // artificial horizon: pitch from phi, roll from the camera's z
    const { cx: hx, cy: hy, r: hr } = L.ball;
    g.save(); g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.clip();
    g.translate(hx, hy + (h.phi - 0.27) * hr * 3); g.rotate(-h.roll);
    g.fillStyle = "rgba(0,229,255,.10)"; g.fillRect(-hr * 3, -hr * 6, hr * 6, hr * 6);
    g.fillStyle = "rgba(255,181,71,.10)"; g.fillRect(-hr * 3, 0, hr * 6, hr * 6);
    g.strokeStyle = "rgba(0,229,255,.8)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-hr * 3, 0); g.lineTo(hr * 3, 0); g.stroke();
    g.strokeStyle = "rgba(242,245,255,.35)";
    if (!L.compact) for (const k of [-2, -1, 1, 2]) { const yy = k * hr * 0.36; g.beginPath(); g.moveTo(-hr * 0.4, yy); g.lineTo(hr * 0.4, yy); g.stroke(); }
    g.restore();
    g.strokeStyle = "rgba(0,229,255,.35)"; g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#00e5ff"; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(hx - hr * 0.42, hy); g.lineTo(hx - hr * 0.14, hy);
    g.moveTo(hx + hr * 0.14, hy); g.lineTo(hx + hr * 0.42, hy);
    g.moveTo(hx, hy - 3); g.lineTo(hx, hy + 3);
    g.stroke();
    if (!L.compact) { g.fillStyle = "rgba(242,245,255,.45)"; g.textAlign = "center"; g.fillText("ATT", hx, hy + hr + 1); }

    // velocity, in the gap the ball and the gauges leave between them
    const vel = h.flying ? h.speed * 9.6 : 0;
    g.fillStyle = "rgba(242,245,255,.45)"; g.textAlign = "center"; g.fillText("VEL au/s", L.vel.cx, L.vel.top);
    g.fillStyle = h.flying ? "#00e5ff" : "rgba(242,245,255,.8)";
    g.font = `700 ${L.velSize}px ${MONO}`;
    g.fillText(vel.toFixed(1), L.vel.cx, L.vel.mid);
    g.font = `10px ${MONO}`; g.fillStyle = "rgba(242,245,255,.45)";
    if (!L.compact) g.fillText(state, L.vel.cx, L.vel.foot);

    // throttle and energy
    const drawGauge = (box: DashBox, v: number, col: string, label: string, detents: readonly number[]): void => {
      g.fillStyle = "rgba(242,245,255,.08)"; g.fillRect(box.x, box.y, box.w, box.h);
      g.fillStyle = col; g.fillRect(box.x, box.y + box.h * (1 - v), box.w, box.h * v);
      g.strokeStyle = "rgba(242,245,255,.25)";
      for (const d of detents) { const yy = box.y + box.h * (1 - d); g.beginPath(); g.moveTo(box.x - 3, yy); g.lineTo(box.x + box.w + 3, yy); g.stroke(); }
      g.fillStyle = "rgba(242,245,255,.45)"; g.textAlign = "center"; g.fillText(label, box.x + box.w / 2, box.y + box.h + 1);
    };
    // sideways, with the caption and the value inside the bar: the rail has no room above or below one
    const drawGaugeH = (box: DashBox, v: number, col: string, label: string, pct: number, detents: readonly number[]): void => {
      g.fillStyle = "rgba(242,245,255,.08)"; g.fillRect(box.x, box.y, box.w, box.h);
      g.fillStyle = col; g.fillRect(box.x, box.y, box.w * v, box.h);
      g.strokeStyle = "rgba(242,245,255,.28)"; g.lineWidth = 1;
      for (const d of detents) { const xx = box.x + box.w * d; g.beginPath(); g.moveTo(xx, box.y); g.lineTo(xx, box.y + box.h); g.stroke(); }
      g.strokeStyle = "rgba(242,245,255,.18)"; g.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
      g.font = `8px ${MONO}`; g.fillStyle = "rgba(242,245,255,.85)";
      g.textAlign = "left"; g.fillText(label, box.x + 4, box.y + 4);
      g.textAlign = "right"; g.fillText(`${Math.round(pct)} %`, box.x + box.w - 4, box.y + 4);
      g.font = `10px ${MONO}`;
    };
    const nrgCol = energy < 0.2 ? "#ff4d5e" : energy < 0.5 ? "#ffb547" : "rgba(0,229,255,.75)";
    if (L.compact) {
      drawGaugeH(L.thr, (throttle + 0.6) / 1.6, "rgba(0,229,255,.6)", "THR", throttle * 100, [0.375, 0.7]);
      drawGaugeH(L.nrg, energy, nrgCol, "NRG", energy * 100, [0.25, 0.5, 0.75]);
      return;
    }
    drawGauge(L.thr, (throttle + 0.6) / 1.6, "#00e5ff", "THR", [0.375, 0.7, 1]);
    drawGauge(L.nrg, energy, nrgCol, "NRG", [0.25, 0.5, 0.75]);
    g.textAlign = "left"; g.fillStyle = "rgba(242,245,255,.7)";
    g.fillText(`${Math.round(throttle * 100)} %`, L.read, L.thr.y);
    g.fillText(`${Math.round(energy * 100)} %`, L.read, L.thr.y + 13);
    g.fillStyle = "rgba(242,245,255,.3)"; g.fillText(`${fps.value} fps`, L.read, L.thr.y + L.thr.h - 10);
  }

  // ── target lock reticle (follows the hovered / current planet) ──
  // the bracket is recomputed here from the scene's last camera, so a raw copy chatters by a frame;
  // easing it makes it settle, and lets it stay on the destination for the whole flight
  const lockAt = { x: 0, y: 0, px: 60, on: false };
  function drawLock(dt: number): void {
    if (!system) return;
    const h = system.heading();
    const held = current ? projects.indexOf(current) : -1;
    // mid-flight the bracket is the destination marker: the one thing that says where we are going
    const idx = h.flying ? held : h.hot >= 0 ? h.hot : held;
    const b = h.bodies[idx];
    const off = (): void => { lockEl.classList.remove("is-on"); lockAt.on = false; };
    if (idx < 0 || !b) { off(); return; }
    const p = system.project({ x: b.x, y: b.y, z: b.z });
    if (p.z > 1) { off(); return; }
    const dist = Math.hypot(h.pos.x - b.x, h.pos.y - b.y, h.pos.z - b.z);
    const px = clamp((b.size * 900) / (2 * Math.tan(21 * Math.PI / 180) * dist) * 2.6, 44, 220);
    const k = lockAt.on ? 1 - Math.exp(-dt * 14) : 1;
    lockAt.x += (p.x - lockAt.x) * k; lockAt.y += (p.y - lockAt.y) * k; lockAt.px += (px - lockAt.px) * k;
    lockAt.on = true;
    lockEl.style.width = lockEl.style.height = `${lockAt.px.toFixed(1)}px`;
    lockEl.style.left = `${lockAt.x.toFixed(1)}px`; lockEl.style.top = `${lockAt.y.toFixed(1)}px`;
    $(".lock__t", lockEl).textContent = `${h.flying ? "→ " : ""}${projects[idx].title} · ${dist.toFixed(1)} au`;
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
  /**
   * One tap, one commitment. A tap mid-flight re-aims the ship rather than being dropped on the floor;
   * a tap on the body we are already inbound to, or already parked at, blinks the bracket and says so.
   * Nothing here is ever silent — that silence is what made the planets feel dead on a phone.
   */
  function select(p: Project): void {
    if (!system) return;
    const flying = system.isFlying();
    if (current?.id === p.id) {
      refuse(); showToast(flying ? `already inbound · ${p.title.toLowerCase()}` : `already holding · ${p.title.toLowerCase()}`, 1800);
      return;
    }
    if (energy < 0.08) { refuse(); showToast("out of energy · head toward the sun to recharge", 3000); return; }
    if (flying) { abortTour(); showToast(`rerouting · ${p.title.toLowerCase()}`, 1800); }
    closeSheet();
    current = p; coreOpen = false; closePanel(); closeHud(false); markCurrent(); deck.classList.add("is-flying");
    ev("deck_flight", { id: p.id });
    system.flyTo(p.id, () => {
      deck.classList.remove("is-flying"); openHud(p);
      visited.add(p.id);
      if (visited.size >= projects.length) findEgg("grandtour", "me");
    });
  }
  function selectSun(): void {
    if (!system) return;
    const flying = system.isFlying();
    if (coreOpen) { refuse(); showToast(flying ? "already inbound · the sun" : "already holding · the sun", 1800); return; }
    if (flying) { abortTour(); showToast("rerouting · the sun", 1800); }
    closeSheet();
    current = null; coreOpen = true; closePanel(); closeHud(false); markCurrent(); deck.classList.add("is-flying");
    sunVisits++;
    if (sunVisits >= 3) findEgg("sunstare", "space");
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
      meta: `<span>project ${pad2(i + 1)} of ${pad2(projects.length)}</span><span>${p.category}</span><span>built ${p.year ?? "—"}</span><span class="${p.live ? "on" : ""}">${p.live ? "live now" : p.status ?? "source only"}</span>`,
      title: p.title, tag: p.tagline, desc: p.description,
      mods: `<span class="hud__k">what it is built with</span>` + p.stack.map((s, k) => `<div class="mod"><span>${pad2(k + 1)}</span><b>${s}</b><i style="--w:${70 + ((k * 37) % 30)}%"></i></div>`).join(""),
      // a private repository has no link to give: its url 404s for anyone but me
      demo: p.live
        ? `<span class="hud__k">try it</span><a href="${p.live}" target="_blank" rel="noopener">${liveHost} ↗</a>`
        : `<span class="hud__k">try it</span><span style="color:var(--fg-3)">${p.sourcePrivate ? "not deployed publicly · the source is private" : "not deployed publicly · the source is on github"}</span>`,
      links: `${p.sourcePrivate ? "" : `<a href="${p.github}" target="_blank" rel="noopener">see the code on github ↗</a>`}${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">open the live site ↗</a>` : ""}`,
      range: `project ${pad2(i + 1)} of ${pad2(projects.length)} · ${ORBIT_AU[i] ?? "—"} au out`, comp: compositionHtml(p) });
  }
  function openCore(): void {
    audio.chord();
    fillHud({ idx: "me", meta: `<span>about me</span><span class="on">open to work · remote</span><span>${person.location}</span>`,
      title: person.name, tag: "software engineer · the star at the centre of this system", desc: `${person.positioning} Every planet out here is something I shipped.`,
      mods: `<span class="hud__k">what i work with</span>` + skills.map((g, k) => `<div class="mod"><span>${pad2(k + 1)}</span><b>${g.group} · ${g.items.join(", ")}</b><i style="--w:${82 + ((k * 11) % 18)}%"></i></div>`).join(""),
      demo: `<span class="hud__k">get in touch</span><a href="mailto:${person.email}">${person.email}</a>`,
      links: `<a href="${person.cv}" target="_blank" rel="noopener">resume ↓</a><a href="${person.github}" target="_blank" rel="noopener">github ↗</a><a href="${person.linkedin}" target="_blank" rel="noopener">linkedin ↗</a>`,
      range: "you found me" });
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
    if (!system) return;
    const i = current ? projects.indexOf(current) : -1;
    select(projects[(i + dir + projects.length) % projects.length]);
  }
  function toggleCutaway(): void {
    if (!system || !current || system.isFlying()) return;
    const on = !system.cutawayOpen(current.id);
    system.cutaway(current.id, on);
    $(".hud__cut", hud).classList.toggle("is-on", on);
    showToast(on ? `${current.title} opened up · ${current.langs.length} layers · drag to look around` : "closed", 1800);
    if (on) { cutOpen.add(current.id); if (cutOpen.size >= 3) findEgg("geologist", "me"); }
    if (on) audio.chord(); else audio.click();
  }
  listen($(".hud__cut", hud), "click", toggleCutaway);
  listen($(".hud__close", hud), "click", () => closeHud(true));
  listen($(".hud__next", hud), "click", () => step(1));
  listen($(".hud__prev", hud), "click", () => step(-1));

  /** A year of public commits as a 7-row calendar. Omitted entirely when GitHub could not be read. */
  function heatmapHtml(): string {
    if (!activity || activity.days.length < 90) return "";
    // pad to a Sunday so the rows line up as weekdays, the way the profile page shows them
    const lead = new Date(`${activity.days[0]?.date ?? ""}T00:00:00Z`).getUTCDay();
    const pad = Number.isNaN(lead) ? 0 : lead;
    const cells = [
      ...Array.from({ length: pad }, () => `<i data-l="0" aria-hidden="true"></i>`),
      ...activity.days.map((d) => `<i data-l="${d.level}" title="${d.count === 1 ? "1 commit" : `${d.count} commits`} · ${d.date}"></i>`),
    ].join("");
    const busiest = activity.days.reduce((a, d) => (d.count > a.count ? d : a), activity.days[0] ?? { date: "", count: 0, level: 0 });
    return `<div class="heat">
      <div class="heat__top"><span>commits · last 12 months</span><span><b>${activity.total.toLocaleString("en-GB")}</b> total · busiest day <b>${busiest.count}</b></span></div>
      <div class="heat__grid">${cells}</div>
      <div class="heat__key"><span>quiet</span><i data-l="0"></i><i data-l="1"></i><i data-l="2"></i><i data-l="3"></i><i data-l="4"></i><span>busy</span></div>
    </div>`;
  }

  // ── panels: pilot · log · comms · diagnostics · black box · next mission ──
  const PANELS: Record<PanelName, () => string> = {
    pilot: () => {
      const served = dur(experience.reduce((a, x) => a + months(x), 0));
      const langs = new Set(projects.flatMap((p) => p.langs.map(([n]) => n)));
      const stats: readonly (readonly [string, string])[] = [
        [served, "in the industry"], [pad2(projects.length), "projects shipped"],
        [pad2(projects.filter((p) => p.live).length), "running live"], [pad2(langs.size), "languages used"],
      ];
      return `<div class="dossier">
      <div class="dossier__id">
        <span class="dossier__badge" data-w></span>
        <div class="dossier__who"><b>${esc(person.name)}</b><span>callsign <em>wosmo</em> · ${esc(person.role)}</span></div>
        <span class="dossier__st"><i></i> available for hire</span>
      </div>
      <p class="pilot__bio">I build the whole thing — schema, Go services, Next.js clients, deploy. Security-first: a <em>zero-knowledge cloud platform</em>, a concurrent WebSocket system across web and mobile, and client products spanning e-commerce, POS, HRMS and real estate.</p>
      <div class="dossier__stats">${stats.map(([v, k]) => `<div><b>${esc(v)}</b><span>${k}</span></div>`).join("")}</div>
      ${heatmapHtml()}
      <div class="loadout">${skills.map((g, i) => `<div class="loadout__g"><span class="loadout__n">${pad2(i + 1)}</span><span class="loadout__k">${esc(g.group)}</span><ul>${g.items.map((x) => `<li class="sf sf--chip"><span class="sf__in">${esc(x)}</span></li>`).join("")}</ul></div>`).join("")}</div>
      <div class="dossier__foot"><span>base · <b>${esc(person.location)}</b></span><span>${esc(person.tzLabel)}</span><a href="${esc(person.cv)}" target="_blank" rel="noopener">résumé ↓</a><a href="${esc(person.github)}" target="_blank" rel="noopener">github ↗</a><a href="mailto:${esc(person.email)}">email ↗</a></div>
    </div>`;
    },
    log: () => `<div class="log">${experience.map((x, i) => `<div class="mission sf sf--thin"><div class="sf__in">
      <div class="mission__top"><span>job ${pad2(experience.length - i)}</span><span>${fmt(x.start)} → ${fmt(x.end)}</span><span>${dur(months(x))}</span><span class="mission__st ${x.end ? "" : "on"}">${x.end ? "complete" : "active"}</span></div>
      <h3 class="mission__co">${x.company}</h3><span class="mission__role">${x.title}</span><p class="mission__note">${x.note}</p>
      <ul class="mission__sys">${x.stack.map((s) => `<li class="sf sf--chip"><span class="sf__in">${s}</span></li>`).join("")}</ul></div></div>`).join("")}</div>`,
    comms: () => `<div class="comms"><span class="hud__k">email me · i reply within a day</span>
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
      : `<p style="color:var(--fg-3)">no trips yet this visit.</p>`,
    secrets: () => `<div class="secrets">
      <div class="secrets__top"><span>found <b>${pad2(found.size)}</b> of ${pad2(SECRETS.length)}</span><span>press ? any time</span></div>
      ${SECRETS.map((x, i) => {
        const got = found.has(x.id);
        return `<div class="secrets__row ${got ? "is-got" : ""}"><i>${got ? "✦" : pad2(i + 1)}</i><div><b>${got ? esc(x.name) : "▮▮▮▮▮▮"}</b><small>${esc(x.hint)}</small></div></div>`;
      }).join("")}
    </div>`,
    next: () => `<div class="comms"><span class="hud__k">project 09 · being built right now</span><p class="pilot__bio">This site. A v3 rewrite of wosmos.vercel.app in Next 16 + React Three Fiber — the solar system you're flying through, the flight deck you're sitting in, the real WebSocket presence layer the door promises. You're looking at the prototype.</p>
      <div class="comms__links"><a href="https://github.com/Wosmos/portfolio-website" target="_blank" rel="noopener">github · portfolio-website ↗</a></div></div>`,
  };
  function openPanel(name: PanelName): void {
    if (panelOpen === name) { closePanel(); return; }
    closeSheet();   // the switch that opened this lives in the sheet; keep the glass free to read on
    ev("deck_panel", { panel: name });
    panelOpen = name; $("#panel-title").textContent = PANEL_TITLES[name]; $("#panel-body").innerHTML = PANELS[name]();
    for (const k of $$(".sw[data-panel]")) k.classList.toggle("is-on", k.dataset.panel === name);
    panel.setAttribute("aria-hidden", "false"); panel.classList.add("is-on"); audio.arrive();
    anim(gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, ease: "power3.out" }));
    const items = $$("#panel-body > * > *"); if (items.length) anim(gsap.from(items, { opacity: 0, y: 8, duration: reduced ? 0 : 0.5, stagger: 0.05, ease: "power2.out", delay: 0.1 }));
    const badge = panel.querySelector("[data-w]");
    if (badge) { const w = $(".deck__w").cloneNode(true); if (w instanceof HTMLElement) { w.removeAttribute("class"); w.removeAttribute("style"); badge.appendChild(w); } }
    const copy = panel.querySelector<HTMLButtonElement>("[data-copy]");
    copy?.addEventListener("click", () => {
      void navigator.clipboard?.writeText(person.email).then(() => { copy.dataset.copied = "true"; timer(() => { delete copy.dataset.copied; }, 1400); });
    });
  }
  function closePanel(): void {
    if (!panelOpen) return; panelOpen = null; for (const k of $$(".sw[data-panel]")) k.classList.remove("is-on");
    panel.setAttribute("aria-hidden", "true");
    anim(gsap.to(panel, { opacity: 0, y: 10, duration: reduced ? 0 : 0.25, ease: "power2.in", onComplete: () => panel.classList.remove("is-on") }));
  }
  for (const k of $$<HTMLButtonElement>(".sw[data-panel]")) listen(k, "click", () => { const name = k.dataset.panel; if (isPanelName(name)) openPanel(name); });
  listen($(".panel__close"), "click", closePanel);
  listen($("[data-tour]"), "click", () => tour());

  // ── tour ──────────────────────────────────────────────
  function tour(): void {
    if (!system || tourTimer) { abortTour(); return; }
    showToast("guided tour · visiting all eight · esc to stop", 3000); let i = -1;
    const hop = (): void => {
      i++;
      const p = projects[i];
      if (!p) { tourTimer = 0; closeHud(true); showToast("that is all eight"); return; }
      current = p; coreOpen = false; markCurrent(); closeHud(false); deck.classList.add("is-flying");
      system?.flyTo(p.id, () => { deck.classList.remove("is-flying"); openHud(p); tourTimer = timer(hop, 4200); });
    };
    tourTimer = -1; hop();
  }
  function abortTour(): void { if (tourTimer) { if (tourTimer > 0) clear(tourTimer); tourTimer = 0; showToast("tour stopped"); } }

  // ── command line ──────────────────────────────────────
  const COMMANDS: Record<string, (arg: string) => string> = {
    help: () => "jump <name|n>  fly to a project · cutaway  cut the planet open · scan  every project · whoami  about me\ntour  visit all eight · zoom <n> · fact · secrets · status · diag · bbox · sun · home · clear · exit",
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
    fact: () => { hideCmd(); whisper(); findEgg("fact", "space"); return ""; },
    secrets: () => { hideCmd(); findEgg("manifest", "random"); openPanel("secrets"); return ""; },
    zoom: (arg) => {
      const v = Number(arg);
      if (!Number.isFinite(v)) return "zoom <-0.6 … 1>";
      setThrottle(v); return `zoom ${throttle.toFixed(2)}`;
    },
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
  listen($("[data-cmd]"), "click", () => { showCmd(); findEgg("cmdline", "random"); });

  // ── beacon ────────────────────────────────────────────
  function scheduleBeacon(): void { timer(spawnBeacon, 40_000 + Math.random() * 60_000); }
  function spawnBeacon(): void {
    beacon.hidden = false;
    const y = 120 + Math.random() * (innerHeight * 0.45);
    anim(gsap.fromTo(beacon, { left: -40, top: y }, { left: innerWidth + 40, duration: 26, ease: "none", onComplete: () => { beacon.hidden = true; scheduleBeacon(); } }));
  }
  listen(beacon, "click", () => { gsap.killTweensOf(beacon); beacon.hidden = true; openPanel("next"); findEgg("beacon", "random"); scheduleBeacon(); });

  // ── hyperdrive ────────────────────────────────────────
  function hyper(): void {
    if (hyperOn) return; hyperOn = true; system?.setHyper(true); showToast("hyperdrive · the planets speed up ×9", 4000); ev("easter_egg", { egg: "hyperdrive" }); audio.chord();
    timer(() => { system?.setHyper(false); hyperOn = false; }, 10_000);
  }

  // ── sound toggle ──────────────────────────────────────
  const renderSnd = (): void => {
    snd.setAttribute("aria-pressed", String(!audio.muted));
    snd.classList.toggle("sw--off", audio.muted);
    snd.classList.toggle("is-on", !audio.muted);
    const label = snd.querySelector("span");
    if (label) label.textContent = audio.muted ? "sound off" : "sound on";
  };
  listen(snd, "click", () => {
    audio.setMuted(!audio.muted); storageSet("local", MUTE_KEY, audio.muted ? "1" : "0"); renderSnd();
    if (++sndFlips >= 5) findEgg("silence", "space");
  });
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
      if (ctor?.requestPermission) { const r = await ctor.requestPermission(); if (r !== "granted") { showToast("tilt needs motion permission"); return; } }
    } catch { /* permission API absent or blocked — try listening anyway */ }
    if (disposed) return;
    window.addEventListener("deviceorientation", onOrient); gyroOn = true; gyroBtn.classList.add("is-on"); showToast("tilt on · move the phone to look around");
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
  function recharge(): void { setThrottle(1); showToast("recharging · flying toward the sun", 2000); }
  function toBelt(): void { setThrottle(0.42); showToast("holding at the asteroid belt", 1600); }
  listen($("#lamp-link"), "click", reping);
  listen($("#lamp-belt"), "click", toBelt);
  listen($("#lamp-lock"), "click", () => {
    const h = system?.heading(); if (!h) return;
    const hot = projects[h.hot];
    if (h.hot >= 0 && hot) { select(hot); return; }
    if (h.sunHot) { selectSun(); return; }
    if (current) { closeHud(true); return; }
    showToast("point at a planet first", 1400);
  });
  listen($("#lamp-hyper"), "click", () => hyper());
  listen($("#lamp-fuel"), "click", recharge);
  for (const row of $$(".tele__row[data-act]")) listen(row, "click", () => {
    const act = row.dataset.act;
    if (act === "state") { if (system?.focusedId()) closeHud(true); else showToast("already back in orbit", 1400); }
    if (act === "range") { rangeKm = !rangeKm; renderTele(); }
    if (act === "uplink") reping();
    if (act === "push") window.open(lastPush ? `https://github.com/Wosmos/${encodeURIComponent(lastPush.repo)}` : person.github, "_blank", "noopener");
    if (act === "clock") { clockLocal = !clockLocal; renderTele(); }
  });
  // ── zoom: the console rocker owns it, and it is the only widget the wheel talks to ──
  const zoomTrack = $("#zoom-track");
  function setThrottle(v: number): void {
    throttle = clamp(v, -0.6, 1);
    system?.setThrottle(throttle);
    zoomTrack.style.setProperty("--v", `${(((throttle + 0.6) / 1.6) * 100).toFixed(1)}%`);
    if (throttle <= -0.595) findEgg("deepspace", "space");
  }
  {
    const holds = new Map<number, number>();
    for (const b of $$<HTMLButtonElement>("[data-zoom]")) {
      const dir = Number(b.dataset.zoom) || 1;
      listen(b, "pointerdown", (e) => {
        setThrottle(throttle + dir * 0.07);   // the click sound comes from the shared handler
        const id = window.setInterval(() => setThrottle(throttle + dir * 0.05), 90);
        intervals.add(id); holds.set(e.pointerId, id);
      });
    }
    const release = (e: PointerEvent): void => {
      const id = holds.get(e.pointerId);
      if (id !== undefined) { window.clearInterval(id); intervals.delete(id); holds.delete(e.pointerId); }
    };
    listen(window, "pointerup", release);
    listen(window, "pointercancel", release);
    // drag along the track for a direct set
    let dragging = false;
    const fromX = (x: number): number => { const r = zoomTrack.getBoundingClientRect(); return ((x - r.left) / Math.max(1, r.width)) * 1.6 - 0.6; };
    listen(zoomTrack, "pointerdown", (e) => { dragging = true; zoomTrack.setPointerCapture(e.pointerId); setThrottle(fromX(e.clientX)); });
    listen(zoomTrack, "pointermove", (e) => { if (dragging) setThrottle(fromX(e.clientX)); });
    listen(window, "pointerup", () => { dragging = false; });
  }

  // dash canvas: drag the heading tape to turn, tap the horizon to level, drag the THR gauge, tap NRG to recharge
  {
    const c = dashCanvas; let mode: DashDrag = null, lastX = 0;
    // pointer positions are in CSS pixels, the space dashLayout() works in
    const pt = (e: PointerEvent): { x: number; y: number } => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    // the rail's regions are half the size of the panel's, so the slop around them doubles there
    const near = (box: DashBox, x: number, y: number, s: number): boolean =>
      x > box.x - s && x < box.x + box.w + s && y > box.y - s && y < box.y + box.h + s;
    const thrFrom = (x: number, y: number): number => {
      const L = dashLayout();
      const u = L.compact ? (x - L.thr.x) / L.thr.w : 1 - (y - L.thr.y) / L.thr.h;
      return clamp(u * 1.6 - 0.6, -0.6, 1);
    };
    listen(c, "pointerdown", (e) => {
      const { x, y } = pt(e), L = dashLayout(), s = L.compact ? 13 : 8;
      if (y < L.tape.h) { mode = "tape"; lastX = x; c.setPointerCapture(e.pointerId); }
      else if (Math.hypot(x - L.ball.cx, y - L.ball.cy) < L.ball.r + s) { system?.level(); showToast("view levelled", 1200); audio.tick(); }
      else if (near(L.thr, x, y, s)) { mode = "thr"; setThrottle(thrFrom(x, y)); c.setPointerCapture(e.pointerId); }
      else if (near(L.nrg, x, y, s)) recharge();
    });
    listen(c, "pointermove", (e) => {
      if (!mode) return; const { x, y } = pt(e);
      if (mode === "tape") { system?.nudge((x - lastX) / 3.6 * Math.PI / 180); lastX = x; }
      if (mode === "thr") setThrottle(thrFrom(x, y));
    });
    listen(window, "pointerup", () => { mode = null; });
  }

  // ── input ─────────────────────────────────────────────
  let kIdx = 0;
  listen(window, "keydown", (e) => {
    if (!started || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!cmd.hidden) { if (e.key === "Escape") hideCmd(); return; }
    kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : e.key === KONAMI[0] ? 1 : 0;
    if (kIdx === KONAMI.length) { kIdx = 0; hyper(); findEgg("konami", "random"); return; }
    const k = e.key.toLowerCase();
    if (e.key === "/") { e.preventDefault(); showCmd(); findEgg("cmdline", "random"); return; }
    if (e.key === "Escape") { if (panelOpen) { closePanel(); return; } if (sheetOpen()) { closeSheet(); return; } abortTour(); if (system?.focusedId()) closeHud(true); }
    if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1);
    if (k === "x") toggleCutaway();
    if (/^[1-8]$/.test(e.key)) { const p = projects[Number(e.key) - 1]; if (p) select(p); }
    if (e.key === "9") { findEgg("next", "me"); openPanel("next"); }
    if (k === "p") openPanel("pilot"); if (k === "m") openPanel("log"); if (k === "c") openPanel("comms");
    if (k === "d") { findEgg("diag", "random"); openPanel("diag"); }
    if (k === "b") { findEgg("blackbox", "random"); openPanel("bbox"); }
    if (k === "f") { whisper(); findEgg("fact", "space"); }
    if (e.key === "?") { findEgg("manifest", "random"); openPanel("secrets"); }
    // typing the pilot's handle anywhere
    typed = (typed + k).slice(-5);
    if (typed === "wosmo") findEgg("callsign", "me");
    if (k === "t") tour(); if (k === "s") snd.click(); if (k === "0") selectSun();
  });
  // A wheel over a panel, the readout or the dashboard scrolls that thing. Only the open view and the
  // zoom rocker move the ship, and nothing moves it while a panel or the command line is up.
  const COCKPIT = ".dash, .hud, .panel, .cmd, .toast, .deck__id, .callout-labels, .beacon, .rotate";
  listen(window, "wheel", (e) => {
    if (!system || panelOpen !== null || !cmd.hidden) return;
    const el = e.target instanceof Element ? e.target : null;
    if (el?.closest("#zoom")) { setThrottle(throttle + (e.deltaY < 0 ? 0.05 : -0.05)); return; }
    if (el?.closest(COCKPIT)) return;
    setThrottle(throttle + e.deltaY * -0.0009);
  }, { passive: true });
  // long-press the sun → solar flare
  listen(orbitCanvas, "pointerdown", () => {
    const onSun = system?.pick()?.sun === true; clear(pressTimer);
    if (onSun) pressTimer = timer(() => { system?.flare(); showToast("solar flare", 1800); findEgg("flare", "space"); }, 650);
  });
  listen(window, "pointerup", () => clear(pressTimer));
  // three knocks on the nameplate
  listen($(".deck__id"), "click", () => {
    idFlips++; clear(idTimer); idTimer = timer(() => { idFlips = 0; }, 1400);
    if (idFlips >= 3) { idFlips = 0; openPanel("pilot"); findEgg("dossier", "me"); }
  });
  // the wordmark hides the npm card
  listen($(".deck__mark"), "click", () => { showToast(`<b>the card</b>run npx ${esc(person.npmCard)} in any terminal.`, 6000, true); findEgg("npx", "me"); });
  // no reverse gear
  listen(orbitCanvas, "contextmenu", (e) => { e.preventDefault(); findEgg("noreverse", "random"); });
  // ninety seconds of nothing and the radio speaks up
  let quiet = 0;
  const stirred = (): void => {
    clear(quiet);
    quiet = timer(() => { if (started && panelOpen === null) { whisper(); findEgg("radio", "random"); } }, 90_000);
  };
  for (const type of ["pointerdown", "keydown", "wheel"] as const) listen(window, type, stirred, { passive: true });

  // every part of the cockpit a pointer can touch: links, buttons, switches, gauges, lamps, rows, labels
  const TOUCHABLE = "a, button:not(#start), .sw, .zoom__btn, .tele__row[data-act], .lamp, .tgt, .lab, .co";
  listen(document, "pointerenter", (e) => {
    if (started && finePointer && e.target instanceof Element && e.target.closest(TOUCHABLE)) audio.tick();
  }, true);
  listen(document, "click", (e) => {
    if (started && e.target instanceof Element && e.target.closest(TOUCHABLE)) audio.click();
  }, true);
  // the instrument canvases are one element each, so a pointer moving between their widgets never
  // re-enters; tick on the press instead so tapping a gauge still answers
  for (const el of [radarCanvas, dashCanvas]) listen(el, "pointerdown", () => { if (started) audio.click(); });

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
    const sys = mod.createSystem({ canvas: orbitCanvas, labelsEl: labels, projects, scene: { ...opts.scene, orbits: ORBIT_AU }, repoStars: opts.repoStars, onSelect: select, onSunSelect: selectSun, reducedMotion: reduced,
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
      tickEnergy(dt); drawRadar(); drawDash(); drawLock(dt); drawCallouts();
    };
    loop(performance.now());
    scheduleBeacon();
    console.log("%c wosmo · flight deck ", "background:#050508;color:#00e5ff;font:12px/1.6 ui-monospace,monospace;border:1px solid #00e5ff;padding:4px 8px",
      `\n  1–8  jump · 0  the sun · t  tour · /  command line · p m c  panels · ? the secrets manifest\n  ${SECRETS.length} secrets are hidden in here and you have found ${found.size}. try f, and try holding the sun.\n`);
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
    deck.classList.remove("is-sheet", "is-refuse", "is-flying");
    labelsEl?.remove(); labelsEl = null;
    clearCallouts();
    audio.setMuted(true); // AudioApi has no dispose; silence the orphaned context so nothing plays over the next route
    html.style.removeProperty("--tx"); html.style.removeProperty("--ty");
    html.classList.remove("is-deck");
  };
}
