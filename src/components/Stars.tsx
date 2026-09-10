"use client";
// Canvas starfield with twinkle, slow drift and scroll parallax. Pure 2D — no WebGL on reading pages.

import { useEffect, useRef } from "react";

interface Star { x: number; y: number; z: number; r: number; a: number; p: number; s: number }

export default function Stars({ density = 2600, parallax = true }: { density?: number; parallax?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let list: Star[] = [], W = 0, H = 0, raf = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const seed = (): void => {
      W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
      const n = Math.round((innerWidth * innerHeight) / density);
      list = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() ** 2 * 0.8, r: Math.random() ** 3 * 1.6 * dpr + 0.3, a: 0.18 + Math.random() * 0.6, p: Math.random() * 6.28, s: 0.3 + Math.random() * 1.2 }));
    };
    const draw = (t: number): void => {
      g.clearRect(0, 0, W, H);
      const sy = parallax && !reduced ? scrollY * dpr : 0, dx = reduced ? 0 : t * 0.004;
      for (const s of list) {
        const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * s.s + s.p);
        const y = (((s.y - sy * s.z * 0.35) % H) + H) % H, x = (((s.x + dx * s.z) % W) + W) % W;
        g.globalAlpha = s.a * tw; g.fillStyle = s.r > 1.3 * dpr ? "#cfefff" : "#fff";
        g.beginPath(); g.arc(x, y, s.r, 0, 6.28); g.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    seed(); draw(0);
    addEventListener("resize", seed);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", seed); };
  }, [density, parallax]);
  return <canvas ref={ref} className="stars" aria-hidden="true" />;
}
