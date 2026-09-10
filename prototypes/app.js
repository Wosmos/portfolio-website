// Host logic: gate, sweep, header, live socket, status strip, the scroll-opened cosmos,
// system ⇄ list, flights + HUD, sound, mission log, text reveals, trail, easter eggs.

import { person, projects, experience, skills, repoIndex } from "./data.js";
import { createSystem } from "./orbit.js";
import { createAudio } from "./audio.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const desktop = matchMedia("(min-width: 861px)").matches;
const params = new URLSearchParams(location.search);
const WS_URL = params.get("ws") || "wss://echo.websocket.org";
const gsap = window.gsap, ST = window.ScrollTrigger;
const hasSplit = !!window.SplitText;
gsap.registerPlugin(ST, ...(hasSplit ? [window.SplitText] : []));

const audio = createAudio({ muted: localStorage.getItem("v3-muted") === "1" });

// ───────────────────────── live socket ─────────────────────────

const live = { on: false, rtt: null, ws: null, timer: 0 };
function connect(log) {
  return new Promise((resolve) => {
    const t0 = performance.now(); let settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    log(`→ uplink ${WS_URL}`);
    let ws;
    try { ws = new WebSocket(WS_URL); } catch { log(`✗ invalid url`, "bad"); return done(false); }
    const timeout = setTimeout(() => { log(`✗ no answer · continuing static`, "bad"); try { ws.close(); } catch {} done(false); }, 4000);
    ws.addEventListener("open", () => { log(`✓ open ${Math.round(performance.now() - t0)}ms`, "ok"); ws.send(`ping:${performance.now()}`); });
    ws.addEventListener("message", (e) => {
      const m = String(e.data); if (!m.startsWith("ping:")) return;
      const rtt = Math.round(performance.now() - Number(m.slice(5)));
      if (!settled) {
        clearTimeout(timeout); log(`✓ rtt ${rtt}ms`, "ok");
        live.on = true; live.ws = ws; setRtt(rtt);
        live.timer = setInterval(() => { if (ws.readyState === 1) ws.send(`ping:${performance.now()}`); }, 4000);
        done(true);
      } else setRtt(rtt);
    });
    ws.addEventListener("error", () => { clearTimeout(timeout); log(`✗ unreachable · continuing static`, "bad"); done(false); });
    ws.addEventListener("close", () => { if (live.on) { live.on = false; clearInterval(live.timer); renderLive(); } });
  });
}
function setRtt(ms) { live.rtt = ms; renderLive(); }
function renderLive() {
  const el = $("#live");
  el.classList.toggle("is-on", live.on);
  $(".live__txt", el).textContent = live.on ? `live · ${live.rtt}ms` : "static";
  const cell = $('#status [data-k="live"]');
  cell.classList.toggle("is-on", live.on);
  cell.innerHTML = `<i class="live__dot"></i>${live.on ? `uplink live · ${live.rtt}ms round-trip` : "static · nothing phones home"}`;
}

// ───────────────────────── gate + sweep ─────────────────────────

const gate = $("#gate"), statusEl = $("#gate-status");
function log(line, cls) { const s = document.createElement("span"); s.textContent = line + "\n"; if (cls) s.className = cls; statusEl.appendChild(s); }
let entered = false;
async function enter() {
  if (entered) return;
  entered = true;
  audio.resume(); audio.click(); audio.startAmbient(); audio.startLoop("belt");
  $("#enter").disabled = true;
  connect(log).then(() => renderLive()); // real handshake, in the background — the door does not wait
  await new Promise((r) => setTimeout(r, reduced ? 0 : 500));
  sweepIn();
}
function sweepIn() {
  const sweep = $("#sweep"), curtain = $(".sweep__curtain", sweep), line = $(".sweep__line", sweep);
  const reveal = () => {
    gate.style.display = "none";
    document.body.classList.remove("is-locked");
    gsap.set("main", { opacity: 1 });
    gsap.to(".hdr", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 });
    heroReveal(); initPage();
  };
  if (reduced) { reveal(); return; }
  sweep.style.visibility = "visible";
  gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => (sweep.style.visibility = "hidden") })
    .fromTo(curtain, { top: 0, height: 0 }, { height: "100%", duration: 0.85 }, 0)
    .fromTo(line, { top: "0%" }, { top: "100%", duration: 0.85 }, 0)
    .add(reveal, 0.85)
    .fromTo(curtain, { top: 0, height: "100%" }, { top: "100%", height: 0, duration: 0.95 }, 0.95)
    .fromTo(line, { top: "0%" }, { top: "100%", duration: 0.95 }, 0.95);
}
$("#enter").addEventListener("click", enter);
addEventListener("keydown", (e) => { if (!entered && (e.key === "Enter" || e.key === " ")) enter(); });
document.body.classList.add("is-locked");

