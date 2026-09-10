// GSAP motion pass for the reading site. Works on server-rendered DOM by class name, so pages stay
// plain HTML for crawlers and the animation is purely additive. Ported from the prototype's read.js.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type { AudioApi } from "@/lib/audio";

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.config({ nullTargetWarn: false });
gsap.ticker.lagSmoothing(0); // shader compiles cause long frames; let tweens catch up instead of pausing

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));
const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = (): boolean => matchMedia("(pointer: fine)").matches;

const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*<>/\\|=+";
/** Every character cycles through glyphs, then locks left→right. Per-char spans so layout never shifts. */
export function cipher(el: HTMLElement, text = el.dataset.text ?? el.textContent ?? "", { dur = 0.9, delay = 0, stagger = 0.045 } = {}): gsap.core.Timeline | null {
  el.dataset.text = text;
  if (reducedMotion()) { el.textContent = text; return null; }
  const upper = /[A-Z]/.test(text) && text === text.toUpperCase();
  el.textContent = ""; el.classList.add("is-cipher");
  const spans = [...text].map((ch) => {
    const s = document.createElement("span"); s.className = "cc";
    s.textContent = ch === " " ? " " : CIPHER[Math.floor(Math.random() * CIPHER.length)] ?? ch;
    if (ch === " ") s.classList.add("is-sp");
    el.appendChild(s); return [s, ch] as const;
  });
  const tl = gsap.timeline({ delay, onComplete: () => { el.textContent = text; el.classList.remove("is-cipher"); } });
  spans.forEach(([s, ch], i) => {
    if (ch === " ") return;
    const o = { t: 0 }, lock = i * stagger;
    tl.to(o, { t: 1, duration: dur * 0.55, ease: "none", onUpdate() { if (Math.random() < 0.5) { const g = CIPHER[Math.floor(Math.random() * CIPHER.length)] ?? ch; s.textContent = upper ? g : Math.random() < 0.5 ? g.toLowerCase() : g; } } }, lock)
      .add(() => { s.textContent = ch; s.classList.add("is-lock"); }, lock + dur * 0.55);
  });
  return tl;
}

