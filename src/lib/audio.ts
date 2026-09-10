// File-based sound (Web Audio, no dependencies). Files live in /public/v3/audio and are listed in
// manifest.json; anything not listed is silent. The context is created lazily on the first gesture.
// Ported from the prototype's audio.js; shared by the reading site and the flight deck.

export type Slot = "ambient" | "hover" | "click" | "type" | "warp" | "retro" | "arrive" | "core" | "thud" | "beltHit" | "belt";
interface SlotConfig { loop?: boolean; gain: number; fade?: number; cooldown?: number }
interface Voice { src: AudioBufferSourceNode; g: GainNode }
type Manifest = Partial<Record<Slot | "credits", string>>;

const SLOTS: Record<Slot, SlotConfig> = {
  ambient: { loop: true, gain: 0.5, fade: 4 },
  hover: { gain: 0.35, cooldown: 70 },
  click: { gain: 0.6 },
  type: { gain: 0.25, cooldown: 40 },
  warp: { gain: 0.9 },
  retro: { gain: 0.8 },
  arrive: { gain: 0.7 },
  core: { gain: 0.7 },
  thud: { gain: 0.9 },
  beltHit: { gain: 0.8 },
  belt: { loop: true, gain: 0.55 },
};
const isSlot = (s: string): s is Slot => s in SLOTS;
// the long loops are hundreds of KB; they are only fetched when something asks to play them
const LAZY: ReadonlySet<Slot> = new Set<Slot>(["ambient", "belt"]);

export interface AudioOptions { muted?: boolean; base?: string; ambientGain?: number }
export interface AudioApi {
  load(): Promise<void>;
  startAmbient(): Promise<void>;
  startLoop(slot: Slot): Promise<void>;
  setLevel(slot: Slot, k: number): void;
  setMuted(v: boolean): void;
  readonly muted: boolean;
  readonly loaded: readonly Slot[];
  /** Subscribe to mute changes; returns an unsubscribe. */
  onChange(fn: (muted: boolean) => void): () => void;
  resume(): void;
  click(): void; tick(): void; type(): void; arrive(): void; chord(): void; thud(): void; beltHit(): void;
  warp(rate?: number): void; retro(rate?: number): void;
}

export const MUTE_KEY = "v3-muted";
export function storedMuted(): boolean {
  try { return typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function createAudio({ muted = false, base = "/v3/audio/", ambientGain = 1 }: AudioOptions = {}): AudioApi {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let isMuted = muted;
  const buffers = new Map<Slot, AudioBuffer>();
  const lastAt = new Map<Slot, number>();
  const listeners = new Set<(muted: boolean) => void>();
  const loops = new Map<Slot, Voice>();
  let ambientNode: Voice | null = null;
  let loading: Promise<void> | null = null;
  let manifest: Manifest | null = null;

  function ensure(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = isMuted ? 0 : 1;
    master.connect(ctx.destination);
    return ctx;
  }
  async function readManifest(): Promise<Manifest> {
    if (manifest) return manifest;
    try {
      const r = await fetch(`${base}manifest.json`, { cache: "force-cache" });
      manifest = r.ok ? ((await r.json()) as Manifest) : {};
    } catch { manifest = {}; }
    return manifest;
  }
  async function fetchSlot(slot: Slot): Promise<void> {
    if (buffers.has(slot)) return;
    const file = (await readManifest())[slot];
    if (!file) return;
    const ac = ensure();
    try {
      const r = await fetch(base + file);
      if (!r.ok) throw new Error(String(r.status));
      buffers.set(slot, await ac.decodeAudioData(await r.arrayBuffer()));
    } catch (e) { console.warn(`[audio] ${slot}: could not load ${file}`, e); }
  }
  /** Loads the short interface cuts only. `ambient` and `belt` are streams — see `startAmbient`. */
  function load(): Promise<void> {
    if (loading) return loading;
    loading = (async () => {
      ensure();
      const m = await readManifest();
      const eager = (Object.keys(m).filter((k): k is Slot => isSlot(k) && !LAZY.has(k)));
      await Promise.all(eager.map(fetchSlot));
    })();
    return loading;
  }
  function play(slot: Slot, { gain = 1, rate = 1 }: { gain?: number; rate?: number } = {}): Voice | null {
    const cfg = SLOTS[slot];
    const buf = buffers.get(slot);
    if (!ctx || !master || !buf) return null;
    const now = performance.now();
    if (cfg.cooldown && now - (lastAt.get(slot) ?? 0) < cfg.cooldown) return null;
    lastAt.set(slot, now);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate; src.loop = Boolean(cfg.loop);
    const g = ctx.createGain(); g.gain.value = cfg.gain * gain;
    src.connect(g); g.connect(master); src.start();
    return { src, g };
  }
  async function startAmbient(): Promise<void> {
    if (ambientNode) return;
    await fetchSlot("ambient");                 // fetched here, not with the interface cuts
    if (ambientNode || !buffers.has("ambient") || !ctx) return;
    const n = play("ambient", { gain: 0.0001 });
    if (!n) return;
    n.g.gain.setValueAtTime(0.0001, ctx.currentTime);
    n.g.gain.exponentialRampToValueAtTime(SLOTS.ambient.gain * ambientGain, ctx.currentTime + (SLOTS.ambient.fade ?? 4));
    ambientNode = n;
  }
  async function startLoop(slot: Slot): Promise<void> {
    if (loops.has(slot)) return;
    await fetchSlot(slot);
    if (loops.has(slot) || !buffers.has(slot)) return;
    const n = play(slot, { gain: 0.0001 });
    if (n) loops.set(slot, n);
  }
  function setLevel(slot: Slot, k: number): void {
    const n = loops.get(slot);
    if (!n || !ctx) return;
    const target = Math.max(0.0001, SLOTS[slot].gain * Math.min(1, Math.max(0, k)));
    n.g.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  }
  function setMuted(v: boolean): void {
    isMuted = v;
    if (master && ctx) master.gain.linearRampToValueAtTime(v ? 0 : 1, ctx.currentTime + 0.15);
    listeners.forEach((fn) => fn(v));
  }
  return {
    load, startAmbient, startLoop, setLevel, setMuted,
    click: () => { play("click"); }, tick: () => { play("hover"); }, type: () => { play("type"); },
    warp: (rate = 1) => { play("warp", { rate }); }, retro: (rate = 1) => { play("retro", { rate }); },
    arrive: () => { play("arrive"); }, chord: () => { play("core"); }, thud: () => { play("thud"); }, beltHit: () => { play("beltHit"); },
    get muted() { return isMuted; },
    get loaded() { return [...buffers.keys()]; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    resume() { const ac = ensure(); if (ac.state === "suspended") void ac.resume(); },
  };
}
