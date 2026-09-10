// Flight deck host: boot → cockpit. No page, no scroll. Wheel = throttle, drag = look, keys = ship commands.

import { person, projects, experience, skills, repoIndex, LANG_COLORS } from "../data.js";
import { createSystem } from "./scene.js";
import { createAudio } from "../audio.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const params = new URLSearchParams(location.search);
const WS_URL = params.get("ws") || "wss://echo.websocket.org";
const gsap = window.gsap;
const pad2 = (n) => String(n).padStart(2, "0");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const audio = createAudio({ muted: localStorage.getItem("v3-muted") === "1", base: "../assets/audio/" });
const ORBIT_AU = [17, 25, 34, 45, 58, 73, 90, 110];

// ── uplink ─────────────────────────────────────────────
const live = { on: false, rtt: null };
function connect(log) {
  return new Promise((resolve) => {
    const t0 = performance.now(); let settled = false; const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    log(`> uplink ${WS_URL}`);
    let ws; try { ws = new WebSocket(WS_URL); } catch { log("x invalid url", "bad"); return done(false); }
    const to = setTimeout(() => { log("x no answer · static mode", "bad"); try { ws.close(); } catch {} done(false); }, 4000);
    ws.addEventListener("open", () => { log(`> open ${Math.round(performance.now() - t0)}ms`, "ok"); ws.send(`ping:${performance.now()}`); });
    ws.addEventListener("message", (e) => { const m = String(e.data); if (!m.startsWith("ping:")) return; const rtt = Math.round(performance.now() - Number(m.slice(5)));
      if (!settled) { clearTimeout(to); log(`> rtt ${rtt}ms`, "ok"); live.on = true; live.rtt = rtt; setInterval(() => { if (ws.readyState === 1) ws.send(`ping:${performance.now()}`); }, 4000); done(true); } else live.rtt = rtt; renderTele(); });
    ws.addEventListener("error", () => { clearTimeout(to); log("x unreachable · static mode", "bad"); done(false); });
    ws.addEventListener("close", () => { live.on = false; renderTele(); });
  });
}

// ── boot ───────────────────────────────────────────────
const bootLog = $("#boot-log");
const log = (line, cls) => { const s = document.createElement("span"); s.textContent = line + "\n"; if (cls) s.className = cls; bootLog.appendChild(s); };
let started = false;
async function start() {
  if (started) return; started = true;
  audio.resume(); audio.click(); audio.startAmbient(); audio.startLoop("belt");
  $("#start").disabled = true;
  const lines = ["> WSF-01 flight deck", "> loading system … 8 bodies, 1 star, 1 belt", "> pilot · wasif malik · software engineer", "> go · systems · next.js"];
  for (const l of lines) { log(l); await new Promise((r) => setTimeout(r, reduced ? 0 : 160)); audio.tick(); }
  connect(log);
  await new Promise((r) => setTimeout(r, reduced ? 0 : 500));
  gsap.to("#boot", { opacity: 0, duration: 0.7, ease: "power2.inOut", onComplete: () => ($("#boot").style.display = "none") });
  initDeck();
  // deep link from the reading site: ship/?to=<project id> jumps there once the deck is up
  const to = projects.find((p) => p.id === params.get("to"));
  if (to) setTimeout(() => select(to), reduced ? 100 : 1400);
}
$("#start").addEventListener("click", start);
addEventListener("keydown", (e) => { if (!started && (e.key === "Enter" || e.key === " ")) start(); });
if (params.get("to")) {
  // arrived via "fly there": skip the press-start wait; the audio context resumes on the first gesture
  $(".boot__btn .sf__in").textContent = "launching …";
  addEventListener("pointerdown", () => audio.resume(), { once: true });
  setTimeout(start, reduced ? 0 : 600);
}
$$("[data-door]").forEach((a) => a.addEventListener("click", () => { try { localStorage.setItem("v3-door", a.dataset.door); } catch {} }));

// ── deck state ─────────────────────────────────────────
let system = null, current = null, coreOpen = false, tourTimer = 0, throttle = 0, panelOpen = null;
let energy = 1, hyperOn = false, beltNear = 0, rangeKm = false, clockLocal = false, lastPing = 0;
const deck = $("#deck"), hud = $("#hud"), panel = $("#panel"), toast = $("#toast");
const data = { lastPush: null };
const blackBox = JSON.parse(sessionStorage.getItem("wsf-blackbox") || "[]");
const fps = { frames: 0, last: performance.now(), value: 0 };

function showToast(msg, ms = 2600) { toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove("is-on"), ms); }
function scramble(el, text, dur = 0.7) {
  const chars = "▚▞▟▙◢◣◤◥█▓▒░ABCDEFGHKLMNPRSTUVWXYZ0123456789"; const o = { p: 0 };
  return gsap.to(o, { p: 1, duration: reduced ? 0 : dur, ease: "power2.out", onUpdate: () => { const n = Math.round(o.p * text.length); el.textContent = text.slice(0, n) + text.slice(n).split("").map((c) => (c === " " ? " " : chars[(Math.random() * chars.length) | 0])).join(""); }, onComplete: () => (el.textContent = text) });
}
function typewrite(el, text, dur) {
  el.textContent = ""; const o = { n: 0 }; let last = 0;
  return gsap.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => { const n = Math.round(o.n); el.textContent = text.slice(0, n); if (n - last >= 3) { last = n; audio.type(); } } });
}
function lamp(id, state) { const el = $(`#lamp-${id}`); el.classList.remove("on", "warn", "bad"); if (state) el.classList.add(state); }

