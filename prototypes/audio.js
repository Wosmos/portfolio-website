// File-based sound. Drop your own files into assets/audio/ and list them in
// assets/audio/manifest.json — see assets/audio/README.md for the slots. Anything not
// listed is silent. Plain Web Audio, no dependencies; created lazily on the first gesture.

const SLOTS = {
  ambient: { loop: true, gain: 0.5, fade: 4 },   // the bed — loops forever
  hover:   { gain: 0.35, cooldown: 70 },          // pointer enters a target
  click:   { gain: 0.6 },
  type:    { gain: 0.25, cooldown: 40 },          // readout typing
  warp:    { gain: 0.9 },                         // outbound flight (≈2.3 s)
  retro:   { gain: 0.8 },                         // return flight (≈1.9 s)
  arrive:  { gain: 0.7 },                         // readout opens
  core:    { gain: 0.7 },                         // the sun / easter eggs
  thud:    { gain: 0.9 },                         // hyperspace stop
  beltHit: { gain: 0.8 },                         // a jump crosses the asteroid belt
  belt:    { loop: true, gain: 0.55 },            // debris rumble, level follows belt proximity
};

// `ambientGain` scales the bed (1 = the flight deck level; the reading site uses 0.5 ≈ −6 dB).
export function createAudio({ muted = false, base = "./assets/audio/", ambientGain = 1 } = {}) {
  let ctx = null, master = null, isMuted = muted;
  const buffers = {}, lastAt = {}, listeners = new Set();
  let ambientNode = null, manifest = null, loading = null;

  function ensure() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = isMuted ? 0 : 1;
    master.connect(ctx.destination);
    return ctx;
  }
  async function load() {
    if (loading) return loading;
    loading = (async () => {
      ensure();
      try { manifest = await fetch(base + "manifest.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})); } catch { manifest = {}; }
      await Promise.all(Object.entries(manifest).map(async ([slot, file]) => {
        if (!SLOTS[slot] || !file) return;
        try {
          const ab = await fetch(base + file).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)));
          buffers[slot] = await ctx.decodeAudioData(ab);
        } catch (e) { console.warn(`[audio] ${slot}: could not load ${file}`, e); }
      }));
      return buffers;
    })();
    return loading;
  }
  function play(slot, { gain = 1, rate = 1 } = {}) {
    const cfg = SLOTS[slot];
    if (!ctx || !buffers[slot] || !cfg) return null;
    const now = performance.now();
    if (cfg.cooldown && now - (lastAt[slot] || 0) < cfg.cooldown) return null;
    lastAt[slot] = now;
    const src = ctx.createBufferSource();
    src.buffer = buffers[slot]; src.playbackRate.value = rate; src.loop = !!cfg.loop;
    const g = ctx.createGain(); g.gain.value = cfg.gain * gain;
    src.connect(g); g.connect(master); src.start();
    return { src, g };
  }
  async function startAmbient() {
    await load();
    if (ambientNode || !buffers.ambient) return;
    const n = play("ambient", { gain: 0.0001 });
    if (!n) return;
    n.g.gain.setValueAtTime(0.0001, ctx.currentTime);
    n.g.gain.exponentialRampToValueAtTime(SLOTS.ambient.gain * ambientGain, ctx.currentTime + SLOTS.ambient.fade);
    ambientNode = n;
  }
  const loops = {};
  async function startLoop(slot) {
    await load();
    if (loops[slot] || !buffers[slot]) return;
    const n = play(slot, { gain: 0.0001 });
    if (n) loops[slot] = n;
  }
  function setLevel(slot, k) {
    const n = loops[slot]; if (!n || !ctx) return;
    const target = Math.max(0.0001, SLOTS[slot].gain * Math.min(1, Math.max(0, k)));
    n.g.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  }
  function setMuted(v) {
    isMuted = v;
    if (master) master.gain.linearRampToValueAtTime(v ? 0 : 1, ctx.currentTime + 0.15);
    listeners.forEach((fn) => fn(v));
  }
  return {
    load, startAmbient, setMuted,
    click: () => play("click"), tick: () => play("hover"), type: () => play("type"),
    warp: (rate = 1) => play("warp", { rate }), retro: (rate = 1) => play("retro", { rate }), arrive: () => play("arrive"), chord: () => play("core"),
    thud: () => play("thud"), beltHit: () => play("beltHit"), startLoop, setLevel,
    get muted() { return isMuted; },
    get loaded() { return Object.keys(buffers); },
    onChange(fn) { listeners.add(fn); },
    resume() { ensure(); if (ctx.state === "suspended") ctx.resume(); },
  };
}
