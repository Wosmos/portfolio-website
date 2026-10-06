"use client";
// Client shell around every reading page: backdrop layers, the GSAP motion pass (cipher decodes, reveals,
// counters, bars, timeline, spotlight, magnetic buttons, page curtain), the ambient bed and hover ticks.
// Content itself is server-rendered; this only decorates the DOM that is already there.

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Stars from "@/components/Stars";
import { whenQuiet } from "@/lib/device";
import { getAudio } from "@/lib/sound-client";

export default function ReadShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = getAudio();
    // The interface cuts are ~160 kB. Fetching them during hydration put them in a queue with the
    // content on a slow link, and nothing can play before the visitor has touched the page anyway.
    // Idle time only fetches the bytes: creating the AudioContext there was a 200 ms main-thread task
    // in Chrome, so the context and the decode wait for the first gesture.
    const warm = (): void => { void audio.prefetch(); };
    const stopWarming = whenQuiet(warm, 6000);
    // The ambient bed is ~1 MB, so it waits for an actual gesture. A scroll used to count, which meant
    // the first flick on a phone pulled a megabyte down alongside everything else still loading.
    const begin = (): void => { audio.resume(); void audio.load(); void audio.startAmbient(); };
    addEventListener("pointerdown", begin, { once: true });
    addEventListener("keydown", begin, { once: true });
    // click + deliberate-hover ticks: the pointer must have moved onto the element and stayed 500 ms
    const onClick = (e: MouseEvent): void => { if (e.target instanceof Element && e.target.closest("a, button")) audio.click(); };
    let lastMove = 0, dwell = 0, dwellEl: Element | null = null;
    const onMove = (): void => { lastMove = performance.now(); };
    const onOver = (e: PointerEvent): void => {
      const el = e.target instanceof Element ? e.target.closest("a, button, .card, .proj__card") : null;
      if (!el || el === dwellEl) return;
      clearTimeout(dwell); dwellEl = el;
      if (performance.now() - lastMove > 120) return;
      dwell = window.setTimeout(() => { if (dwellEl === el && el.matches(":hover")) audio.tick(); }, 500);
    };
    const onOut = (e: PointerEvent): void => { if (dwellEl && !(e.relatedTarget instanceof Node && dwellEl.contains(e.relatedTarget))) { clearTimeout(dwell); dwellEl = null; } };
    document.addEventListener("click", onClick, true);
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    return () => {
      stopWarming();
      removeEventListener("pointerdown", begin); removeEventListener("keydown", begin);
      document.removeEventListener("click", onClick, true); removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver, true); document.removeEventListener("pointerout", onOut, true);
      clearTimeout(dwell);
    };
  }, []);

  // The motion pass runs per page (pathname) after fonts are ready. GSAP and its plugins are ~55 kB
  // compressed and decorate a page that is already readable, so they load after hydration instead of
  // with the scripts the first paint waits behind.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("@/lib/motion"), document.fonts?.ready ?? Promise.resolve()]).then(([{ runMotion }]) => {
      if (cancelled || !curtain.current) return;
      cleanup = runMotion({ curtain: curtain.current, audio: getAudio() });
    }).catch(() => { /* a failed chunk only costs the decoration */ });
    return () => { cancelled = true; cleanup?.(); };
  }, [pathname]);

  return (
    <div className="read">
      <Stars />
      <div className="glow" aria-hidden="true" />
      <div className="scan" aria-hidden="true" />
      {children}
      <div className="grain" aria-hidden="true" />
      {/* the entrance reveal, lifted by CSS; the curtain below is only for outgoing navigation */}
      <div className="veil" aria-hidden="true" />
      <div ref={curtain} className="curtain" aria-hidden="true" />
    </div>
  );
}
