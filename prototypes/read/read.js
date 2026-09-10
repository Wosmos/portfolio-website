// Reading site — shared runtime: backdrop, header, sound, motion (GSAP), composition, contact form.
// Pages import what they need and render from ../data.js — the same data the flight deck uses.

import { person, projects, experience, skills, education, highlights, featured, testimonials, LANG_COLORS } from "../data.js";
import { createAudio } from "../audio.js";

export { person, projects, experience, skills, education, highlights, featured, testimonials };
export const featuredProjects = featured.map((id) => projects.find((p) => p.id === id)).filter(Boolean);

// Real shader planets (ship/scene.js) in small canvases — loaded lazily so pages without one pay nothing.
export async function planetStrip(canvas, opts = {}) {
  await new Promise((r) => setTimeout(r, 900)); // let the hero decode finish before the shaders compile
  try { const { createPlanetStrip } = await import("../planet-view.js"); const strip = createPlanetStrip({ canvas, projects, ...opts }); window.__read.strip = strip; return strip; }
  catch (e) { console.warn("[planets] webgl unavailable", e); canvas.classList.add("is-off"); return null; }
}
export async function planets(opts = {}) {
  if (!document.querySelector("canvas[data-planet]")) return [];
  try { const { mountPlanets } = await import("../planet-view.js"); return mountPlanets(projects, opts); }
  catch (e) { console.warn("[planets] webgl unavailable", e); document.querySelectorAll("canvas[data-planet]").forEach((c) => c.classList.add("is-off")); return []; }
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = matchMedia("(pointer: fine)").matches;
export const pad2 = (n) => String(n).padStart(2, "0");
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const hex = (n) => "#" + n.toString(16).padStart(6, "0");
export const host = (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");
export const CV = "../assets/Wasif_Malik_Resume_SoftwareEngineer.pdf";
const gsap = window.gsap;
if (gsap) { gsap.config({ nullTargetWarn: false }); gsap.ticker.lagSmoothing(0); } // shader compiles cause long frames; let tweens catch up instead of pausing
if (gsap && window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
if (gsap && window.SplitText) gsap.registerPlugin(window.SplitText);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const ym = (s) => { if (!s) return "present"; const [y, m] = s.split("-"); return m ? `${MONTHS[+m - 1]} ${y}` : y; };
export const months = (a, b) => { const [ay, am] = a.split("-").map(Number); const e = b ? b.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1]; return (e[0] - ay) * 12 + (e[1] - am) + 1; };
export const span = (m) => (m >= 12 ? `${Math.floor(m / 12)} yr${m >= 24 ? "s" : ""}${m % 12 ? ` ${m % 12} mo` : ""}` : `${m} mo`);
export const ago = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`; };

// ── sound — same files and the same mute key as the flight deck; the bed starts on load when the
// browser allows it (it does once the visitor has clicked anywhere on this origin, e.g. the gate),
// otherwise on the first gesture.
export const audio = createAudio({ muted: localStorage.getItem("v3-muted") === "1", base: "../assets/audio/", ambientGain: 0.7 });
function startSound() { audio.resume(); audio.load().then(() => audio.startAmbient()); }
addEventListener("pointerdown", () => audio.resume(), { once: true });
addEventListener("keydown", () => audio.resume(), { once: true });
document.addEventListener("click", (e) => { if (e.target.closest?.("a, button")) audio.click(); }, true);
// Hover tick: only for a deliberate hover — the pointer actually moved onto the element (not the page
// scrolling under a still cursor) and stayed there 500 ms.
let lastMove = 0, dwell = 0, dwellEl = null;
addEventListener("pointermove", () => (lastMove = performance.now()), { passive: true });
document.addEventListener("pointerover", (e) => {
  const el = e.target.closest?.("a, button, .card, .proj__card, canvas[data-planet]"); if (!el || el === dwellEl) return;
  clearTimeout(dwell); dwellEl = el;
  if (performance.now() - lastMove > 120) return;                       // arrived by scrolling, not by pointing
  dwell = setTimeout(() => { if (dwellEl === el && el.matches(":hover")) audio.tick(); }, 500);
}, true);
document.addEventListener("pointerout", (e) => { if (dwellEl && !dwellEl.contains(e.relatedTarget)) { clearTimeout(dwell); dwellEl = null; } }, true);

// ── backdrop: canvas stars with scroll parallax + a slow drift ──
export function stars() {
  const c = document.createElement("canvas"); c.className = "stars"; c.setAttribute("aria-hidden", "true"); document.body.prepend(c);
  const g = c.getContext("2d"); let list = [], W = 0, H = 0;
  function seed() { W = c.width = innerWidth * devicePixelRatio; H = c.height = innerHeight * devicePixelRatio; const n = Math.round((innerWidth * innerHeight) / 2600);
    list = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .2 + Math.random() ** 2 * .8, r: (Math.random() ** 3) * 1.6 * devicePixelRatio + .3, a: .18 + Math.random() * .6, p: Math.random() * 6.28, s: .3 + Math.random() * 1.2 })); }
  function draw(t) { g.clearRect(0, 0, W, H); const sy = (reduced ? 0 : scrollY) * devicePixelRatio; const dx = reduced ? 0 : t * .004;
    for (const s of list) { const tw = reduced ? 1 : .65 + .35 * Math.sin(t * .001 * s.s + s.p); const y = (((s.y - sy * s.z * .35) % H) + H) % H; const x = (((s.x + dx * s.z) % W) + W) % W;
      g.globalAlpha = s.a * tw; g.fillStyle = s.r > 1.3 * devicePixelRatio ? "#cfefff" : "#fff"; g.beginPath(); g.arc(x, y, s.r, 0, 6.28); g.fill(); }
    if (!reduced) requestAnimationFrame(draw); }
  seed(); addEventListener("resize", seed); draw(0);
  for (const cls of ["glow", "scan"]) { const d = document.createElement("div"); d.className = cls; d.setAttribute("aria-hidden", "true"); document.body.prepend(d); }
  const grain = document.createElement("div"); grain.className = "grain"; grain.setAttribute("aria-hidden", "true"); document.body.append(grain);
}

// ── header + footer ──
export function header(current) {
  const nav = [["projects", "./projects.html"], ["experience", "./#experience"], ["skills", "./#skills"], ["contact", "./contact.html"]];
  const el = document.createElement("header"); el.className = "top";
  el.innerHTML = `
    <a class="top__brand" href="./" aria-label="Wasif Malik — home"><img class="top__w" src="../assets/wosmo-w.svg" alt=""><img class="top__mark" src="../assets/wosmo-full.svg" alt="wosmo"></a>
    <nav class="top__nav" aria-label="Sections">${nav.map(([n, h]) => `<a href="${h}" ${current === n ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
    <div class="top__tools">
      <a class="sf pill" href="${CV}" target="_blank" rel="noopener" title="Résumé PDF"><span class="sf__in">résumé ↓</span></a>
      <button class="sf pill" id="snd" type="button" aria-pressed="true" title="Sound"><span class="sf__in"><i class="eq" aria-hidden="true"><b></b><b></b><b></b></i>snd</span></button>
      <a class="sf pill is-mg" href="../ship/" title="Switch to the flight deck" data-door="fly"><span class="sf__in">fly ↗</span></a>
    </div>
    <i class="top__bar" aria-hidden="true"></i>`;
  $(".page").prepend(el);
  const snd = $("#snd", el);
  const renderSnd = () => { snd.setAttribute("aria-pressed", String(!audio.muted)); snd.classList.toggle("is-off", audio.muted); };
  snd.addEventListener("click", () => { audio.setMuted(!audio.muted); localStorage.setItem("v3-muted", audio.muted ? "1" : "0"); renderSnd(); }); renderSnd();
  $$("[data-door]", el).forEach((a) => a.addEventListener("click", () => { try { localStorage.setItem("v3-door", a.dataset.door); } catch {} }));
  // reading progress bar under the header
  if (gsap && window.ScrollTrigger && !reduced) gsap.to($(".top__bar", el), { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.2 } });
}
export function footer() {
  const el = document.createElement("footer"); el.className = "foot";
  el.innerHTML = `<span><img class="foot__mark" src="../assets/wosmo-full.svg" alt="wosmo"> · ${esc(person.location)} · ${esc(person.tzLabel)}</span>
    <span><a href="${person.github}" target="_blank" rel="noopener">github</a> · <a href="${person.linkedin}" target="_blank" rel="noopener">linkedin</a> · <a href="mailto:${person.email}">${person.email}</a> · <a href="../?gate=1">read / fly</a></span>`;
  $(".page").append(el);
}

// ── composition (same numbers the planet cutaway uses) ──
export function langsOf(p) { const l = (p.langs || []).slice().sort((a, b) => b[1] - a[1]); const t = l.reduce((a, x) => a + x[1], 0) || 1; return l.map(([n, v]) => ({ n, v, share: v / t, c: hex(LANG_COLORS[n] ?? LANG_COLORS.Other) })); }
export function compositionHtml(p, { legend = true } = {}) {
  const langs = langsOf(p); if (!langs.length) return "";
  return `<div class="comp__bar" aria-label="Language composition">${langs.map((l) => `<i title="${l.n} ${l.v.toFixed(1)}%" style="flex-basis:${(l.share * 100).toFixed(2)}%;background:${l.c}"></i>`).join("")}</div>` +
    (legend ? `<div class="comp__legend">${langs.map((l) => `<span style="--c:${l.c}" class="${l.v < 1 ? "is-dim" : ""}"><b>${l.n}</b>${l.v.toFixed(1)}%</span>`).join("")}</div>` : "");
}
// A planet cut open, in 2D: concentric rings by volume share — the reading-site twin of the cutaway.
export function dialSvg(p, size = 72) {
  const langs = langsOf(p); const R = size / 2, rim = 2; let acc = 0;
  const rings = langs.slice().reverse().map((l) => { const inner = acc; acc += l.share; const r0 = (R - rim) * Math.cbrt(inner), r1 = (R - rim) * Math.cbrt(acc); return { ...l, r0, r1 }; }).reverse();
  return `<svg class="dial" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" style="--rim:${hex(p.planet?.rim ?? 0x00e5ff)}">
    <circle class="dial__halo" cx="${R}" cy="${R}" r="${R - 1}" fill="none" stroke="var(--rim)" stroke-opacity=".35"/>
    ${rings.map((l, i) => `<circle class="dial__ring" data-i="${i}" cx="${R}" cy="${R}" r="${(l.r0 + l.r1) / 2}" fill="none" stroke="${l.c}" stroke-width="${Math.max(0.8, l.r1 - l.r0)}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 ${R} ${R})"><title>${l.n} ${l.v.toFixed(1)}%</title></circle>`).join("")}
  </svg>`;
}
export const chips = (list) => list.map((s) => `<span class="sf sf--chip"><span class="sf__in">${esc(s)}</span></span>`).join("");

// ── live from GitHub: last public push (one request; the deck does the same) ──
export async function lastPush() {
  try {
    const r = await fetch("https://api.github.com/users/Wosmos/events/public?per_page=30", { headers: { accept: "application/vnd.github+json" } });
    if (!r.ok) return null;
    const ev = (await r.json()).find((e) => e.type === "PushEvent"); if (!ev) return null;
    return { repo: ev.repo.name.split("/")[1], at: ev.created_at, msg: ev.payload?.commits?.at(-1)?.message?.split("\n")[0] ?? "" };
  } catch { return null; }
}

// Per-repo live data: meta (stars, created, pushed, description) and the README rendered to simple HTML.
// Private repos (Learnity, DevToolsHQ) answer 404 → callers fall back to data.js.
// Both resolve to null on failure and record why in `ghState` (404 = private repo, 403 = rate limit, 0 = offline)
export const ghState = { status: 200 };
async function gh(url, accept) {
  try { const r = await fetch(url, { headers: { accept } }); if (!r.ok) { ghState.status = r.status; return null; } return r; } catch { ghState.status = 0; return null; }
}
export const ghReason = () => (ghState.status === 404 ? "repo is private" : ghState.status === 403 ? "github rate limit · try again later" : ghState.status === 0 ? "github unreachable" : `github ${ghState.status}`);
export async function repoMeta(p) {
  const r = await gh(`https://api.github.com/repos/${p.github.replace("https://github.com/", "")}`, "application/vnd.github+json"); if (!r) return null;
  const j = await r.json(); return { stars: j.stargazers_count, created: j.created_at, pushed: j.pushed_at, description: j.description, homepage: j.homepage, topics: j.topics || [], size: j.size, private: j.private };
}
export async function readmeHtml(p, { maxBlocks = 10 } = {}) {
  const r = await gh(`https://api.github.com/repos/${p.github.replace("https://github.com/", "")}/readme`, "application/vnd.github.raw+json"); if (!r) return null; return mdLite(await r.text(), maxBlocks);
}
// markdown-lite: headings, paragraphs, bullet lists, inline code/bold/links. Drops images, badges, html, tables, code fences.
export function mdLite(md, maxBlocks = 10) {
  const lines = md.replace(/\r/g, "").split("\n"); const blocks = []; let para = [], list = [], fence = false, skipSection = false;
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const linkOnly = (t) => /^(\s*\[[^\]]+\]\([^)]*\)\s*([·|•-]\s*)?)+$/.test(t);
  const flush = () => { if (para.length) { const t = para.join(" ").trim(); if (t && !linkOnly(t)) blocks.push({ k: "p", h: `<p>${inline(t)}</p>` }); para = []; } if (list.length) { blocks.push({ k: "ul", h: `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>` }); list = []; } };
  for (const raw of lines) {
    if (/^\s*```/.test(raw)) { fence = !fence; flush(); continue; } if (fence) continue;
    const l = raw.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/<[^>]+>/g, "").trim();
    if (!l) { flush(); continue; }
    const h = l.match(/^(#{1,6})\s+(.*)/);
    if (h) { flush(); const title = h[2].replace(/[#*_`]+$/, "").trim(); skipSection = /contents|^toc$|badges?/i.test(title); if (h[1].length > 1 && !skipSection) blocks.push({ k: "h", h: `<h3>${inline(title)}</h3>` }); continue; }
    if (skipSection) continue;
    if (/^\|/.test(l) || /^[-=]{3,}$/.test(l) || /^\[!\[/.test(l) || /shields\.io|badge/i.test(l)) continue;
    const li = l.match(/^[-*+]\s+(.*)|^\d+[.)]\s+(.*)/);
    if (li) { const item = li[1] ?? li[2]; if (/^\[[^\]]+\]\(#/.test(item)) continue; if (para.length) flush(); list.push(item); continue; }
    if (list.length) flush(); para.push(l);
  }
  flush();
  // a heading is only worth keeping if real content follows it
  const kept = []; for (let i = 0; i < blocks.length; i++) { if (blocks[i].k === "h" && (i + 1 >= blocks.length || blocks[i + 1].k === "h")) continue; kept.push(blocks[i]); }
  return kept.slice(0, maxBlocks).map((b) => b.h).join("");
}

// ── toast ──
let toastEl = null, toastT = 0;
export function toast(msg, ms = 2400) {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.append(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add("is-on"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("is-on"), ms);
}

// ── contact form → POST /api/contact (dev-server.mjs locally, the Next route in prod) ──
export function contactForm(mount) {
  mount.innerHTML = `
    <form class="form" novalidate>
      <div class="form__row">
        <div class="f"><label for="c-name">name</label><input id="c-name" name="name" type="text" required maxlength="100" autocomplete="name"></div>
        <div class="f"><label for="c-email">email</label><input id="c-email" name="email" type="email" required maxlength="254" autocomplete="email"></div>
      </div>
      <div class="f"><label for="c-subject">subject</label><input id="c-subject" name="subject" type="text" required maxlength="150"></div>
      <div class="f"><label for="c-msg">message</label><textarea id="c-msg" name="message" required maxlength="5000"></textarea><span class="f__count" aria-hidden="true">0 / 5000</span></div>
      <div class="f f--hp" aria-hidden="true"><label for="c-web">website</label><input id="c-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <div class="form__foot"><button class="sf sf--btn" type="submit"><span class="sf__in">send <i>→</i></span></button><span class="form__msg" role="status"></span></div>
    </form>`;
  const form = $("form", mount), btn = $("button", form), msg = $(".form__msg", form), ta = $("textarea", form), count = $(".f__count", form);
  ta.addEventListener("input", () => { count.textContent = `${ta.value.length} / 5000`; });
  $$("input, textarea", form).forEach((el) => el.addEventListener("input", () => { if (el.value.length % 3 === 0) audio.type(); }));
  const set = (t, cls) => { msg.textContent = t; msg.className = "form__msg" + (cls ? ` is-${cls}` : ""); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    for (const k of ["name", "email", "subject", "message"]) if (!String(data[k] || "").trim()) { set(`${k} is required`, "bad"); shake(form); $(`[name=${k}]`, form).focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { set("that email does not look right", "bad"); shake(form); $("[name=email]", form).focus(); return; }
    btn.disabled = true; set("sending …");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success) { set("sent · i will reply from my inbox", "ok"); form.reset(); count.textContent = "0 / 5000"; audio.arrive(); if (gsap && !reduced) gsap.fromTo(btn, { scale: 1 }, { scale: 1.06, yoyo: true, repeat: 1, duration: 0.18 }); }
      else { set(j.error || `could not send (${r.status})`, "bad"); shake(form); btn.disabled = false; }
    } catch { set("no connection to the mail endpoint", "bad"); shake(form); btn.disabled = false; }
  });
}
function shake(el) { if (gsap && !reduced) gsap.fromTo(el, { x: -5 }, { x: 0, duration: 0.45, ease: "elastic.out(1, 0.3)" }); }