function inView(sel: string, y = 22): void {
  const els = $$(sel); if (!els.length) return;
  if (reducedMotion()) { els.forEach((e) => e.classList.add("is-in")); return; }
  gsap.set(els, { opacity: 0, y });
  ScrollTrigger.batch(els, { start: "top 88%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, onComplete() { b.forEach((e) => e.classList.add("is-in")); } }) });
}

export interface MotionDeps { curtain: HTMLElement; audio: AudioApi }
/** Runs the whole pass for the current page; returns a cleanup that kills every tween and trigger. */
export function runMotion({ curtain, audio }: MotionDeps): () => void {
  const reduced = reducedMotion();
  const ctx = gsap.context(() => {
    const tl = gsap.timeline();
    if (!reduced) {
      tl.set(curtain, { display: "block", yPercent: 0 }).to(curtain, { yPercent: -101, duration: 0.7, ease: "power3.inOut" }, 0.05).set(curtain, { display: "none" })
        .from(".top", { y: -16, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.35);
    } else gsap.set(curtain, { display: "none" });
    const name = document.querySelector<HTMLElement>(".hero .name, .pj .name");
    if (name && !reduced) { const t = cipher(name, undefined, { dur: 1.1, stagger: 0.06 }); if (t) tl.add(t, 0.4); }
    if (!reduced) {
      tl.from(".hero .k, .hero .sub, .hero__p, .hero__row, .hero__meta, .pj__tag, .pj__meta, .pj__desc, .pj__actions, .back", { opacity: 0, y: 14, duration: 0.7, stagger: 0.07, ease: "power3.out" }, 0.75)
        .from(".hero__side > *, .pj__planet > *", { opacity: 0, x: 24, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 0.85);
      const p = document.querySelector<HTMLElement>(".hero__p");
      if (p) { const st = new SplitText(p, { type: "words", wordsClass: "wd" }); tl.from(st.words, { opacity: 0, y: 6, filter: "blur(4px)", duration: 0.5, stagger: 0.012, ease: "power2.out" }, 0.9); }
    }
    $$(".sec__h h2").forEach((h) => { const text = h.textContent ?? ""; if (reduced) return; h.textContent = ""; ScrollTrigger.create({ trigger: h, start: "top 90%", once: true, onEnter: () => { cipher(h, text, { dur: 0.8, stagger: 0.05 }); } }); });
    $$("[data-cipher]").forEach((el) => { const text = el.textContent ?? ""; if (reduced) return; el.textContent = ""; ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => { cipher(el, text, { dur: 0.7, stagger: 0.03 }); } }); });
    if (finePointer() && !reduced) $$(".proj__card").forEach((c) => {
      const h = c.querySelector<HTMLElement>("h3"); if (!h) return; let busy = false;
      c.addEventListener("pointerenter", () => { if (busy) return; busy = true; const t = cipher(h, h.dataset.text ?? h.textContent ?? "", { dur: 0.5, stagger: 0.035 }); if (t) t.eventCallback("onComplete", () => { h.textContent = h.dataset.text ?? ""; h.classList.remove("is-cipher"); busy = false; }); else busy = false; });
    });
    inView(".rv"); inView(".proj__card", 30); inView(".xp__i", 20); inView(".sk__row", 12); inView(".quote", 24); inView(".edu .sf", 16);
    $$("[data-count]").forEach((el) => {
      const to = Number(el.dataset.count), suffix = el.dataset.suffix ?? "";
      if (reduced) { el.textContent = `${to}${suffix}`; return; }
      const o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.2, ease: "power2.out", onUpdate: () => { el.textContent = `${Math.round(o.v)}${suffix}`; } }) });
    });
    if (!reduced) $$(".comp__bar").forEach((bar) => gsap.from($$("i", bar), { scaleX: 0, transformOrigin: "left", duration: 0.9, ease: "power3.out", stagger: 0.05, scrollTrigger: { trigger: bar, start: "top 92%", once: true } }));
    // experience: the line draws with scroll; stations light up as they are reached
    const xp = document.querySelector<HTMLElement>(".xp");
    if (xp && !reduced) {
      gsap.fromTo(xp, { "--draw": 0 }, { "--draw": 1, ease: "none", scrollTrigger: { trigger: xp, start: "top 62%", end: "bottom 62%", scrub: 0.3 } });
      $$(".xp__i").forEach((it) => ScrollTrigger.create({ trigger: it, start: "top 62%", onEnter: () => { it.classList.add("is-lit"); audio.tick(); }, onLeaveBack: () => it.classList.remove("is-lit") }));
    } else $$(".xp__i").forEach((it) => it.classList.add("is-lit"));
    const toks = $$(".tok span");
    if (toks.length && !reduced) ScrollTrigger.create({ trigger: ".skills__matrix", start: "top 85%", once: true, onEnter: () => toks.forEach((el, i) => cipher(el, el.textContent ?? "", { dur: 0.5, stagger: 0.02, delay: Math.min(1.6, i * 0.035) })) });
    // spotlight (pointer-tracked gradient) + magnetic buttons
    if (finePointer() && !reduced) {
      $$(".proj__card, .card, .proof .sf").forEach((card) => card.addEventListener("pointermove", (e) => { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }));
      $$(".sf--btn").forEach((b) => {
        b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: "power2.out" }); });
        b.addEventListener("pointerleave", () => gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" }));
      });
    }
    ScrollTrigger.refresh();
  });
  // internal navigation: sweep the curtain in before the route changes (the router does the rest)
  const onClick = (e: MouseEvent): void => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.button !== 0 || reduced) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (url.pathname.startsWith("/ship")) return; // full navigation; let the browser go
    gsap.set(curtain, { display: "block", yPercent: 101 });
    gsap.to(curtain, { yPercent: 0, duration: 0.45, ease: "power3.inOut" });
  };
  document.addEventListener("click", onClick, true);
  return () => { ctx.revert(); document.removeEventListener("click", onClick, true); };
}