// ── targets ────────────────────────────────────────────
function renderTargets() {
  $("#tgt-count").textContent = pad2(projects.length);
  $("#targets").innerHTML = projects.map((p, i) => `<li><button class="tgt" type="button" data-id="${p.id}"><span class="tgt__n">${pad2(i + 1)}</span><span class="tgt__name">${p.title}</span></button></li>`).join("");
  $$(".tgt[data-id]").forEach((b) => b.addEventListener("click", () => select(projects.find((p) => p.id === b.dataset.id))));
  $(".tgt--sun").addEventListener("click", selectSun);
}
function markCurrent() { $$(".tgt").forEach((b) => b.classList.toggle("is-cur", (current && b.dataset.id === current.id) || (coreOpen && b.hasAttribute("data-sun")))); }

// ── telemetry ──────────────────────────────────────────
function renderTele() {
  if (!system) return;
  const h = system.heading();
  $("#tl-state").textContent = h.flying ? "in flight" : current ? `holding · ${current.title.toLowerCase()}` : coreOpen ? "holding · core" : "orbiting";
  const link = $("#tl-link"); link.textContent = live.on ? `live · ${live.rtt}ms` : "static"; link.classList.toggle("on", live.on);
  $("#tl-push").textContent = data.lastPush ? `${data.lastPush.repo} · ${data.lastPush.rel}` : "…";
  $("#tl-clock").textContent = clockLocal ? new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " local" : new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: person.tz }) + " pkt";
  const tgt = current ? h.bodies.find((b) => b.id === current.id) : null;
  const au = tgt ? Math.hypot(h.pos.x - tgt.x, h.pos.z - tgt.z) : Math.hypot(h.pos.x, h.pos.z);
  const fmtR = (v) => rangeKm ? `${(v * 149.6).toFixed(0)} Mkm` : `${v.toFixed(1)} au`;
  $("#tl-range").textContent = tgt ? fmtR(au) : `${fmtR(au)} from core`;
  $("#tl-eta").textContent = h.flying ? `T−${Math.max(0, (1 - h.flightT) * h.flightDur).toFixed(1)} s` : "—";
  lamp("link", live.on ? "on" : "bad");
  lamp("belt", beltNear > 0.6 ? "warn" : beltNear > 0.15 ? "on" : "");
  lamp("lock", h.hot >= 0 || h.sunHot ? "on" : current || coreOpen ? "on" : "");
  lamp("hyper", hyperOn ? "warn" : "");
  lamp("fuel", energy < 0.2 ? "bad" : energy < 0.5 ? "warn" : "");
}
setInterval(renderTele, 250);
const relTime = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`; };
fetch("https://api.github.com/users/Wosmos/events/public?per_page=30").then((r) => (r.ok ? r.json() : [])).then((ev) => { const p = ev.find((e) => e.type === "PushEvent"); if (p) data.lastPush = { repo: p.repo.name.split("/")[1], rel: relTime(p.created_at) }; }).catch(() => {});
fetch("https://api.github.com/users/Wosmos/repos?per_page=100").then((r) => (r.ok ? r.json() : [])).then((repos) => { for (const r of repos) { const id = repoIndex[r.name.toLowerCase()]; const p = id && projects.find((x) => x.id === id); if (p && p.year == null) p.year = new Date(r.created_at).getFullYear(); } }).catch(() => {});

// ── radar ──────────────────────────────────────────────
function drawRadar() {
  const c = $("#radar"), g = c.getContext("2d"), W = c.width, H = c.height, cx = W / 2, cy = H / 2;
  g.clearRect(0, 0, W, H);
  if (!system) return;
  const h = system.heading(), scale = (W / 2 - 12) / 118;
  g.strokeStyle = "rgba(0,229,255,.16)"; g.lineWidth = 1;
  for (const b of h.bodies) { g.beginPath(); g.arc(cx, cy, b.r * scale, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = "#ffc978"; g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI * 2); g.fill();
  for (const b of h.bodies) { const on = current && b.id === current.id; g.fillStyle = on ? "#00e5ff" : "rgba(242,245,255,.8)"; g.beginPath(); g.arc(cx + b.x * scale, cy + b.z * scale, on ? 3 : 1.8, 0, Math.PI * 2); g.fill(); }
  const sx = clamp(cx + h.pos.x * scale, 6, W - 6), sz = clamp(cy + h.pos.z * scale, 6, H - 6), ang = Math.atan2(-h.pos.z, -h.pos.x);
  g.save(); g.translate(sx, sz); g.rotate(ang); g.fillStyle = "#00e5ff"; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, 4); g.lineTo(-2, 0); g.lineTo(-4, -4); g.closePath(); g.fill(); g.restore();
  const a = (performance.now() / 2400) % (Math.PI * 2);
  if (g.createConicGradient) { const grad = g.createConicGradient(a, cx, cy); grad.addColorStop(0, "rgba(0,229,255,.22)"); grad.addColorStop(0.12, "rgba(0,229,255,0)"); grad.addColorStop(1, "rgba(0,229,255,0)"); g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2); g.fill(); }
}

$("#radar").addEventListener("click", (e) => {
  if (!system) return;
  const c = e.currentTarget, r = c.getBoundingClientRect(), W = c.width, scale = (W / 2 - 12) / 118;
  const mx = (e.clientX - r.left) * (W / r.width) - W / 2, mz = (e.clientY - r.top) * (W / r.height) - W / 2;
  const h = system.heading();
  let best = null, bd = 12;
  for (const b of h.bodies) { const d = Math.hypot(b.x * scale - mx, b.z * scale - mz); if (d < bd) { bd = d; best = b; } }
  if (Math.hypot(mx, mz) < 8) return selectSun();
  if (best) return select(projects.find((p) => p.id === best.id));
  system.setHeading(Math.atan2(mx, mz)); showToast(`heading ${String(Math.round((((Math.atan2(mx, mz) * 180 / Math.PI) % 360) + 360) % 360)).padStart(3, "0")}°`, 1200); audio.tick();
});

// ── main instrument: horizon ball · heading tape · throttle · energy · velocity ──
function drawDash() {
  const c = $("#dash"); if (!c || !system) return;
  const g = c.getContext("2d"), W = c.width, H = c.height, h = system.heading();
  g.clearRect(0, 0, W, H);
  g.font = "10px JetBrains Mono, monospace"; g.textBaseline = "top";

  // heading tape (top band)
  const deg = ((h.theta * 180 / Math.PI) % 360 + 360) % 360, pxPerDeg = 3.6, cx = W * 0.5;
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
  g.fillStyle = h.flying ? "#00e5ff" : "rgba(242,245,255,.8)"; g.font = "700 22px JetBrains Mono, monospace"; g.fillText(vel.toFixed(1), cx, H * 0.55);
  g.font = "10px JetBrains Mono, monospace"; g.fillStyle = "rgba(242,245,255,.45)";
  g.fillText(h.flying ? `ETA ${Math.max(0, (1 - h.flightT) * h.flightDur).toFixed(1)}s` : (current ? "holding" : coreOpen ? "at core" : "orbit"), cx, H * 0.78);

  // throttle + energy (right of lower band): two vertical gauges
  const gx = W * 0.74, gy = H * 0.44, gh = H * 0.46, gw = 10;
  const drawGauge = (x, v, col, label, detents) => {
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
function drawLock() {
  const el = $("#lock"); if (!system) return;
  const h = system.heading();
  const idx = h.hot >= 0 ? h.hot : current ? projects.indexOf(current) : -1;
  if (idx < 0 || h.flying) { el.classList.remove("is-on"); return; }
  const b = h.bodies[idx], p = system.project({ x: b.x, y: b.y, z: b.z });
  if (p.z > 1) { el.classList.remove("is-on"); return; }
  const dist = Math.hypot(h.pos.x - b.x, h.pos.y - b.y, h.pos.z - b.z);
  const px = clamp((b.size * 900) / (2 * Math.tan(21 * Math.PI / 180) * dist) * 2.6, 44, 220);
  el.style.width = el.style.height = `${px}px`; el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
  $(".lock__t", el).textContent = `${projects[idx].title} · ${dist.toFixed(1)} au`;
  el.classList.add("is-on");
}

// ── cutaway callouts: one leader per layer, anchored on the cut face, labels stacked on the right
const coSvg = $("#callouts"), coLabels = $("#callout-labels");
const LANG_DESC = { TypeScript: "app + api logic", JavaScript: "scripts, glue", Go: "services, concurrency", Rust: "native core", Python: "pipelines, tooling", Shell: "installers, ci", PowerShell: "windows installer", HTML: "docs site", CSS: "styling", Ruby: "homebrew formula", SQL: "schema, queries", Nix: "dev env", Other: "config, misc", crust: "surface · the product" };
let coNodes = [];
function drawCallouts() {
  if (!system || !current) { if (coNodes.length) { coSvg.innerHTML = ""; coLabels.innerHTML = ""; coNodes = []; } return; }
  const anchors = system.layerAnchors(current.id);
  if (!anchors.length) { if (coNodes.length) { coSvg.innerHTML = ""; coLabels.innerHTML = ""; coNodes = []; } return; }
  if (coNodes.length !== anchors.length) {
    coSvg.innerHTML = ""; coLabels.innerHTML = ""; coNodes = anchors.map((a) => {
      const col = "#" + a.color.toString(16).padStart(6, "0");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("stroke", col); path.setAttribute("stroke-opacity", ".85");
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("class", "dot"); dot.setAttribute("r", "2.6"); dot.setAttribute("fill", "#050508"); dot.setAttribute("stroke", col);
      const dot2 = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot2.setAttribute("r", "1.2"); dot2.setAttribute("fill", col);
      coSvg.append(path, dot, dot2);
      const lab = document.createElement("div"); lab.className = "co"; lab.style.setProperty("--c", col);
      lab.innerHTML = `<span class="co__row"><b>${a.name}</b><em>${a.pct.toFixed(1)}<i>%</i></em></span><small>${LANG_DESC[a.name] || ""}</small>`;
      lab.style.pointerEvents = "auto";
      const k = coLabels.childElementCount;
      lab.addEventListener("pointerenter", () => { system?.highlightLayer(current?.id, k); lab.classList.add("is-hi"); audio.tick(); });
      lab.addEventListener("pointerleave", () => { system?.highlightLayer(current?.id, -1); lab.classList.remove("is-hi"); });
      coLabels.appendChild(lab); return { path, dot, dot2, lab };
    });
  }
  // stack labels on the right of the planet, ordered top→bottom by anchor y, min 22 px apart
  const W = innerWidth, H = innerHeight;
  // labels live LEFT of the planet (the readout owns the right); shelf runs leftward
  const minX = Math.min(...anchors.map((a) => a.x)); const colX = Math.max(W * 0.05, Math.min(minX - 110, W * 0.3));
  const order = anchors.map((a, i) => ({ a, i })).sort((p, q) => p.a.y - q.a.y);
  let lastY = -Infinity; const ys = new Array(anchors.length);
  const cardH = coNodes[0]?.lab.offsetHeight || 52, STEP = cardH + 16;   // measured card height + gap
  for (const { a, i } of order) { let y = a.y; if (y < lastY + STEP) y = lastY + STEP; ys[i] = y; lastY = y; }
  // centre the stack around the anchors' mean
  const mean = anchors.reduce((s, a) => s + a.y, 0) / anchors.length, meanY = ys.reduce((s, y) => s + y, 0) / ys.length, shift = mean - meanY;
  anchors.forEach((a, i) => {
    const n = coNodes[i], y = ys[i] + shift, on = a.z < 1 && a.amount > 0.35;
    const midX = colX + 26, ex = colX;
    n.path.setAttribute("d", `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${midX.toFixed(1)},${y.toFixed(1)} L${ex.toFixed(1)},${y.toFixed(1)}`);
    n.path.setAttribute("stroke-dasharray", on ? "none" : "0 9999"); n.path.setAttribute("stroke-width", n.lab.classList.contains("is-hi") ? "2" : "1.1");
    n.dot.setAttribute("cx", a.x.toFixed(1)); n.dot.setAttribute("cy", a.y.toFixed(1)); n.dot2.setAttribute("cx", a.x.toFixed(1)); n.dot2.setAttribute("cy", a.y.toFixed(1));
    n.dot.style.opacity = n.dot2.style.opacity = on ? "1" : "0";
    n.lab.style.left = ""; n.lab.style.right = `${W - ex + 6}px`; n.lab.style.top = `${y}px`; n.lab.classList.toggle("is-on", on);
  });
}

// ── energy model: jumps cost, the sun recharges ──
function tickEnergy(dt) {
  if (!system) return;
  const h = system.heading(), r = Math.hypot(h.pos.x, h.pos.z);
  if (!h.flying) energy = clamp(energy + dt * (r < 40 ? 0.08 : 0.012), 0, 1);
}

// ── flights + readout ──────────────────────────────────
function select(p) {
  if (!system || system.isFlying()) return;
  if (energy < 0.08) { showToast("energy low · drift toward the sun to recharge", 3000); audio.tick(); return; }
  current = p; coreOpen = false; closePanel(); closeHud(false); markCurrent(); deck.classList.add("is-flying");
  system.flyTo(p.id, () => { deck.classList.remove("is-flying"); openHud(p); });
}
function selectSun() {
  if (!system || system.isFlying()) return;
  current = null; coreOpen = true; closePanel(); closeHud(false); markCurrent(); deck.classList.add("is-flying");
  system.flyToSun(() => { deck.classList.remove("is-flying"); openCore(); });
}
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function compositionHtml(p) {
  const langs = (p.langs || []).slice().sort((a, b) => b[1] - a[1]); if (!langs.length) return "";
  const total = langs.reduce((a, l) => a + l[1], 0);
  return `<span class="hud__k">composition · github languages · layers by volume share</span>
    <div class="comp__bar">${langs.map(([n, v]) => `<i style="flex-basis:${(v / total * 100).toFixed(2)}%;background:${hex(LANG_COLORS[n] ?? LANG_COLORS.Other)}"></i>`).join("")}</div>
    <div class="comp__legend">${langs.map(([n, v], k) => `<span data-layer="${k}" style="--c:${hex(LANG_COLORS[n] ?? LANG_COLORS.Other)}" class="${v < 1 ? "is-dim" : ""}"><b>${n}</b>${v.toFixed(1)}%</span>`).join("")}</div>`;
}
function fillHud({ idx, meta, title, tag, desc, mods, demo, links, range, comp }) {
  $(".hud__idx", hud).textContent = idx; $(".hud__meta", hud).innerHTML = meta; $(".hud__tag", hud).textContent = tag; $(".hud__mods", hud).innerHTML = mods;
  $(".hud__demo .sf__in", hud).innerHTML = demo; $(".hud__links", hud).innerHTML = links; $(".hud__range", hud).textContent = range;
  $(".hud__comp", hud).innerHTML = comp || ""; $(".hud__cut", hud).hidden = !comp; $(".hud__cut", hud).classList.remove("is-on");
  $$(".comp__legend [data-layer]", hud).forEach((el) => { el.addEventListener("pointerenter", () => system?.highlightLayer(current?.id, +el.dataset.layer)); el.addEventListener("pointerleave", () => system?.highlightLayer(current?.id, -1)); });
  hud.setAttribute("aria-hidden", "false"); hud.classList.add("is-on"); audio.arrive();
  gsap.timeline().fromTo(hud, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: reduced ? 0 : 0.5, ease: "power3.out" }, 0)
    .fromTo($$(".hud__bar, .hud__meta, .hud__title, .hud__tag, .hud__comp, .hud__mods, .hud__demo, .hud__links, .hud__nav", hud), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, stagger: 0.06, ease: "power2.out" }, 0.1)
    .add(() => scramble($(".hud__title", hud), title, 0.8), 0.15)
    .fromTo($$(".mod i", hud), { scaleX: 0 }, { scaleX: 1, duration: reduced ? 0 : 0.7, stagger: 0.08, ease: "power3.out", transformOrigin: "left" }, 0.4)
    .add(() => typewrite($(".hud__desc", hud), desc, reduced ? 0 : Math.min(2.4, desc.length / 85)), 0.35);
}
function openHud(p) {
  const i = projects.indexOf(p);
  fillHud({ idx: `${pad2(i + 1)} / ${pad2(projects.length)}`,
    meta: `<span>orbit ${pad2(i + 1)}</span><span>class · ${p.context}</span><span>epoch · ${p.year ?? "—"}</span><span class="${p.live ? "on" : ""}">status · ${p.live ? "live" : p.status ?? "source only"}</span>`,
    title: p.title, tag: p.tagline, desc: p.description,
    mods: `<span class="hud__k">systems aboard</span>` + p.stack.map((s, k) => `<div class="mod"><span>${pad2(k + 1)}</span><b>${s}</b><i style="--w:${70 + ((k * 37) % 30)}%"></i></div>`).join(""),
    demo: p.live ? `<span class="hud__k">uplink</span><a href="${p.live}" target="_blank" rel="noopener">${p.live.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗</a>` : `<span class="hud__k">uplink</span><span style="color:var(--fg-3)">no public deployment · demo capture pending</span>`,
    links: `<a href="${p.github}" target="_blank" rel="noopener">source on github ↗</a>${p.live ? `<a href="${p.live}" target="_blank" rel="noopener">open live ↗</a>` : ""}`,
    range: `orbit radius · ${ORBIT_AU[i]} au`, comp: compositionHtml(p) });
}
function openCore() {
  audio.chord();
  fillHud({ idx: "core", meta: `<span>class · g-type</span><span class="on">status · available for hire</span><span>${person.location}</span>`,
    title: person.name, tag: "the star this system orbits", desc: `${person.positioning} Every planet out here is something I shipped.`,
    mods: `<span class="hud__k">core systems</span>` + skills.map((g, k) => `<div class="mod"><span>${pad2(k + 1)}</span><b>${g.group} · ${g.items.join(", ")}</b><i style="--w:${82 + ((k * 11) % 18)}%"></i></div>`).join(""),
    demo: `<span class="hud__k">uplink</span><a href="mailto:${person.email}">${person.email}</a>`,
    links: `<a href="${person.cv}" target="_blank" rel="noopener">resume ↓</a><a href="${person.github}" target="_blank" rel="noopener">github ↗</a><a href="${person.linkedin}" target="_blank" rel="noopener">linkedin ↗</a>`,
    range: "you found the core" });
  $(".hud__title", hud).textContent = "";
}
function closeHud(flyBack = true) {
  if (hud.classList.contains("is-on")) { hud.setAttribute("aria-hidden", "true"); gsap.to(hud, { opacity: 0, x: 16, duration: reduced ? 0 : 0.3, ease: "power2.in", onComplete: () => hud.classList.remove("is-on") }); }
  if (flyBack && system?.focusedId()) { deck.classList.add("is-flying"); system.unfocus(() => { deck.classList.remove("is-flying"); current = null; coreOpen = false; markCurrent(); }); }
}
function step(dir) {
  if (!system || system.isFlying()) return;
  const i = current ? projects.indexOf(current) : -1;
  select(projects[(i + dir + projects.length) % projects.length]);
}
function toggleCutaway() {
  if (!system || !current || system.isFlying()) return;
  const on = !system.cutawayOpen(current.id);
  system.cutaway(current.id, on);
  $(".hud__cut", hud).classList.toggle("is-on", on);
  showToast(on ? `cutaway · ${current.title} · ${(current.langs || []).length} layers · drag to inspect` : "cutaway closed", 1800); if (on) audio.chord(); else audio.click();
}
$(".hud__cut", hud).addEventListener("click", toggleCutaway);
$(".hud__close", hud).addEventListener("click", () => closeHud(true));
$(".hud__next", hud).addEventListener("click", () => step(1));
$(".hud__prev", hud).addEventListener("click", () => step(-1));

// ── panels: pilot · log · comms · diagnostics · black box · next mission ──
const ym = (s) => { const [y, m] = s.split("-").map(Number); return y * 12 + (m - 1); };
const nowYm = () => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); };
const months = (x) => (x.end ? ym(x.end) : nowYm()) - ym(x.start) + 1;
const dur = (m) => (m >= 12 ? `${Math.floor(m / 12)}y ${m % 12 ? `${m % 12}m` : ""}`.trim() : `${m}m`);
const fmt = (s) => (s ? s.replace("-", ".") : "now");
function gpuName() { try { const c = document.createElement("canvas"), gl = c.getContext("webgl"), ext = gl.getExtension("WEBGL_debug_renderer_info"); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a"; } catch { return "n/a"; } }
const PANELS = {
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
  diag: () => { const h = system.heading(); const mem = performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : "n/a"; return `<div class="diag">
      <div><span>renderer</span><b>${gpuName()}</b></div><div><span>frame rate</span><b>${fps.value} fps</b></div><div><span>viewport</span><b>${innerWidth}×${innerHeight} @${devicePixelRatio}x</b></div><div><span>js heap</span><b>${mem}</b></div>
      <div><span>uplink rtt</span><b>${live.on ? live.rtt + " ms" : "static"}</b></div><div><span>position</span><b>${h.pos.x.toFixed(1)}, ${h.pos.y.toFixed(1)}, ${h.pos.z.toFixed(1)}</b></div><div><span>heading</span><b>${(((h.theta * 180 / Math.PI) % 360 + 360) % 360).toFixed(0)}°</b></div><div><span>energy</span><b>${Math.round(energy * 100)} %</b></div>
      <div><span>sounds loaded</span><b>${audio.loaded.length} / 11</b></div><div><span>flights logged</span><b>${blackBox.length}</b></div><div><span>build</span><b>prototype · v3 ship</b></div><div><span>engine</span><b>three.js r185 · gsap 3.13</b></div></div>`; },
  bbox: () => blackBox.length ? `<div class="bbox">${blackBox.slice().reverse().map((f) => `<div><span>${f.at}</span><span>${f.from} → ${f.to}</span><span>${f.dur}s</span></div>`).join("")}</div>` : `<p style="color:var(--fg-3)">no flights recorded this session.</p>`,
  next: () => `<div class="comms"><span class="hud__k">orbit 09 · under construction</span><p class="pilot__bio">This site. A v3 rewrite of wosmos.vercel.app in Next 16 + React Three Fiber — the solar system you're flying through, the flight deck you're sitting in, the real WebSocket presence layer the door promises. You're looking at the prototype.</p>
      <div class="comms__links"><a href="https://github.com/Wosmos/portfolio-website" target="_blank" rel="noopener">github · portfolio-website ↗</a></div></div>`,
};
const PANEL_TITLES = { pilot: "pilot", log: "mission log", comms: "comms", diag: "diagnostics", bbox: "black box", next: "next mission" };
function openPanel(name) {
  if (panelOpen === name) return closePanel();
  panelOpen = name; $("#panel-title").textContent = PANEL_TITLES[name]; $("#panel-body").innerHTML = PANELS[name]();
  $$(".key[data-panel]").forEach((k) => k.classList.toggle("is-on", k.dataset.panel === name));
  panel.setAttribute("aria-hidden", "false"); panel.classList.add("is-on"); audio.arrive();
  gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.45, ease: "power3.out" });
  const items = $$("#panel-body > * > *"); if (items.length) gsap.from(items, { opacity: 0, y: 8, duration: reduced ? 0 : 0.5, stagger: 0.05, ease: "power2.out", delay: 0.1 });
  $("[data-copy]", panel)?.addEventListener("click", (e) => navigator.clipboard?.writeText(person.email).then(() => { e.target.dataset.copied = "true"; setTimeout(() => delete e.target.dataset.copied, 1400); }));
}
function closePanel() {
  if (!panelOpen) return; panelOpen = null; $$(".key[data-panel]").forEach((k) => k.classList.remove("is-on"));
  panel.setAttribute("aria-hidden", "true"); gsap.to(panel, { opacity: 0, y: 10, duration: reduced ? 0 : 0.25, ease: "power2.in", onComplete: () => panel.classList.remove("is-on") });
}
$$(".key[data-panel]").forEach((k) => k.addEventListener("click", () => openPanel(k.dataset.panel)));
$(".panel__close").addEventListener("click", closePanel);
$("[data-tour]").addEventListener("click", () => tour());

// ── tour ───────────────────────────────────────────────
function tour() {
  if (!system || tourTimer) return abortTour();
  showToast("auto tour engaged · esc to abort", 3000); let i = -1;
  const hop = () => { i++; if (i >= projects.length) { tourTimer = 0; closeHud(true); showToast("tour complete"); return; } current = projects[i]; coreOpen = false; markCurrent(); closeHud(false); deck.classList.add("is-flying"); system.flyTo(current.id, () => { deck.classList.remove("is-flying"); openHud(current); tourTimer = setTimeout(hop, 4200); }); };
  tourTimer = 1; hop();
}
function abortTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = 0; showToast("tour aborted"); } }

// ── command line ───────────────────────────────────────
const cmd = $("#cmd"), cmdIn = $("#cmd-in"), cmdOut = $("#cmd-out");
const COMMANDS = {
  help: () => "jump <name|n> · cutaway · status · whoami · tour · scan · log · diag · bbox · next · sun · home · clear · exit",
  status: () => { const h = system.heading(); return `state ${h.flying ? "in flight" : "orbiting"} · pos ${h.pos.x.toFixed(1)},${h.pos.z.toFixed(1)} · hdg ${(((h.theta * 180 / Math.PI) % 360 + 360) % 360).toFixed(0)}° · energy ${Math.round(energy * 100)}% · uplink ${live.on ? live.rtt + "ms" : "static"}`; },
  whoami: () => `${person.name} · ${person.role} · ${person.line} · ${person.location}`,
  scan: () => projects.map((p, i) => `${pad2(i + 1)}  ${p.title.padEnd(12)} ${ORBIT_AU[i].toString().padStart(3)} au  ${p.live ? "live" : "source"}`).join("\n"),
  jump: (arg) => { const p = /^\d+$/.test(arg) ? projects[Number(arg) - 1] : projects.find((x) => x.id === arg?.toLowerCase() || x.title.toLowerCase() === arg?.toLowerCase()); if (!p) return `no target "${arg}"`; hideCmd(); select(p); return `jumping to ${p.title}`; },
  tour: () => { hideCmd(); tour(); return "tour engaged"; },
  log: () => { hideCmd(); openPanel("log"); return ""; }, diag: () => { hideCmd(); openPanel("diag"); return ""; }, bbox: () => { hideCmd(); openPanel("bbox"); return ""; }, next: () => { hideCmd(); openPanel("next"); return ""; },
  sun: () => { hideCmd(); selectSun(); return "core"; }, home: () => { hideCmd(); closeHud(true); return "returning"; },
  clear: () => { cmdOut.textContent = ""; return ""; }, exit: () => { hideCmd(); return ""; },
  hyperdrive: () => { hyper(); return "engaged"; }, cutaway: () => { if (!current) return "hold at a planet first"; hideCmd(); toggleCutaway(); return "cutaway"; }, flare: () => { system.flare(); audio.chord(); return "flare"; },
};
function showCmd() { cmd.hidden = false; cmdIn.value = ""; cmdIn.focus(); }
function hideCmd() { cmd.hidden = true; cmdIn.blur(); }
cmd.addEventListener("submit", (e) => { e.preventDefault(); const [name, ...rest] = cmdIn.value.trim().split(/\s+/); if (!name) return; const fn = COMMANDS[name.toLowerCase()]; const out = fn ? fn(rest.join(" ")) : `unknown command "${name}" · try help`; if (out) cmdOut.textContent = `› ${cmdIn.value}\n${out}\n` + cmdOut.textContent.slice(0, 1200); cmdIn.value = ""; audio.tick(); });
$("[data-cmd]").addEventListener("click", showCmd);

// ── beacon ─────────────────────────────────────────────
const beacon = $("#beacon");
let beaconTimer = 0;
function scheduleBeacon() { beaconTimer = setTimeout(spawnBeacon, 40_000 + Math.random() * 60_000); }
function spawnBeacon() {
  beacon.hidden = false;
  const y = 120 + Math.random() * (innerHeight * 0.45);
  gsap.fromTo(beacon, { left: -40, top: y }, { left: innerWidth + 40, duration: 26, ease: "none", onComplete: () => { beacon.hidden = true; scheduleBeacon(); } });
}
beacon.addEventListener("click", () => { gsap.killTweensOf(beacon); beacon.hidden = true; audio.chord(); openPanel("next"); showToast("beacon recovered · orbit 09 decoded", 3200); scheduleBeacon(); });

// ── hyperdrive ─────────────────────────────────────────
function hyper() { if (hyperOn) return; hyperOn = true; system?.setHyper(true); showToast("hyperdrive · orbital period ÷ 9", 4000); audio.chord(); setTimeout(() => { system?.setHyper(false); hyperOn = false; }, 10_000); }

// ── sound toggle ───────────────────────────────────────
const snd = $("#snd");
const renderSnd = () => { snd.setAttribute("aria-pressed", String(!audio.muted)); snd.innerHTML = `<b>S</b> snd · ${audio.muted ? "off" : "on"}`; };
snd.addEventListener("click", () => { audio.setMuted(!audio.muted); localStorage.setItem("v3-muted", audio.muted ? "1" : "0"); renderSnd(); }); renderSnd();

// ── gyro (mobile tilt) ─────────────────────────────────
const gyroBtn = $("#gyro");
let gyroOn = false, base = null;
function onOrient(e) {
  if (e.gamma == null) return;
  if (!base) base = { g: e.gamma, b: e.beta };
  const dx = clamp((e.gamma - base.g) / 25, -1, 1), dy = clamp((e.beta - base.b) / 25, -1, 1);
  system?.setTilt(dx, -dy);
  document.documentElement.style.setProperty("--tx", `${(-dx * 10).toFixed(1)}px`);
  document.documentElement.style.setProperty("--ty", `${(dy * 6).toFixed(1)}px`);
}
async function enableGyro() {
  if (gyroOn) { removeEventListener("deviceorientation", onOrient); gyroOn = false; base = null; system?.setTilt(0, 0); gyroBtn.classList.remove("is-on"); return; }
  try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") return showToast("tilt permission denied"); } } catch {}
  addEventListener("deviceorientation", onOrient); gyroOn = true; gyroBtn.classList.add("is-on"); showToast("tilt engaged · move the phone");
}
if ("DeviceOrientationEvent" in window && !finePointer) { gyroBtn.hidden = false; gyroBtn.addEventListener("click", enableGyro); }
// desktop: a hint of the same parallax from the pointer
if (finePointer) addEventListener("pointermove", (e) => { const dx = (e.clientX / innerWidth - 0.5) * 2, dy = (e.clientY / innerHeight - 0.5) * 2; document.documentElement.style.setProperty("--tx", `${(-dx * 6).toFixed(1)}px`); document.documentElement.style.setProperty("--ty", `${(-dy * 4).toFixed(1)}px`); });

// ── instruments that do things ─────────────────────────
function reping() { if (performance.now() - lastPing < 3000) return showToast(live.on ? `uplink · ${live.rtt} ms` : "uplink · static", 1400); lastPing = performance.now(); showToast("re-pinging uplink…", 1400); connect(() => {}).then((ok) => showToast(ok ? `uplink · ${live.rtt} ms` : "uplink · no answer", 1600)); }
function recharge() { throttle = 1; system?.setThrottle(1); showToast("recharge · throttle to the core", 2000); }
function toBelt() { throttle = 0.42; system?.setThrottle(throttle); showToast("holding at the belt", 1600); }
$("#lamp-link").addEventListener("click", reping);
$("#lamp-belt").addEventListener("click", toBelt);
$("#lamp-lock").addEventListener("click", () => { const h = system?.heading(); if (!h) return; if (h.hot >= 0) return select(projects[h.hot]); if (h.sunHot) return selectSun(); if (current) return closeHud(true); showToast("hover a planet to lock", 1400); });
$("#lamp-hyper").addEventListener("click", () => hyper());
$("#lamp-fuel").addEventListener("click", recharge);
$$(".tele__row[data-act]").forEach((row) => row.addEventListener("click", () => {
  const act = row.dataset.act;
  if (act === "state") { if (system?.focusedId()) closeHud(true); else showToast("orbiting · nothing to disengage", 1400); }
  if (act === "range") { rangeKm = !rangeKm; renderTele(); }
  if (act === "uplink") reping();
  if (act === "push") window.open(data.lastPush ? `https://github.com/Wosmos/${data.lastPush.repo}` : person.github, "_blank", "noopener");
  if (act === "clock") { clockLocal = !clockLocal; renderTele(); }
}));
// dash canvas: drag the heading tape to turn, tap the horizon to level, drag the THR gauge, tap NRG to recharge
{
  const c = $("#dash"); let mode = null, lastX = 0;
  const pt = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
  const thrFromY = (y) => { const gy = c.height * 0.44, gh = c.height * 0.46; return clamp((1 - (y - gy) / gh) * 1.6 - 0.6, -0.6, 1); };
  c.addEventListener("pointerdown", (e) => {
    const { x, y } = pt(e), W = c.width, H = c.height;
    if (y < 40) { mode = "tape"; lastX = x; c.setPointerCapture(e.pointerId); }
    else if (Math.hypot(x - W * 0.27, y - H * 0.66) < 44) { system?.level(); showToast("attitude levelled", 1200); audio.tick(); }
    else if (x > W * 0.74 - 8 && x < W * 0.74 + 18 && y > H * 0.4) { mode = "thr"; throttle = thrFromY(y); system?.setThrottle(throttle); c.setPointerCapture(e.pointerId); }
    else if (x > W * 0.74 + 38 && x < W * 0.74 + 64 && y > H * 0.4) recharge();
  });
  c.addEventListener("pointermove", (e) => { if (!mode) return; const { x, y } = pt(e); if (mode === "tape") { system?.nudge((x - lastX) / 3.6 * Math.PI / 180); lastX = x; } if (mode === "thr") { throttle = thrFromY(y); system?.setThrottle(throttle); } });
  addEventListener("pointerup", () => (mode = null));
}