// ── motion ──
// A text scramble that resolves left→right (same feel as the deck's readout titles).
const GLYPHS = "▮▯░▒▓/\\|<>[]{}=+*#%@01";
export function scramble(el, text, dur = 0.7) {
  if (!gsap || reduced) { el.textContent = text; return; }
  const o = { p: 0 }; const n = text.length;
  return gsap.to(o, { p: 1, duration: dur, ease: "power2.out", onUpdate: () => { const k = Math.floor(o.p * n); let s = text.slice(0, k); for (let i = k; i < n; i++) s += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0]; el.textContent = s; }, onComplete: () => (el.textContent = text) });
}
// Cipher decode: every character cycles through glyphs, then locks left→right (per-char spans, so
// layout never shifts). `data-cipher` elements decode when they scroll into view.
const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*<>/\\|=+";
export function cipher(el, text = el.dataset.text ?? el.textContent, { dur = 0.9, delay = 0, stagger = 0.045 } = {}) {
  el.dataset.text = text;
  if (!gsap || reduced) { el.textContent = text; return; }
  const upper = /[A-Z]/.test(text) && text === text.toUpperCase();
  el.textContent = ""; el.classList.add("is-cipher");
  const spans = [...text].map((ch) => { const s = document.createElement("span"); s.className = "cc"; s.textContent = ch === " " ? "\u00a0" : CIPHER[(Math.random() * CIPHER.length) | 0]; if (ch === " ") s.classList.add("is-sp"); el.appendChild(s); return [s, ch]; });
  const tl = gsap.timeline({ delay, onComplete: () => { el.textContent = text; el.classList.remove("is-cipher"); } });
  spans.forEach(([s, ch], i) => {
    if (ch === " ") return;
    const o = { t: 0 }; const lock = delay * 0 + i * stagger;
    tl.to(o, { t: 1, duration: dur * 0.55, ease: "none", onUpdate() { if (Math.random() < 0.5) { let g = CIPHER[(Math.random() * CIPHER.length) | 0]; s.textContent = upper ? g : (Math.random() < .5 ? g.toLowerCase() : g); } } }, lock)
      .add(() => { s.textContent = ch; s.classList.add("is-lock"); }, lock + dur * 0.55);
  });
  return tl;
}
function inView(targets, vars = {}, trig = {}) {
  const els = typeof targets === "string" ? $$(targets) : targets; if (!els.length) return;
  if (!gsap || reduced) { gsap?.set(els, { clearProps: "all" }); els.forEach((e) => e.classList.add("is-in")); return; }
  gsap.set(els, { opacity: 0, y: vars.y ?? 22 });
  window.ScrollTrigger.batch(els, { start: "top 88%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, ...vars, y: 0, onComplete() { b.forEach((e) => e.classList.add("is-in")); } }), ...trig });
}
export function motion() {
  if (!gsap) { $$(".rv, .rv-i").forEach((e) => e.classList.add("is-in")); return; }
  // page enter: curtain lifts, header drops in
  const curtain = document.createElement("div"); curtain.className = "curtain"; curtain.setAttribute("aria-hidden", "true"); document.body.append(curtain);
  const tl = gsap.timeline();
  if (!reduced) {
    tl.to(curtain, { yPercent: -101, duration: 0.7, ease: "power3.inOut" }, 0.05)
      .from(".top", { y: -16, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.35);
  } else gsap.set(curtain, { display: "none" });
  // hero: the name decodes like a cipher, the rest slides in behind it
  const name = $(".hero .name, .pj .name"); if (name && !reduced) tl.add(cipher(name, undefined, { dur: 1.1, stagger: 0.06 }), 0.4);
  if (!reduced) {
    tl.from(".hero .k, .hero .sub, .hero__p, .hero__row, .hero__meta, .pj__tag, .pj__meta, .pj__desc, .pj__b, .back", { opacity: 0, y: 14, duration: 0.7, stagger: 0.07, ease: "power3.out" }, 0.75)
      .from(".hero__side > *, .pj__side > *", { opacity: 0, x: 24, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 0.85);
    // the words of the summary come in as a block decode
    const p = $(".hero__p"); if (p && window.SplitText) { const st = new window.SplitText(p, { type: "words", wordsClass: "wd" }); tl.from(st.words, { opacity: 0, y: 6, filter: "blur(4px)", duration: 0.5, stagger: 0.012, ease: "power2.out" }, 0.9); }
  }
  // section headers and any [data-cipher] decode when they enter
  $$(".sec__h h2").forEach((h) => { const text = h.textContent; if (reduced) return; h.textContent = ""; window.ScrollTrigger.create({ trigger: h, start: "top 90%", once: true, onEnter: () => cipher(h, text, { dur: 0.8, stagger: 0.05 }) }); });
  $$("[data-cipher]").forEach((el) => { const text = el.textContent; if (reduced) return; el.textContent = ""; window.ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => cipher(el, text, { dur: 0.7, stagger: 0.03 }) }); });
  // project titles re-cipher on hover
  if (finePointer && !reduced) $$(".proj__card").forEach((c) => { const h = $("h3", c); let busy = false; c.addEventListener("pointerenter", () => { if (busy) return; busy = true; cipher(h, h.dataset.text || h.textContent, { dur: 0.5, stagger: 0.035 })?.eventCallback("onComplete", () => { h.textContent = h.dataset.text; h.classList.remove("is-cipher"); busy = false; }); }); });
  // batch reveals
  inView(".rv"); inView(".proj__card", { y: 30 }); inView(".xp__i", { y: 20 }); inView(".sk__row", { y: 12 }); inView(".quote", { y: 24 }); inView(".edu .sf", { y: 16 });
  // proof counters
  $$("[data-count]").forEach((el) => { const to = +el.dataset.count, suffix = el.dataset.suffix || ""; if (reduced) { el.textContent = to + suffix; return; } const o = { v: 0 };
    window.ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.2, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(o.v) + suffix) }) }); });
  // composition bars grow; dials draw
  $$(".comp__bar").forEach((bar) => { if (reduced) return; gsap.from($$("i", bar), { scaleX: 0, transformOrigin: "left", duration: 0.9, ease: "power3.out", stagger: 0.05, scrollTrigger: { trigger: bar, start: "top 92%", once: true } }); });
  $$(".dial").forEach((d) => { const rings = $$(".dial__ring", d); if (reduced) { gsap.set(rings, { strokeDashoffset: 0 }); return; }
    gsap.to(rings, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.07, scrollTrigger: { trigger: d, start: "top 92%", once: true } });
    gsap.to(d, { rotate: 360, duration: 90, repeat: -1, ease: "none" }); });
  // experience timeline: the line draws with scroll and each station lights up as it is reached
  const xp = $(".xp"); if (xp && !reduced) {
    gsap.fromTo(xp, { "--draw": 0 }, { "--draw": 1, ease: "none", scrollTrigger: { trigger: xp, start: "top 62%", end: "bottom 62%", scrub: 0.3 } });
    $$(".xp__i").forEach((it) => window.ScrollTrigger.create({ trigger: it, start: "top 62%", onEnter: () => { it.classList.add("is-lit"); audio.tick(); }, onLeaveBack: () => it.classList.remove("is-lit") }));
  } else $$(".xp__i").forEach((it) => it.classList.add("is-lit"));
  // skills tokens type in as the matrix enters
  const toks = $$(".tok span"); if (toks.length && !reduced) window.ScrollTrigger.create({ trigger: ".skills__matrix", start: "top 85%", once: true, onEnter: () => toks.forEach((el, i) => cipher(el, el.textContent, { dur: 0.5, stagger: 0.02, delay: Math.min(1.6, i * 0.035) })) });
  // cards: pointer-tracked spotlight (no tilt)
  if (finePointer && !reduced) $$(".proj__card, .card, .proof .sf").forEach((card) => {
    card.addEventListener("pointermove", (e) => { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); });
  });
  // magnetic buttons
  if (finePointer && !reduced) $$(".sf--btn").forEach((b) => {
    b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: "power2.out" }); });
    b.addEventListener("pointerleave", () => gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" }));
  });
  // internal navigation: sweep out, then go
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href]"); if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.button) return;
    const url = new URL(a.href, location.href); if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor
    if (reduced) return;
    e.preventDefault(); gsap.set(curtain, { display: "block", yPercent: 101 }); gsap.to(curtain, { yPercent: 0, duration: 0.45, ease: "power3.inOut", onComplete: () => location.assign(url.href) });
  }, true);
}

// ── page boot ──
window.__read = { audio };
export function boot(current) { stars(); header(current); footer(); startSound(); (document.fonts?.ready ?? Promise.resolve()).then(motion); }
