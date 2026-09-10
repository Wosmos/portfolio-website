// GSAP motion pass for the reading site. Works on server-rendered DOM by class name, so pages stay
// plain HTML for crawlers and the animation is purely additive. Ported from the prototype's read.js.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type { AudioApi } from "@/lib/audio";
import { finePointer, reducedMotion, worthDecoding } from "@/lib/device";

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.config({ nullTargetWarn: false });
gsap.ticker.lagSmoothing(0); // shader compiles cause long frames; let tweens catch up instead of pausing

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

// How late this pass may be and still play the entrance. Past it the CSS veil has lifted and the
// reader is looking at the page, so fading it in from nothing would read as a fault, not a flourish.
const ENTRANCE_GRACE_MS = 700;
function entranceStillOwed(): boolean {
  const paint = performance.getEntriesByName("first-contentful-paint")[0];
  return performance.now() - (paint?.startTime ?? 0) < ENTRANCE_GRACE_MS;
}

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

/** Reveal groups are planned together and applied together: measuring one group, hiding it, then
 *  measuring the next forces a fresh layout per group, which is six of them on the reading home. */
function reveal(groups: readonly { sel: string; y?: number }[]): void {
  const found = groups.map(({ sel, y = 22 }) => ({ els: $$(sel), y })).filter((g) => g.els.length);
  if (!found.length) return;
  if (reducedMotion()) { for (const g of found) for (const e of g.els) e.classList.add("is-in"); return; }
  // Only what is still below the fold. Anything the reader can already see is left exactly as it is:
  // hiding it here, seconds after first paint, is what made the page blink as it finished loading.
  const fold = innerHeight;
  const plans = found.map(({ els, y }) => {               // every read first …
    const later: HTMLElement[] = [], shown: HTMLElement[] = [];
    for (const e of els) (e.getBoundingClientRect().top > fold ? later : shown).push(e);
    return { later, shown, y };
  });
  for (const { later, shown, y } of plans) {              // … then every write, so this costs one layout
    for (const e of shown) e.classList.add("is-in");
    if (!later.length) continue;
    gsap.set(later, { opacity: 0, y });
    ScrollTrigger.batch(later, { start: "top 88%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, onComplete() { b.forEach((e) => e.classList.add("is-in")); } }) });
  }
}

// Set when a link sweeps the curtain in, so the pass that runs on the page being navigated to knows it
// has a curtain to lift. On a fresh load it is false and the CSS veil does the reveal instead.
let swept = false;

export interface MotionDeps { curtain: HTMLElement; audio: AudioApi }
/** Runs the whole pass for the current page; returns a cleanup that kills every tween and trigger. */
export function runMotion({ curtain, audio }: MotionDeps): () => void {
  const reduced = reducedMotion();
  // the veil is CSS now, so this pass may find the page already on screen; and per-character decoding
  // is spent only where it can be seen and afforded
  const entrance = !reduced && entranceStillOwed();
  const decode = worthDecoding();
  const ctx = gsap.context(() => {
    const tl = gsap.timeline();
    if (swept && !reduced) {
      swept = false;
      tl.set(curtain, { display: "block", yPercent: 0 }).to(curtain, { yPercent: -101, duration: 0.55, ease: "power3.inOut" }, 0.02).set(curtain, { display: "none" });
    }
    if (entrance) tl.from(".top", { y: -16, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.35);
    const name = document.querySelector<HTMLElement>(".hero .name, .pj .name");
    if (name && entrance && decode) { const t = cipher(name, undefined, { dur: 1.1, stagger: 0.06 }); if (t) tl.add(t, 0.4); }
    if (entrance) {
      tl.from(".hero .k, .hero .sub, .hero__p, .hero__row, .hero__meta, .pj__tag, .pj__meta, .pj__desc, .pj__actions, .back", { opacity: 0, y: 14, duration: 0.7, stagger: 0.07, ease: "power3.out" }, 0.75)
        .from(".hero__side > *, .pj__planet > *", { opacity: 0, x: 24, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 0.85);
      // splitting the lead paragraph into words is only worth a whole extra pass over it if it animates
      const p = decode ? document.querySelector<HTMLElement>(".hero__p") : null;
      if (p) { const st = new SplitText(p, { type: "words", wordsClass: "wd" }); tl.from(st.words, { opacity: 0, y: 6, filter: "blur(4px)", duration: 0.5, stagger: 0.012, ease: "power2.out" }, 0.9); }
    }
    // The text is left alone until its trigger fires. Blanking every heading up front left ten of them
    // empty from hydration until they were scrolled to, and permanently empty if the pass never ran.
    const decodeOnEnter = (el: HTMLElement, start: string, vars: { dur: number; stagger: number }): void => {
      const text = el.textContent ?? "";
      ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => { cipher(el, text, vars); } });
    };
    if (decode) {
      $$(".sec__h h2").forEach((h) => decodeOnEnter(h, "top 90%", { dur: 0.8, stagger: 0.05 }));
      $$("[data-cipher]").forEach((el) => decodeOnEnter(el, "top 92%", { dur: 0.7, stagger: 0.03 }));
    }
    if (finePointer() && !reduced) $$(".proj__card").forEach((c) => {
      const h = c.querySelector<HTMLElement>("h3"); if (!h) return; let busy = false;
      c.addEventListener("pointerenter", () => { if (busy) return; busy = true; const t = cipher(h, h.dataset.text ?? h.textContent ?? "", { dur: 0.5, stagger: 0.035 }); if (t) t.eventCallback("onComplete", () => { h.textContent = h.dataset.text ?? ""; h.classList.remove("is-cipher"); busy = false; }); else busy = false; });
    });
    reveal([{ sel: ".rv" }, { sel: ".proj__card", y: 30 }, { sel: ".xp__i", y: 20 }, { sel: ".sk__row", y: 12 }, { sel: ".quote", y: 24 }, { sel: ".edu .sf", y: 16 }]);
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
      // a station lights as it is reached and stays lit, so the timeline fills in as you read down
      $$(".xp__i").forEach((it) => ScrollTrigger.create({
        trigger: it, start: "top 85%",
        onEnter: () => { it.classList.add("is-lit"); audio.tick(); },
        onLeaveBack: () => it.classList.remove("is-lit"),
      }));
    } else $$(".xp__i").forEach((it) => it.classList.add("is-lit"));
    // forty-odd tokens, each split per character on a staggered delay — the one decode worth skipping
    // wholesale where it cannot be hovered
    const toks = decode ? $$(".tok span") : [];
    if (toks.length) ScrollTrigger.create({ trigger: ".skills__matrix", start: "top 85%", once: true, onEnter: () => toks.forEach((el, i) => cipher(el, el.textContent ?? "", { dur: 0.5, stagger: 0.02, delay: Math.min(1.6, i * 0.035) })) });
    // spotlight: a pointer-tracked gradient on cards (no magnetic buttons — they read as dated)
    if (finePointer() && !reduced) $$(".proj__card, .card, .proof .sf").forEach((card) => card.addEventListener("pointermove", (e) => { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }));
    ScrollTrigger.refresh();
  });
  // Internal navigation: sweep the curtain in, and the next page's entrance timeline lifts it. Two
  // things must never start it, or the screen stays black with nothing to lift it: a link to the page
  // we are already on, and a link the router will not handle.
  let failsafe = 0;
  const onClick = (e: MouseEvent): void => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || reduced) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;          // same page: nothing will navigate
    if (url.pathname.startsWith("/ship") || url.pathname.startsWith("/admin")) return;   // full page load
    swept = true;
    gsap.set(curtain, { display: "block", yPercent: 101 });
    gsap.to(curtain, { yPercent: 0, duration: 0.45, ease: "power3.inOut" });
    // if the navigation is cancelled or fails, lift it rather than leaving a black screen
    clearTimeout(failsafe);
    failsafe = window.setTimeout(() => { swept = false; gsap.to(curtain, { yPercent: -101, duration: 0.4, onComplete: () => { gsap.set(curtain, { display: "none" }); } }); }, 2500);
  };
  document.addEventListener("click", onClick, true);
  return () => {
    clearTimeout(failsafe);
    // never leave a curtain behind on unmount — unless a link just swept it in, in which case the
    // page being navigated to is about to lift it and hiding it here would drop the transition
    if (!swept) gsap.set(curtain, { display: "none" });
    ctx.revert();
    document.removeEventListener("click", onClick, true);
  };
}