// sound toggle
const snd = $("#snd");
function renderSnd() { snd.setAttribute("aria-pressed", String(!audio.muted)); $("span", snd).textContent = `sound · ${audio.muted ? "off" : "on"}`; }
snd.addEventListener("click", () => { audio.setMuted(!audio.muted); localStorage.setItem("v3-muted", audio.muted ? "1" : "0"); if (!audio.muted) audio.click(); renderSnd(); });
renderSnd();
let lastTick = 0;
document.addEventListener("pointerenter", (e) => {
  if (!entered || !finePointer) return;
  if (!e.target.closest?.("a, button, .lab, .list__row")) return;
  const now = performance.now(); if (now - lastTick < 60) return; lastTick = now; audio.tick();
}, true);
document.addEventListener("click", (e) => { if (entered && e.target.closest?.("a, button:not(#enter)")) audio.click(); }, true);

// ───────────────────────── status strip ─────────────────────────

const data = { lastPush: null, npmMonth: null };
function renderStatus() {
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: person.tz });
  $('#status [data-k="push"]').textContent = data.lastPush ? `last push · ${data.lastPush.repo} · ${data.lastPush.rel}` : "last push · fetching github…";
  $('#status [data-k="npm"]').textContent = `npx ${person.npmCard} · ${data.npmMonth != null ? `${data.npmMonth} runs this month` : "…"}`;
  $('#status [data-k="time"]').textContent = `karachi · ${person.tzLabel} · ${now}`;
}
setInterval(renderStatus, 30_000);
const relTime = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`; };
async function fetchGithub() {
  try {
    const [ev, repos] = await Promise.all([
      fetch("https://api.github.com/users/Wosmos/events/public?per_page=30").then((r) => (r.ok ? r.json() : [])),
      fetch("https://api.github.com/users/Wosmos/repos?per_page=100&sort=pushed").then((r) => (r.ok ? r.json() : [])),
    ]);
    const push = ev.find((e) => e.type === "PushEvent");
    if (push) data.lastPush = { repo: push.repo.name.split("/")[1], rel: relTime(push.created_at) };
    let changed = false;
    for (const r of repos) { const id = repoIndex[r.name.toLowerCase()]; const p = id && projects.find((x) => x.id === id); if (p && p.year == null) { p.year = new Date(r.created_at).getFullYear(); changed = true; } }
    if (changed) renderList();
    renderStatus();
  } catch { /* keep fallback text */ }
}
async function fetchNpm() { try { const r = await fetch(`https://api.npmjs.org/downloads/point/last-month/${person.npmCard}`); if (r.ok) { data.npmMonth = (await r.json()).downloads; renderStatus(); } } catch {} }
fetchGithub(); fetchNpm(); renderStatus();

// ───────────────────────── works: system ⇄ list ─────────────────────────

let system = null, mode = "orbit";
const cosmos = $("#cosmos"), listEl = $("#list"), toggle = $("#toggle"), worksPin = $(".works__pin");

