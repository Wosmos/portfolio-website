"use client";
// Mounts a real shader planet into every `canvas[data-planet]` the server rendered. three.js is ~700 kB,
// so the chunk is not requested until a canvas is actually near the viewport: a visitor who never
// reaches the projects pays nothing. With `cutaway` this also wires the "cut it open" button and
// builds the layer callouts from the view's own layer data.

import { useEffect } from "react";
import { projects as staticProjects, type Project } from "@/data/portfolio";
import { ev } from "@/lib/analytics";
import { getAudio } from "@/lib/sound-client";
import { hex } from "@/lib/text";
import type { PlanetViewApi } from "@/lib/three/types";

const LANG_DESC: Readonly<Record<string, string>> = {
  TypeScript: "app + api code", JavaScript: "scripts", Go: "backend services", Rust: "native / wasm",
  Python: "services + tooling", Shell: "cli + install scripts", PowerShell: "windows installer",
  HTML: "markup", CSS: "styling", Ruby: "homebrew formula", SQL: "schema + queries", Other: "everything else",
};

// `projects` comes from the server page (the database); the static records are the fallback.
export default function PlanetCanvases({ cutaway = false, projects = staticProjects }: { cutaway?: boolean; projects?: readonly Project[] }) {
  useEffect(() => {
    const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-planet]"));
    if (!canvases.length) return;

    let dispose: (() => void) | undefined;
    let cancelled = false, started = false;
    const offs: Array<() => void> = [];

    async function start(): Promise<void> {
      if (started || cancelled) return;
      started = true;
      try {
        const { mountPlanets } = await import("@/lib/three/planet-view");
        if (cancelled) return;
        const audio = getAudio();
        const cutBtn = cutaway ? document.querySelector<HTMLButtonElement>("#cutbtn") : null;
        const callouts = cutaway ? document.querySelector<HTMLElement>("#callouts") : null;
        const hint = cutaway ? document.querySelector<HTMLElement>("#planet-hint") : null;
        const label = cutBtn?.querySelector<HTMLElement>(".sf__in") ?? null;
        const firstId = canvases[0]?.dataset.planet ?? "";

        const mounted = mountPlanets(projects, {
          cutaway,
          onCut: (on) => {
            if (label) label.textContent = on ? "close it" : "cut it open";
            if (callouts) callouts.hidden = !on;
            if (hint) hint.hidden = on;
            if (on) { audio.chord(); ev("cutaway", { id: firstId, where: "read" }); }
          },
        });
        dispose = () => mounted.dispose();

        if (!cutaway || !cutBtn) return;
        const view: PlanetViewApi | null = await mounted.whenReady(0);
        if (cancelled || !view) return;
        const onBtn = (): void => view.toggleCut();
        cutBtn.addEventListener("click", onBtn);
        offs.push(() => cutBtn.removeEventListener("click", onBtn));

        if (callouts) {
          callouts.replaceChildren(
            ...view.layers.map((L, k) => {
              const b = document.createElement("button");
              b.type = "button";
              b.dataset.k = String(k);
              b.style.setProperty("--c", hex(L.color));
              const name = document.createElement("b"); name.textContent = L.name;
              const pct = document.createElement("i"); pct.textContent = `${L.pct.toFixed(1)}%`;
              const desc = document.createElement("small"); desc.textContent = LANG_DESC[L.name] ?? "";
              b.append(name, pct, desc);
              b.addEventListener("pointerenter", () => { view.highlightLayer(k); b.classList.add("is-on"); });
              b.addEventListener("pointerleave", () => { view.highlightLayer(-1); b.classList.remove("is-on"); });
              return b;
            }),
          );
          offs.push(() => callouts.replaceChildren());
        }
      } catch {
        // no WebGL, or the chunk failed: leave the canvases as decorative empties
        for (const c of canvases) c.classList.add("is-off");
      }
    }

    // a wide margin so the chunk is in flight before the first canvas is on screen
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); void start(); }
    }, { rootMargin: "700px" });
    for (const c of canvases) io.observe(c);

    return () => { cancelled = true; io.disconnect(); for (const off of offs) off(); dispose?.(); };
  }, [cutaway, projects]);

  return null;
}
