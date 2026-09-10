"use client";
// Mounts a real shader planet into every `canvas[data-planet]` the server rendered. three.js is ~700 kB,
// so the chunk is not requested until a canvas is actually near the viewport: a visitor who never
// reaches the projects pays nothing. With `cutaway` this also wires the "cut it open" button and
// builds the layer callouts from the view's own layer data.
//
// Moons are wired here too, on every page: hovering one names it, and clicking one opens the folder it
// was detected from on GitHub. On the project page the server also renders a legend (`#moons`), and the
// rows and the moons light each other — the same two-way link the cutaway callouts have to their layers.

import { useEffect } from "react";
import { projects as staticProjects } from "@/data/portfolio";
import { ev } from "@/lib/analytics";
import { finePointer, whenQuiet, worthWebgl } from "@/lib/device";
import { getAudio } from "@/lib/sound-client";
import { hex } from "@/lib/text";
import { moonUrl } from "@/lib/three/types";
import type { MoonConfig, PlanetViewApi, ProjectFull } from "@/lib/three/types";

const LANG_DESC: Readonly<Record<string, string>> = {
  TypeScript: "app + api code", JavaScript: "scripts", Go: "backend services", Rust: "native / wasm",
  Python: "services + tooling", Shell: "cli + install scripts", PowerShell: "windows installer",
  HTML: "markup", CSS: "styling", Ruby: "homebrew formula", SQL: "schema + queries", Other: "everything else",
};

// how many card planets a coarse-pointer device is asked to render at once
const MOBILE_LIVE_PLANETS = 2;

// `projects` comes from the server page (the database); the static records are the fallback.
export default function PlanetCanvases({ cutaway = false, projects = staticProjects }: { cutaway?: boolean; projects?: readonly ProjectFull[] }) {
  useEffect(() => {
    const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-planet]"));
    if (!canvases.length) return;

    // The chunk is ~170 kB over the wire and ~600 kB to parse, and each view compiles shaders. Where
    // that cannot be afforded the CSS leaves a lit disc in the canvas, which is what it looked like
    // before the shader ran anyway.
    if (!worthWebgl()) { for (const c of canvases) c.classList.add("is-off"); return; }

    // A phone's viewport is a fraction of a desktop's, so the desktop head start is most of the page
    // ahead; and eight live WebGL contexts is more than a phone should be asked to hold at once. The
    // live set is always a leading run, so each planet keeps the index its look is derived from.
    const fine = finePointer();
    const cap = fine || cutaway ? canvases.length : MOBILE_LIVE_PLANETS;
    const live = canvases.slice(0, cap);
    for (const c of canvases.slice(cap)) c.classList.add("is-off");
    const liveIds = new Set(live.map((c) => c.dataset.planet));
    const mountable = liveIds.size === projects.length ? projects : projects.filter((p) => liveIds.has(p.id));

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
        // only the project page renders a legend; on a card the moon's own tooltip is all there is
        const moonsEl = document.querySelector<HTMLElement>("#moons");
        const moonName = document.querySelector<HTMLElement>("#moon-name");
        const moonRows = moonsEl ? Array.from(moonsEl.querySelectorAll<HTMLElement>("[data-moon]")) : [];
        const litRow = (k: number): void => { for (const r of moonRows) r.classList.toggle("is-on", Number(r.dataset.moon) === k); };
        const nameMoon = (m: MoonConfig | null): void => {
          if (!moonName) return;
          moonName.textContent = m ? `${m.name}${m.path ? ` \u00b7 /${m.path}` : ""}` : "";
          moonName.hidden = m === null;
        };

        const mounted = mountPlanets(mountable, {
          cutaway,
          onCut: (on) => {
            if (label) label.textContent = on ? "close it" : "cut it open";
            if (callouts) callouts.hidden = !on;
            if (hint) hint.hidden = on;
            if (on) { audio.chord(); ev("cutaway", { id: firstId, where: "read" }); }
          },
          onMoonHover: (_p, m, k) => { litRow(k); nameMoon(m); },
          // a moon is a folder in the repository, so that is where a click on one goes
          onMoonPick: (p, m) => { audio.click(); ev("moon_open", { id: p.id, folder: m.path || m.name }); window.open(moonUrl(p.github, m), "_blank", "noopener,noreferrer"); },
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

        for (const row of moonRows) {
          const k = Number(row.dataset.moon);
          const on = (): void => { view.highlightMoon(k); row.classList.add("is-on"); nameMoon(view.moons[k] ?? null); };
          const offRow = (): void => { view.highlightMoon(-1); row.classList.remove("is-on"); nameMoon(null); };
          row.addEventListener("pointerenter", on);
          row.addEventListener("pointerleave", offRow);
          offs.push(() => { row.removeEventListener("pointerenter", on); row.removeEventListener("pointerleave", offRow); });
        }
      } catch {
        // no WebGL, or the chunk failed: leave the canvases as decorative empties
        for (const c of canvases) c.classList.add("is-off");
      }
    }

    // A margin wide enough that the chunk is in flight before the first canvas is on screen, but on a
    // short viewport 700 px was two screens of head start and put the fetch in the same queue as the
    // content.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); void start(); }
    }, { rootMargin: fine ? "700px" : "250px" });
    const arm = (): void => { if (!cancelled) for (const c of live) io.observe(c); };
    // The project page's planet is what that page is about and can be cut open, so it is armed at once.
    // The cards' planets are decoration: they wait for the load to finish and the thread to go quiet,
    // rather than putting 170 kB of WebGL in the same queue as the text somebody came to read.
    let stopWaiting: (() => void) | undefined;
    if (cutaway) arm(); else stopWaiting = whenQuiet(arm, 4000);

    return () => { cancelled = true; stopWaiting?.(); io.disconnect(); for (const off of offs) off(); dispose?.(); };
  }, [cutaway, projects]);

  return null;
}