function renderList() {
  listEl.innerHTML = `
    <div class="list__row is-head" aria-hidden="true"><span>orbit</span><span>project</span><span class="s">stack</span><span class="ctx">year · class</span><span class="links">links</span></div>` +
    projects.map((p, i) => `
    <button type="button" class="list__row" data-id="${p.id}">
      <span class="y">${String(i + 1).padStart(2, "0")}</span>
      <span class="t">${p.title}<i class="live-dot ${p.live ? "on" : ""}"></i></span>
      <span class="s">${p.stack.join(" · ")}</span>
      <span class="ctx u-dim">${p.year ?? "—"} · ${p.context}${p.status ? ` · ${p.status}` : ""}</span>
      <span class="links"><a href="${p.github}" target="_blank" rel="noopener">github ↗</a>${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">live ↗</a>` : `<span class="u-dim">demo</span>`}</span>
    </button>`).join("");
  $$(".list__row[data-id]", listEl).forEach((row) => row.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    setMode("orbit"); setTimeout(() => select(projects.find((p) => p.id === row.dataset.id)), 750);
  }));
}
function setMode(next, instant = false) {
  if (next === mode && !instant) return;
  mode = next; toggle.dataset.mode = mode;
  $$("button", toggle).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  localStorage.setItem("v3-mode", mode);
  const toList = mode === "list";
  if (toList) closeHud(true);
  const bodies = system?.bodies ?? [], fade = system?.fade;
  if (instant || reduced) {
    bodies.forEach((b) => (b.mix = toList ? 1 : 0)); if (fade) fade.value = toList ? 0 : 1;
    listEl.classList.toggle("is-on", toList); $("#cosmos-ui").classList.toggle("is-list", toList); return;
  }
  const tl = gsap.timeline();
  $("#cosmos-ui").classList.toggle("is-list", toList);
  if (toList) {
    if (fade) tl.to(fade, { value: 0.15, duration: 0.7, ease: "power2.out" }, 0);
    tl.to(bodies, { mix: 1, duration: 0.9, ease: "power3.inOut", stagger: { each: 0.04, from: "center" } }, 0)
      .add(() => listEl.classList.add("is-on"), 0.5)
      .from(".list__row", { opacity: 0, x: -14, duration: 0.6, ease: "power3.out", stagger: 0.05 }, 0.55);
  } else {
    tl.to(".list__row", { opacity: 0, x: -8, duration: 0.35, ease: "power2.in", stagger: 0.02 }, 0)
      .add(() => { listEl.classList.remove("is-on"); gsap.set(".list__row", { clearProps: "all" }); }, 0.45)
      .to(bodies, { mix: 0, duration: 0.9, ease: "power3.inOut", stagger: { each: 0.04, from: "edges" } }, 0.3);
    if (fade) tl.to(fade, { value: 1, duration: 0.8, ease: "power2.out" }, 0.5);
  }
}
$$("button", toggle).forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

// ───────────────────────── flights + HUD ─────────────────────────

const hud = $("#hud"), toast = $("#toast");
let hudOpen = false, current = null, coreOpen = false, tourTimer = 0;
const pad2 = (n) => String(n).padStart(2, "0");

function showToast(msg, ms = 2600) {
  toast.textContent = msg; toast.classList.add("is-on");
  clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove("is-on"), ms);
}
function scramble(el, text, dur = 0.7) {
  const chars = "▚▞▟▙◢◣◤◥█▓▒░ABCDEFGHKLMNPRSTUVWXYZ0123456789";
  const o = { p: 0 };
  return gsap.to(o, { p: 1, duration: reduced ? 0 : dur, ease: "power2.out", onUpdate: () => {
    const n = Math.round(o.p * text.length);
    el.textContent = text.slice(0, n) + text.slice(n).split("").map((c) => (c === " " ? " " : chars[(Math.random() * chars.length) | 0])).join("");
  }, onComplete: () => (el.textContent = text) });
}
function typewrite(el, text, dur) {
  el.textContent = ""; const o = { n: 0 }; let lastN = 0;
  return gsap.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => { const n = Math.round(o.n); el.textContent = text.slice(0, n); if (n - lastN >= 3) { lastN = n; audio.type(); } } });
}
function select(p) {
  if (!system || system.isFlying()) return;
  current = p; coreOpen = false;
  closeHud(false);
  system.flyTo(p.id, () => openHud(p));
}
function selectSun() {
  if (!system || system.isFlying()) return;
  current = null; coreOpen = true;
  closeHud(false);
  system.flyToSun(() => openCore());
}
function fillHud({ idx, meta, title, tag, desc, mods, demo, links, range }) {
  $(".hud__idx", hud).textContent = idx;
  $(".hud__meta", hud).innerHTML = meta;
  $(".hud__tag", hud).textContent = tag;
  $(".hud__mods", hud).innerHTML = mods;
  $(".hud__demo .sf__in", hud).innerHTML = demo;
  $(".hud__links", hud).innerHTML = links;
  $(".hud__range", hud).textContent = range;
  hud.setAttribute("aria-hidden", "false"); hud.classList.add("is-on"); hudOpen = true;
  audio.arrive();
  const tl = gsap.timeline();
  tl.fromTo(hud, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: reduced ? 0 : 0.5, ease: "power3.out" }, 0)
    .fromTo($$(".hud__bar, .hud__meta, .hud__title, .hud__tag, .hud__mods, .hud__demo, .hud__links, .hud__nav", hud), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, stagger: 0.06, ease: "power2.out" }, 0.1)
    .add(() => scramble($(".hud__title", hud), title, 0.8), 0.15)
    .fromTo($$(".mod i", hud), { scaleX: 0 }, { scaleX: 1, duration: reduced ? 0 : 0.7, stagger: 0.08, ease: "power3.out", transformOrigin: "left" }, 0.4)
    .add(() => typewrite($(".hud__desc", hud), desc, reduced ? 0 : Math.min(2.4, desc.length / 85)), 0.35);
  $(".hud__close", hud).focus({ preventScroll: true });
}
function openHud(p) {
  const idx = projects.indexOf(p);
  fillHud({
    idx: `${pad2(idx + 1)} / ${pad2(projects.length)}`,
    meta: `<span>orbit ${pad2(idx + 1)}</span><span>class · ${p.context}</span><span>epoch · ${p.year ?? "—"}</span><span class="${p.live ? "on" : ""}">status · ${p.live ? "live" : p.status ?? "source only"}</span>`,
    title: p.title, tag: p.tagline, desc: p.description,
    mods: `<span class="hud__k">systems aboard</span>` + p.stack.map((s, i) => `<div class="mod"><span>${pad2(i + 1)}</span><b>${s}</b><i style="--w:${70 + ((i * 37) % 30)}%"></i></div>`).join(""),
    demo: p.live ? `<span class="hud__k">uplink</span><a href="${p.live}" target="_blank" rel="noopener">${p.live.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗</a>` : `<span class="hud__k">uplink</span><span class="u-dim">no public deployment · demo capture pending</span>`,
    links: `<a href="${p.github}" target="_blank" rel="noopener">source on github ↗</a>${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">open live ↗</a>` : ""}`,
    range: `range · ${(p.planet.size * 4.8).toFixed(1)} au`,
  });
}
function openCore() {
  audio.chord();
  fillHud({
    idx: "core",
    meta: `<span>class · g-type</span><span>epoch · 2001</span><span class="on">status · available for hire</span>`,
    title: person.name, tag: "the star this system orbits", desc: `${person.positioning} Every planet out there is something I shipped. Karachi, ${person.tzLabel}.`,
    mods: `<span class="hud__k">core systems</span>` + skills.map((g, i) => `<div class="mod"><span>${pad2(i + 1)}</span><b>${g.group} · ${g.items.join(", ")}</b><i style="--w:${82 + ((i * 11) % 18)}%"></i></div>`).join(""),
    demo: `<span class="hud__k">uplink</span><a href="mailto:${person.email}">${person.email}</a>`,
    links: `<a href="${person.cv}" target="_blank" rel="noopener">resume ↓</a><a href="${person.github}" target="_blank" rel="noopener">github ↗</a><a href="${person.linkedin}" target="_blank" rel="noopener">linkedin ↗</a>`,
    range: "you found the core",
  });
  $(".hud__title", hud).textContent = "";
}
function closeHud(flyBack = true) {
  if (hudOpen) {
    hudOpen = false; hud.setAttribute("aria-hidden", "true");
    gsap.to(hud, { opacity: 0, x: 16, duration: reduced ? 0 : 0.3, ease: "power2.in", onComplete: () => hud.classList.remove("is-on") });
  }
  if (flyBack && system && system.focusedId()) {
    system.unfocus(() => { current = null; coreOpen = false; });
  }
}
function step(dir) {
  if (!system || system.isFlying()) return;
  const idx = current ? projects.indexOf(current) : -1;
  const nxt = projects[(idx + dir + projects.length) % projects.length];
  current = nxt; coreOpen = false;
  closeHud(false);
  system.flyTo(nxt.id, () => openHud(nxt));
}
$(".hud__close", hud).addEventListener("click", () => closeHud(true));
$(".hud__next", hud).addEventListener("click", () => step(1));
$(".hud__prev", hud).addEventListener("click", () => step(-1));