// ── input ──────────────────────────────────────────────
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let kIdx = 0;
addEventListener("keydown", (e) => {
  if (!started || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!cmd.hidden) { if (e.key === "Escape") hideCmd(); return; }
  kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : e.key === KONAMI[0] ? 1 : 0;
  if (kIdx === KONAMI.length) { kIdx = 0; hyper(); return; }
  const k = e.key.toLowerCase();
  if (e.key === "/") { e.preventDefault(); return showCmd(); }
  if (e.key === "Escape") { if (panelOpen) return closePanel(); abortTour(); if (system?.focusedId()) closeHud(true); }
  if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1);
  if (k === "x") toggleCutaway();
  if (/^[1-8]$/.test(e.key)) select(projects[Number(e.key) - 1]);
  if (e.key === "9") openPanel("next");
  if (k === "p") openPanel("pilot"); if (k === "m") openPanel("log"); if (k === "c") openPanel("comms"); if (k === "d") openPanel("diag"); if (k === "b") openPanel("bbox");
  if (k === "t") tour(); if (k === "s") snd.click(); if (k === "0") selectSun();
});
addEventListener("wheel", (e) => { if (!system) return; throttle = clamp(throttle + e.deltaY * -0.0009, -0.6, 1); system.setThrottle(throttle); }, { passive: true });
// long-press the sun → solar flare
let pressTimer = 0;
$("#orbit-canvas").addEventListener("pointerdown", () => { const onSun = !!system?.pick()?.sun; clearTimeout(pressTimer); if (onSun) pressTimer = setTimeout(() => { system.flare(); audio.chord(); showToast("solar flare", 1800); }, 650); });
addEventListener("pointerup", () => clearTimeout(pressTimer));
document.addEventListener("pointerenter", (e) => { if (started && finePointer && e.target.closest?.("a, button, .lab")) audio.tick(); }, true);
document.addEventListener("click", (e) => { if (started && e.target.closest?.("a, button:not(#start)")) audio.click(); }, true);

