"use client";
// The real planet renderer, driven by whatever the editor currently holds. Rebuilt on a short debounce
// so dragging a colour slider does not recompile a shader on every frame.

import { useEffect, useRef, useState } from "react";
import type { RingConfig, Project } from "@/data/portfolio";
import type { PlanetFull, PlanetViewApi } from "@/lib/three/types";

const PLACEHOLDER: Omit<Project, "planet"> = {
  id: "zcrypt", title: "preview", tagline: "", description: "", stack: [], category: "", context: "",
  year: null, weight: 1, github: "", live: null, langs: [["TypeScript", 100]],
};

// `PlanetConfig["type"]` already carries every surface the editor offers, `liquid` and `muddy` included,
// so a new type reaches the shader by being passed straight through — there is nothing to enumerate here.
/** The editor holds `ring: null` for "no ring", which is how the column stores it; the shader wants it absent. */
export type EditablePlanet = Omit<PlanetFull, "ring"> & { ring?: RingConfig | null };

export default function PlanetPreview({ planet, cutaway = false }: { planet: EditablePlanet; cutaway?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  // one JSON key: the effect should rerun on any value change, not on identity
  const key = JSON.stringify(planet);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let view: PlanetViewApi | null = null;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { createPlanetView } = await import("@/lib/three/planet-view");
          if (cancelled) return;
          const parsed = JSON.parse(key) as EditablePlanet;
          const config: PlanetFull = { ...parsed, ring: parsed.ring ?? undefined };
          view = createPlanetView({ canvas: el, project: { ...PLACEHOLDER, planet: config }, index: 0, cutaway });
        } catch { setFailed(true); }
      })();
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); view?.dispose(); };
  }, [key, cutaway]);

  // A missing shader branch for a brand-new surface fails the same way a missing WebGL context does, so
  // the copy names the type rather than blaming the browser.
  if (failed) return <p className="hint">the preview could not start — either WebGL is unavailable here, or the scene has no branch for a {planet.type} surface yet. The values still save.</p>;
  return <canvas ref={canvas} style={{ width: "100%", aspectRatio: "1 / 1", display: "block", cursor: "grab" }} aria-label="Planet preview" />;
}