// tour easter egg: visit every planet
function tour() {
  if (!system || tourTimer) return;
  showToast("auto tour engaged · esc to abort", 3000);
  let i = -1;
  const hop = () => {
    i++;
    if (i >= projects.length) { tourTimer = 0; closeHud(true); showToast("tour complete"); return; }
    current = projects[i]; closeHud(false);
    system.flyTo(current.id, () => { openHud(current); tourTimer = setTimeout(hop, 4200); });
  };
  tourTimer = 1; hop();
}
function abortTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = 0; } }

// konami → hyperdrive
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let kIdx = 0;
addEventListener("keydown", (e) => {
  if (!entered || e.metaKey || e.ctrlKey || e.altKey || e.target.matches("input, textarea")) return;
  kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (kIdx === KONAMI.length) { kIdx = 0; system?.setHyper(true); showToast("hyperdrive engaged · orbital period ÷ 9", 4000); audio.chord(); setTimeout(() => system?.setHyper(false), 10_000); return; }
  if (e.key === "Escape") { abortTour(); if (system?.focusedId()) closeHud(true); }
  if (e.key === "ArrowRight" && (current || coreOpen)) step(1);
  if (e.key === "ArrowLeft" && (current || coreOpen)) step(-1);
  if (e.key === "l") setMode("list");
  if (e.key === "o" || e.key === "s") setMode("orbit");
  if (e.key === "t") tour();
});