// ── deck init ──────────────────────────────────────────
function initDeck() {
  const labels = document.createElement("div"); labels.className = "orbit__labels"; deck.prepend(labels);
  let flightFrom = "system", flightStart = 0;
  system = createSystem({ canvas: $("#orbit-canvas"), labelsEl: labels, projects, onSelect: select, onSunSelect: selectSun, reducedMotion: reduced,
    onFlightEvent: (name, info) => {
      if (name === "launch") { audio.warp(2.6 / (info?.dur || 2.6)); energy = clamp(energy - clamp(info.dist / 260, 0.06, 0.32), 0, 1); flightStart = performance.now(); }
      if (name === "launchBack") { audio.retro(2.6 / (info?.dur || 2.6)); flightStart = performance.now(); }
      if (name === "belt") audio.beltHit();
      if (name === "arrive" || name === "home") {
        const to = name === "home" ? "system" : current ? current.title : coreOpen ? "core" : "?";
        blackBox.push({ at: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), from: flightFrom, to, dur: ((performance.now() - flightStart) / 1000).toFixed(1) });
        if (blackBox.length > 40) blackBox.shift(); sessionStorage.setItem("wsf-blackbox", JSON.stringify(blackBox)); flightFrom = to;
      }
    },
    onBeltLevel: (k) => { beltNear = k; audio.setLevel("belt", k); } });
  system.setActive(true); system.setScroll(0);
  renderTargets(); renderTele();
  deck.setAttribute("aria-hidden", "false");
  gsap.to(deck, { opacity: 1, duration: 1.2, ease: "power2.out", delay: 0.3 });
  gsap.from(".deck__id, .deck__mark, .screen, .keys", { opacity: 0, y: 10, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.5 });
  let lastT = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    fps.frames++; if (now - fps.last > 1000) { fps.value = fps.frames; fps.frames = 0; fps.last = now; }
    tickEnergy(dt); drawRadar(); drawDash(); drawLock(); drawCallouts();
  })(performance.now());
  scheduleBeacon();
  console.log("%c wosmo · flight deck ", "background:#050508;color:#00e5ff;font:12px/1.6 ui-monospace,monospace;border:1px solid #00e5ff;padding:4px 8px",
    "\n  1–8  jump · 0  the sun · 9  next mission · t  tour · /  command line · p m c d b  panels\n  long-press the sun · watch for a beacon · ↑↑↓↓←→←→ba\n");
}
