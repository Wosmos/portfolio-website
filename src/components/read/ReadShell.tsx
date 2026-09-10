"use client";
// Client shell around every reading page: backdrop layers, the GSAP motion pass (cipher decodes, reveals,
// counters, bars, timeline, spotlight, magnetic buttons, page curtain), the ambient bed and hover ticks.
// Content itself is server-rendered; this only decorates the DOM that is already there.

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Stars from "@/components/Stars";
import { runMotion } from "@/lib/motion";
import { getAudio } from "@/lib/sound-client";

export default function ReadShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = getAudio();
    const start = (): void => { audio.resume(); void audio.load().then(() => audio.startAmbient()); };
    start();
    const resume = (): void => audio.resume();
    addEventListener("pointerdown", resume, { once: true });
    addEventListener("keydown", resume, { once: true });
    // click + deliberate-hover ticks: the pointer must have moved onto the element and stayed 500 ms
    const onClick = (e: MouseEvent): void => { if (e.target instanceof Element && e.target.closest("a, button")) audio.click(); };
    let lastMove = 0, dwell = 0, dwellEl: Element | null = null;
    const onMove = (): void => { lastMove = performance.now(); };
    const onOver = (e: PointerEvent): void => {
      const el = e.target instanceof Element ? e.target.closest("a, button, .card, .proj__card, canvas[data-planet]") : null;
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
      removeEventListener("pointerdown", resume); removeEventListener("keydown", resume);
      document.removeEventListener("click", onClick, true); removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver, true); document.removeEventListener("pointerout", onOut, true);
      clearTimeout(dwell);
    };
  }, []);

  // the motion pass runs per page (pathname) after fonts are ready
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled || !curtain.current) return;
      cleanup = runMotion({ curtain: curtain.current, audio: getAudio() });
    });
    return () => { cancelled = true; cleanup?.(); };
  }, [pathname]);

  return (
    <div className="read">
      <Stars />
      <div className="glow" aria-hidden="true" />
      <div className="scan" aria-hidden="true" />
      {children}
      <div className="grain" aria-hidden="true" />
      <div ref={curtain} className="curtain" aria-hidden="true" />
    </div>
  );
}
