"use client";
// All eight planets in one canvas. Hovering names the project in `#strip-name`, clicking opens it, and
// the numbers beneath (rendered by the server) highlight in sync.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { projects as staticProjects, type Project } from "@/data/portfolio";
import { pad2 } from "@/lib/text";
import type { PlanetStripApi } from "@/lib/three/types";

interface SaveDataConnection { saveData?: boolean; effectiveType?: string }
function worthLoading(): boolean {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (!matchMedia("(pointer: fine)").matches) return false;
  const nav: Navigator & { connection?: SaveDataConnection; deviceMemory?: number } = navigator;
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /2g/.test(nav.connection.effectiveType)) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return false;
  return (nav.hardwareConcurrency ?? 8) > 2;
}

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
    if (!worthLoading()) { el.classList.add("is-off"); return; }
    // let the page paint and settle first, and never race the project planets
    const idle = window.setTimeout(() => void boot(el), 900);
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
    return () => { cancelled = true; clearTimeout(idle); strip?.dispose(); };
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
