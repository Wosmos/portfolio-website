"use client";
// All eight planets in one canvas. Hovering names the project in `#strip-name`, clicking opens it, and
// the numbers beneath (rendered by the server) highlight in sync.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { projects } from "@/data/portfolio";
import { pad2 } from "@/lib/text";
import type { PlanetStripApi } from "@/lib/three/types";

export default function PlanetStrip() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [hover, setHover] = useState(-1);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let strip: PlanetStripApi | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const { createPlanetStrip } = await import("@/lib/three/planet-view");
        if (cancelled) return;
        strip = createPlanetStrip({
          canvas: el,
          projects,
          onPick: (p) => router.push(`/read/projects/${p.id}`),
          onHover: (_p, i) => setHover(i),
        });
      } catch {
        el.classList.add("is-off");
      }
    })();
    return () => { cancelled = true; strip?.dispose(); };
  }, [router]);

  const hovered = projects[hover];
  return (
    <>
      <span className="k" style={{ marginTop: 6 }}>
        the eight planets · <b id="strip-name">{hovered ? `${hovered.title} · ${hovered.tagline}` : "hover one"}</b>
      </span>
      <canvas ref={canvas} className="strip" aria-label="The eight project planets" />
      <div className="strip__n">
        {projects.map((p, i) => (
          <a
            key={p.id}
            href={`/read/projects/${p.id}`}
            title={p.title}
            className={i === hover ? "is-on" : undefined}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(-1)}
            onClick={(e) => { e.preventDefault(); router.push(`/read/projects/${p.id}`); }}
          >
            {pad2(i + 1)}
          </a>
        ))}
      </div>
    </>
  );
}