// ───────────────────────── phosphor trail ─────────────────────────

function initTrail() {
  if (!finePointer || reduced) return;
  const c = $("#trail"), ctx = c.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
  size(); addEventListener("resize", size);
  const pts = [];
  addEventListener("pointermove", (e) => { pts.push({ x: e.clientX * dpr, y: e.clientY * dpr, t: performance.now() }); if (pts.length > 28) pts.shift(); });
  (function draw() {
    requestAnimationFrame(draw);
    ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(0, 0, c.width, c.height);
    const now = performance.now();
    while (pts.length && now - pts[0].t > 260) pts.shift();
    if (pts.length < 2) return;
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], age = 1 - (now - b.t) / 260, k = i / pts.length;
      ctx.strokeStyle = `rgba(${Math.round(255 * (1 - k))}, ${Math.round(43 + 186 * k)}, ${Math.round(214 + 41 * k)}, ${(0.55 * age).toFixed(3)})`;
      ctx.lineWidth = (0.6 + 1.6 * k * age) * dpr;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  })();
}

// ───────────────────────── text reveals ─────────────────────────

function heroReveal() {
  const h1 = $(".hero__h1");
  if (hasSplit && !reduced) {
    const split = SplitText.create(h1, { type: "chars,words", mask: "chars" });
    gsap.from(split.chars, { yPercent: 115, duration: 1.1, ease: "power4.out", stagger: { each: 0.035, from: "start" }, delay: 0.1 });
  } else gsap.from(h1, { opacity: 0, y: 20, duration: 0.9 });
  gsap.from(".hero__meta > *", { opacity: 0, y: 12, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.6 });
  gsap.from("#status", { opacity: 0, duration: 0.8, delay: 0.9 });
}
function scrollReveals() {
  $$("[data-reveal]").forEach((el) => gsap.from(el, { opacity: 0, y: 18, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }));
  $$("[data-split]").forEach((el) => {
    if (hasSplit && !reduced) SplitText.create(el, { type: "lines", mask: "lines", autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 0.9, ease: "power3.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 85%" } }) });
    else gsap.from(el, { opacity: 0, y: 14, duration: 0.8, scrollTrigger: { trigger: el, start: "top 85%" } });
  });
}

