"use client";
// All eight planets in one canvas. Hovering names the project in `#strip-name`, clicking opens it, and
// the numbers beneath (rendered by the server) highlight in sync.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { projects as staticProjects, type Project } from "@/data/portfolio";
import { finePointer, whenQuiet, worthWebgl } from "@/lib/device";
import { pad2 } from "@/lib/text";
import type { PlanetStripApi } from "@/lib/three/types";

// `projects` comes from the server page (the database); the static records are the fallback.
export default function PlanetStrip({ projects = staticProjects }: { projects?: readonly Project[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [hover, setHover] = useState(-1);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let strip: PlanetStripApi | null = null;
    let cancelled = false;
    // The strip is decorative and three.js is ~700 kB, so it is skipped where that cost is not worth
    // paying: coarse pointers, data saver, low core counts, and reduced-motion. The numbered links
    // below it stay, so nothing is lost but the render.
    if (!worthWebgl() || !finePointer()) { el.classList.add("is-off"); return; }
    // A fixed 900 ms fired while the page was still downloading on a slow link. Waiting for the load
    // to finish and the main thread to go quiet puts it after the content instead of alongside it.
    const stopWaiting = whenQuiet(() => void boot(el), 4000);
    async function boot(target: HTMLCanvasElement): Promise<void> {
      try {
        const { createPlanetStrip } = await import("@/lib/three/planet-view");
        if (cancelled) return;
        strip = createPlanetStrip({
          canvas: target,
          projects,
          onPick: (p) => router.push(`/read/projects/${p.id}`),
          onHover: (_p, i) => setHover(i),
        });
      } catch {
        target.classList.add("is-off");
      }
    }
    return () => { cancelled = true; stopWaiting(); strip?.dispose(); };
  }, [router, projects]);

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
