"use client";
// Mounts a real shader planet into every `canvas[data-planet]` the server rendered. With `cutaway` it
// also wires the "cut it open" button and builds the layer callouts from the view's own layer data.

import { useEffect } from "react";
import { projects } from "@/data/portfolio";
import { getAudio } from "@/lib/sound-client";
import { hex } from "@/lib/text";
import type { PlanetViewApi } from "@/lib/three/types";

const LANG_DESC: Readonly<Record<string, string>> = {
  TypeScript: "app + api code", JavaScript: "scripts", Go: "backend services", Rust: "native / wasm",
  Python: "services + tooling", Shell: "cli + install scripts", PowerShell: "windows installer",
  HTML: "markup", CSS: "styling", Ruby: "homebrew formula", SQL: "schema + queries", Other: "everything else",
};

export default function PlanetCanvases({ cutaway = false }: { cutaway?: boolean }) {
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const offs: Array<() => void> = [];

    void (async () => {
      try {
        const { mountPlanets } = await import("@/lib/three/planet-view");
        if (cancelled) return;
        const audio = getAudio();
        const cutBtn = cutaway ? document.querySelector<HTMLButtonElement>("#cutbtn") : null;
        const callouts = cutaway ? document.querySelector<HTMLElement>("#callouts") : null;
        const hint = cutaway ? document.querySelector<HTMLElement>("#planet-hint") : null;
        const label = cutBtn?.querySelector<HTMLElement>(".sf__in") ?? null;

        const mounted = mountPlanets(projects, {
          cutaway,
          onCut: (on) => {
            if (label) label.textContent = on ? "close it" : "cut it open";
            if (callouts) callouts.hidden = !on;
            if (hint) hint.hidden = on;
            if (on) audio.chord();
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
        // no WebGL (or the chunk failed): leave the canvases as decorative empties
        for (const c of document.querySelectorAll<HTMLCanvasElement>("canvas[data-planet]")) c.classList.add("is-off");
      }
    })();

    return () => { cancelled = true; for (const off of offs) off(); dispose?.(); };
  }, [cutaway]);

  return null;
}