// ───────────────────────── experience — mission log ─────────────────────────

const ym = (s) => { const [y, m] = s.split("-").map(Number); return y * 12 + (m - 1); };
const nowYm = () => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); };
const fmt = (s) => s ? s.replace("-", ".") : "now";
const months = (x) => (x.end ? ym(x.end) : nowYm()) - ym(x.start) + 1;
const dur = (m) => (m >= 12 ? `${Math.floor(m / 12)}y ${m % 12 ? `${m % 12}m` : ""}`.trim() : `${m}m`);

function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function glyph(name) {
  // a constellation unique to each station, drawn from its name
  let h = hash(name); const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const n = 5 + Math.floor(rnd() * 3), pts = [];
  for (let i = 0; i < n; i++) pts.push([8 + rnd() * 84, 6 + rnd() * 36]);
  const lines = pts.slice(1).map((p, i) => `<line x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}"/>`).join("");
  const dots = pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 0 ? 2.2 : 1.3}"/>`).join("");
  return `<svg class="mission__glyph" viewBox="0 0 100 48" aria-hidden="true">${lines}${dots}</svg>`;
}
function renderXp() {
  const el = $("#xp");
  const total = experience.reduce((a, x) => a + months(x), 0);
  $("#xp-total").textContent = `${experience.length} stations · ${dur(total)} logged`;
  const maxM = Math.max(...experience.map(months));
  const y0 = ym(experience[experience.length - 1].start) - 1, y1 = nowYm() + 1, span = y1 - y0;
  const pct = (m) => ((m - y0) / span) * 100;
  const years = []; for (let y = Math.ceil(y0 / 12); y * 12 <= y1; y++) years.push(y);
  el.innerHTML = `
    <div class="ribbon sf sf--thin"><div class="sf__in">
      <div class="ribbon__scale">${years.map((y) => `<span style="left:${pct(y * 12).toFixed(2)}%">${y}</span>`).join("")}</div>
      <div class="ribbon__bars">${experience.map((x, i) => `<i class="ribbon__bar" data-i="${i}" style="left:${pct(ym(x.start)).toFixed(2)}%; width:${(pct((x.end ? ym(x.end) : nowYm()) + 1) - pct(ym(x.start))).toFixed(2)}%; --row:${i % 3}"><b>${x.company}</b></i>`).join("")}</div>
      <i class="ribbon__ship" aria-hidden="true"></i>
      <div class="ribbon__now"><span class="hud__k">mission clock</span><b class="ribbon__clock">T+ --y --m --d --:--:--</b></div>
    </div></div>
    <div class="log">
      <div class="log__path" aria-hidden="true">
        <i class="log__line"></i><i class="log__prog"></i><i class="log__ship"></i>
        ${experience.map((x, i) => `<b class="log__node" style="--i:${i}"><span>${x.start.slice(0, 4)}</span></b>`).join("")}
      </div>
      <ol class="log__list">${experience.map((x, i) => `
        <li class="mission sf sf--thin" data-i="${i}"><div class="sf__in">
          <i class="mission__sweep" aria-hidden="true"></i>
          ${glyph(x.company)}
          <div class="mission__top">
            <span class="mission__id">mission ${pad2(experience.length - i)}</span>
            <span class="mission__when">${fmt(x.start)} → ${fmt(x.end)}</span>
            <span class="mission__st ${x.end ? "" : "on"}">${x.end ? "complete" : "active"}</span>
          </div>
          <h3 class="mission__co" data-text="${x.company}">${x.company}</h3>
          <span class="mission__role">${x.title}</span>
          <div class="mission__tele"><span>duration · <b>${dur(months(x))}</b></span><span>systems · <b>${pad2(x.stack.length)}</b></span><span>orbit · <b>${x.start.slice(0, 4)}</b></span></div>
          <div class="mission__dur"><i style="--w:${Math.round((months(x) / maxM) * 100)}%"></i></div>
          <p class="mission__note">${x.note}</p>
          <ul class="mission__sys">${x.stack.map((s) => `<li class="sf sf--chip"><span class="sf__in">${s}</span></li>`).join("")}</ul>
        </div></li>`).join("")}</ol>
    </div>`;
  const log = $(".log", el), nodes = $$(".log__node", el), prog = $(".log__prog", el), ship = $(".log__ship", el), cards = $$(".mission", el), rship = $(".ribbon__ship", el), bars = $$(".ribbon__bar", el);
  const alignNodes = () => { const top = log.getBoundingClientRect().top; cards.forEach((c, i) => { nodes[i].style.top = `${c.getBoundingClientRect().top - top + 22}px`; }); };
  alignNodes(); addEventListener("resize", alignNodes); document.fonts.ready.then(alignNodes);
  ST.create({ trigger: log, start: "top 70%", end: "bottom 60%", scrub: true, onUpdate: (st) => {
    const p = st.progress;
    prog.style.transform = `scaleY(${p})`; ship.style.top = `${p * 100}%`;
    rship.style.left = `${(1 - p) * 100}%`;                                  // the ribbon runs old → new; the log runs new → old
    nodes.forEach((n, i) => n.classList.toggle("is-lit", i / Math.max(1, nodes.length - 1) <= p + 0.02));
  } });
  cards.forEach((card, i) => {
    ST.create({ trigger: card, start: "top 72%", once: true, onEnter: () => {
      card.classList.add("is-on"); audio.tick();
      scramble($(".mission__co", card), card.querySelector(".mission__co").dataset.text, 0.6);
      gsap.fromTo($(".mission__dur i", card), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.out", transformOrigin: "left" });
      gsap.from($$(".mission__sys li", card), { opacity: 0, y: 6, duration: 0.5, stagger: 0.05, ease: "power2.out", delay: 0.2 });
      gsap.fromTo($(".mission__sweep", card), { yPercent: -100, opacity: 0.9 }, { yPercent: 100, opacity: 0, duration: 1.1, ease: "power2.inOut" });
      bars[i]?.classList.add("is-on");
    } });
    gsap.from(card, { opacity: 0, y: 26, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 85%" } });
    const peer = (on) => { card.classList.toggle("is-peer", on); bars[i]?.classList.toggle("is-peer", on); };
    card.addEventListener("pointerenter", () => peer(true)); card.addEventListener("pointerleave", () => peer(false));
    bars[i]?.addEventListener("pointerenter", () => peer(true)); bars[i]?.addEventListener("pointerleave", () => peer(false));
  });
  // live mission clock for the active station
  const active = experience.find((x) => !x.end);
  if (active) {
    const clock = $(".ribbon__clock", el), t0 = new Date(active.start + "-01T09:00:00");
    const tick = () => {
      let ms = Date.now() - t0; const d = new Date(ms);
      const y = d.getUTCFullYear() - 1970, mo = d.getUTCMonth(), da = d.getUTCDate() - 1;
      clock.textContent = `T+ ${pad2(y)}y ${pad2(mo)}m ${pad2(da)}d ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
    };
    tick(); setInterval(tick, 1000);
  }
}

// ───────────────────────── the scroll-opened cosmos ─────────────────────────

function initCosmosScroll() {
  const frame = { ix: 50, iy: 50, c: 0 }; // percent insets + px chamfer
  const apply = () => cosmos.style.setProperty("--ix", `${frame.ix}%`), applyAll = () => { apply(); cosmos.style.setProperty("--iy", `${frame.iy}%`); cosmos.style.setProperty("--c", `${frame.c}px`); };
  applyAll();
  const dim = $("#dim");

  if (desktop && !reduced) {
    // approach: the window opens from nothing to a framed viewport as works arrives
    gsap.to(frame, { ix: 10, iy: 12, c: 34, ease: "none", onUpdate: applyAll, scrollTrigger: { trigger: "#works", start: "top bottom", end: "top top", scrub: 0.4 } });
    // pinned: the frame grows to the full viewport, then holds while you explore
    ST.create({ trigger: worksPin, start: "top top", end: "+=170%", pin: true, pinSpacing: true, anticipatePin: 1,
      onToggle: (st) => { system?.setActive(st.isActive); $("#cosmos-ui").classList.toggle("is-active", st.isActive); },
      onUpdate: (st) => {
        const k = Math.min(1, st.progress / 0.42);
        frame.ix = 10 * (1 - k); frame.iy = 12 * (1 - k); frame.c = 34 * (1 - k); applyAll();
        $(".works__head").style.opacity = String(1 - Math.min(1, Math.max(0, (st.progress - 0.75) / 0.2)));
      } });
  } else {
    frame.ix = 0; frame.iy = 0; frame.c = 0; applyAll();
    ST.create({ trigger: "#works", start: "top 60%", end: "bottom 40%", onToggle: (st) => { system?.setActive(st.isActive); $("#cosmos-ui").classList.toggle("is-active", st.isActive); } });
  }
  // the cosmos is alive from works onward; asleep behind the hero
  ST.create({ trigger: "#works", start: "top bottom", end: "max", onToggle: (st) => system?.setPaused(!st.isActive) });
  // dim behind the reading sections
  gsap.to(dim, { opacity: 0.58, ease: "none", scrollTrigger: { trigger: "#about", start: "top bottom", end: "top 40%", scrub: 0.5 } });
  // camera pose along the page
  [["#about", 0], ["#experience", 1], ["#contact", 2]].forEach(([sel, base]) => {
    ST.create({ trigger: sel, start: "top bottom", end: "top 20%", scrub: true, onUpdate: (st) => system?.setScroll(base + st.progress) });
  });
}

// ───────────────────────── page ─────────────────────────

function copyText(btn, text) { navigator.clipboard?.writeText(text).then(() => { btn.dataset.copied = "true"; setTimeout(() => delete btn.dataset.copied, 1400); }); }
function renderStatic() {
  $("#about-bio").innerHTML = `I build the whole thing — schema, Go services, Next.js clients, deploy. Security-first: a zero-knowledge cloud platform, a concurrent WebSocket system across web and mobile, and client products spanning e-commerce, POS, HRMS and real estate.`;
  $("#skills").innerHTML = skills.map((g) => `<div class="skills__g"><span class="u-label">${g.group}</span><ul>${g.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`).join("");
  $$("[data-email]").forEach((el) => (el.textContent = person.email));
  $$("[data-copy-email]").forEach((el) => el.addEventListener("click", () => copyText(el, person.email)));
  $$("[data-href]").forEach((a) => (a.href = person[a.dataset.href]));
  renderList(); renderXp();
}
let pageInit = false;
function initPage() {
  if (pageInit) return; pageInit = true;
  renderLive();
  system = createSystem({ canvas: $("#orbit-canvas"), labelsEl: $("#orbit-labels"), projects, onSelect: select, onSunSelect: selectSun, reducedMotion: reduced,
    // sound follows the flight: the whoosh is 2.6 s long, so it is re-timed to the actual flight duration
    onFlightEvent: (name, info) => {
      if (name === "launch") audio.warp(2.6 / (info?.dur || 2.6));
      if (name === "launchBack") audio.retro(2.6 / (info?.dur || 2.6));
      if (name === "belt") audio.beltHit();
    },
    onBeltLevel: (k) => audio.setLevel("belt", k) });
  system.setPaused(true);
  const saved = params.get("mode") || localStorage.getItem("v3-mode") || (finePointer ? "orbit" : "list");
  setMode(saved === "list" ? "list" : "orbit", true);
  document.fonts.ready.then(() => { scrollReveals(); initCosmosScroll(); ST.refresh(); });
  const links = $$(".hdr__nav a");
  const secObs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#${e.target.id}`))); }), { rootMargin: "-40% 0px -55% 0px" });
  $$("main section[id]").forEach((s) => secObs.observe(s));
  initTrail();
  console.log("%c wosmo ", "background:#0a0a0a;color:#00e5ff;font:12px/1.6 ui-monospace,monospace;border:1px solid #00e5ff;padding:4px 8px",
    "\n\nyou read source. good.\n  t        auto tour of the system\n  ← →      hop between planets\n  the sun  is clickable\n  ↑↑↓↓←→←→ba   you know what that does\n");
}
renderStatic();
