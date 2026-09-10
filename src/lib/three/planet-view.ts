// Small planet renderers for the reading site: one project per canvas (drag to turn, optional cutaway)
// and one canvas holding all eight as a row. Both reuse `makeBody` from scene.ts, so a planet here is
// the same shader body the flight deck flies to. Ported from the prototype's planet-view.js.

import * as THREE from "three";
import { applyCut, disposeTree, makeBody, type Body } from "./scene";
import type { Layer, PlanetStripApi, PlanetStripOptions, PlanetViewApi, PlanetViewOptions } from "./types";
import type { Project } from "@/data/portfolio";

const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smoother = (u: number): number => u * u * u * (u * (u * 6 - 15) + 10);

function makeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  return renderer;
}

export function createPlanetView({ canvas, project, index = 0, interactive = true, cutaway = false, fit = 1, onCut, onHover }: PlanetViewOptions): PlanetViewApi {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  const b = makeBody(project, index);
  // the sun is at the origin: put the body far along +z and the camera between the two, slightly above,
  // so the lit hemisphere faces us with the light over our shoulder
  const P = new THREE.Vector3(0, 0, 80);
  b.root.position.copy(P);
  scene.add(b.root);
  const extent = b.size * (b.cfg.ring ? b.cfg.ring.outer * 0.98 : 1.22) * fit;
  const camDir = new THREE.Vector3(0.42, 0.34, -1).normalize();
  const dist = (): number => (extent / Math.tan(((camera.fov / 2) * Math.PI) / 180)) * (camera.aspect < 1 ? 1 / camera.aspect : 1) * 1.05;
  const placeCamera = (): void => { camera.position.copy(P).addScaledVector(camDir, dist()); camera.lookAt(P); };

  const reduced = reducedMotion();
  let hot = 0, wantHot = 0, spinT = Math.random() * 6, yaw = 0, pitch = 0.12, vyaw = 0, vpitch = 0;
  let dragging = false, visible = true, alive = true, raf = 0;
  const t0 = performance.now();
  let last = t0;
  const cut = b.cut;
  const tmp = new THREE.Vector3(), ringQ = new THREE.Quaternion(), cutQ = new THREE.Quaternion();
  const cx = new THREE.Vector3(), cz = new THREE.Vector3();

  function resize(): void {
    const w = canvas.clientWidth || 200, h = canvas.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    placeCamera();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true; }, { rootMargin: "80px" });
  io.observe(canvas);

  function frame(now: number): void {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;  // real elapsed time: slow frames must not slow the motion
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    hot += (wantHot - hot) * 0.12;
    if (!dragging) { vyaw *= 0.92; vpitch *= 0.9; yaw += vyaw; pitch += vpitch; if (Math.abs(vpitch) < 0.0005) pitch += (0.12 - pitch) * 0.02; }
    if (cut.target <= 0 && !reduced) spinT += dt * (0.22 + (index % 3) * 0.07) * (interactive ? 1 : 0.7);
    pitch = Math.max(-0.9, Math.min(0.9, pitch));
    b.spin.rotation.y = spinT + yaw;
    b.root.rotation.x = pitch;
    const u = b.planet.material.uniforms;
    u.uTime.value = t; u.uHot.value = hot;
    b.atmo.material.uniforms.uHot.value = hot;
    // cutaway: same easing as the deck (1.4 s open, 0.9 s close)
    const spd = cut.target > 0 ? 1 / 1.4 : 1 / 0.9;
    cut.tm = clamp01(cut.tm + (cut.target > 0 ? dt : -dt) * spd);
    cut.amount = smoother(cut.tm);
    if (cut.amount > 0.002 || cut.target > 0) {
      if (!cut.group.visible) cut.group.visible = true;
      if (cut.target > 0 && cut.tm < 0.3) { tmp.subVectors(camera.position, P).setY(0).normalize(); cut.group.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 4; }
      cut.group.getWorldQuaternion(cutQ);
      cx.set(1, 0, 0).applyQuaternion(cutQ); cz.set(0, 0, 1).applyQuaternion(cutQ);
      applyCut(u, cut.amount, P, cx, cz);
      applyCut(b.atmo.material.uniforms, cut.amount, P, cx, cz);
      for (const m of cut.shells) { applyCut(m.material.uniforms, cut.amount, P, cx, cz); m.material.uniforms.uAlpha.value = Math.min(1, cut.amount * 3); m.material.uniforms.uTime.value = t; }
      for (const f of cut.faces) f.material.uniforms.uAlpha.value = Math.min(1, cut.amount * 3);
      cut.faceH.material.uniforms.uSpan.value = cut.amount;
      cut.faceB.rotation.y = (-cut.amount * Math.PI) / 2;
    } else if (cut.group.visible) {
      cut.group.visible = false;
      u.uCut.value = 0;
      b.atmo.material.uniforms.uCut.value = 0;
    }
    b.atmo.visible = cut.amount <= 0.6;
    if (b.ring && b.cfg.ring) {
      const ru = b.ring.material.uniforms;
      ru.uHot.value = hot; ru.uPlanet.value.copy(P); ru.uPlanetR.value = b.size;
      b.ring.getWorldQuaternion(ringQ);
      u.uRingN.value.set(0, 0, 1).applyQuaternion(ringQ);
      u.uPlanetC.value.copy(P);
      u.uRingIn.value = b.size * b.cfg.ring.inner;
      u.uRingOut.value = b.size * b.cfg.ring.outer;
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // interaction
  const off: Array<() => void> = [];
  if (interactive) {
    let px = 0, py = 0, moved = 0;
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    const enter = (): void => { wantHot = 1; onHover?.(true); };
    const leave = (): void => { wantHot = 0; onHover?.(false); };
    const down = (e: PointerEvent): void => { dragging = true; moved = 0; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; };
    const move = (e: PointerEvent): void => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vyaw = dx * 0.006; vpitch = dy * 0.004; yaw += vyaw; pitch += vpitch;
    };
    const up = (): void => {
      if (!dragging) return;
      dragging = false; canvas.style.cursor = "grab";
      if (moved < 6) { if (cutaway) api.toggleCut(); return; }
      // a drag must not count as a click on the card link around the canvas
      const block = (ev: Event): void => { ev.preventDefault(); ev.stopPropagation(); };
      window.addEventListener("click", block, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", block, { capture: true }), 0);
    };
    canvas.addEventListener("pointerenter", enter);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    off.push(() => {
      canvas.removeEventListener("pointerenter", enter); canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
    });
  }

  const api: PlanetViewApi = {
    get cutOpen() { return cut.target > 0; },
    get layers(): readonly Layer[] { return cut.layers; },
    setCut(on: boolean) { cut.target = on ? 1 : 0; onCut?.(on); },
    toggleCut() { api.setCut(cut.target <= 0); },
    setHot(v: boolean) { wantHot = v ? 1 : 0; },
    highlightLayer(k: number) { cut.shells.forEach((m, i) => { m.material.uniforms.uHi.value = i === k ? 1 : 0; }); },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      for (const fn of off) fn();
      disposeTree(scene);
      renderer.dispose();
    },
  };
  return api;
}

export interface MountedPlanets {
  readonly views: readonly (PlanetViewApi | null)[];
  whenReady(k?: number): Promise<PlanetViewApi | null>;
  dispose(): void;
}
/**
 * Mounts a view into every `canvas[data-planet]` on the page. Views are built lazily — one per frame,
 * and only once the canvas nears the viewport — so eight shader compiles never land in one frame.
 */
export function mountPlanets(projects: readonly Project[], { cutaway = false, ...opts }: Omit<PlanetViewOptions, "canvas" | "project" | "index"> = {}): MountedPlanets {
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-planet]")).filter((c) => projects.some((p) => p.id === c.dataset.planet));
  const views: (PlanetViewApi | null)[] = new Array<PlanetViewApi | null>(canvases.length).fill(null);
  const queue: HTMLCanvasElement[] = [];
  let pumping = false, raf = 0, disposed = false;

  const build = (c: HTMLCanvasElement): void => {
    const i = projects.findIndex((p) => p.id === c.dataset.planet);
    const project = projects[i];
    if (!project) return;
    const view = createPlanetView({ canvas: c, project, index: i, cutaway, ...opts });
    views[canvases.indexOf(c)] = view;
    c.dispatchEvent(new CustomEvent<PlanetViewApi>("planet", { detail: view }));
  };
  const pump = (): void => {
    if (disposed) return;
    const next = queue.shift();
    if (!next) { pumping = false; return; }
    pumping = true;
    build(next);
    raf = requestAnimationFrame(pump);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || !(e.target instanceof HTMLCanvasElement)) continue;
      io.unobserve(e.target);
      if (!queue.includes(e.target)) queue.push(e.target);
    }
    if (!pumping) raf = requestAnimationFrame(pump);
  }, { rootMargin: "240px" });
  for (const c of canvases) io.observe(c);

  return {
    views,
    whenReady(k = 0) {
      const existing = views[k];
      if (existing) return Promise.resolve(existing);
      const canvas = canvases[k];
      if (!canvas) return Promise.resolve(null);
      return new Promise<PlanetViewApi | null>((resolve) => {
        canvas.addEventListener("planet", (e) => { resolve(e instanceof CustomEvent ? (e.detail as PlanetViewApi) : null); }, { once: true });
      });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      for (const v of views) v?.dispose();
    },
  };
}

interface StripBody extends Body { i: number; hot: number; want: number; spinT: number }

/** All eight planets in one canvas, in a row, sized to a common cell — one renderer, not eight. */
export function createPlanetStrip({ canvas, projects, onPick, onHover }: PlanetStripOptions): PlanetStripApi {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 500);
  const Z = 80, CELL = 2.6, n = projects.length;
  const reduced = reducedMotion();
  const bodies: StripBody[] = [];
  let alive = true, visible = true, hotIdx = -1, raf = 0, buildRaf = 0;

  const addBody = (i: number): void => {
    const p = projects[i];
    if (!alive || !p) return;
    const base = makeBody(p, i);
    const extent = base.size * (base.cfg.ring ? base.cfg.ring.outer * 0.78 : 1.14);  // rings may overflow the cell a little
    const k = (CELL * 0.44) / extent;
    base.root.scale.setScalar(k * (0.85 + 0.15 * Math.min(1, p.weight)));
    base.root.position.set(-(i - (n - 1) / 2) * CELL, 0, Z);  // the camera looks along +z, so world −x is screen-right
    scene.add(base.root);
    bodies.push({ ...base, i, hot: 0, want: 0, spinT: Math.random() * 6 });
    if (i + 1 < n) buildRaf = requestAnimationFrame(() => addBody(i + 1));  // one shader compile per frame
  };
  addBody(0);

  const camDir = new THREE.Vector3(0.05, 0.28, -1).normalize();
  const centre = new THREE.Vector3(0, 0, Z);
  function resize(): void {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 60;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfW = (CELL * n) / 2;
    const dist = (halfW / Math.tan(((camera.fov / 2) * Math.PI) / 180) / camera.aspect) * 1.04;
    camera.position.copy(centre).addScaledVector(camDir, dist);
    camera.lookAt(centre);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true; }, { rootMargin: "80px" });
  io.observe(canvas);

  const ringQ = new THREE.Quaternion();
  const t0 = performance.now();
  let last = t0;
  function frame(now: number): void {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    for (const b of bodies) {
      b.want = b.i === hotIdx ? 1 : 0;
      b.hot += (b.want - b.hot) * 0.12;
      if (!reduced) b.spinT += dt * (0.3 + (b.i % 3) * 0.08);
      b.spin.rotation.y = b.spinT;
      b.root.rotation.x = 0.1;
      const u = b.planet.material.uniforms;
      u.uTime.value = t; u.uHot.value = b.hot;
      b.atmo.material.uniforms.uHot.value = b.hot;
      if (b.ring && b.cfg.ring) {
        const sc = b.root.scale.x, ru = b.ring.material.uniforms;
        ru.uHot.value = b.hot; ru.uPlanet.value.copy(b.root.position); ru.uPlanetR.value = b.size * sc;
        b.ring.getWorldQuaternion(ringQ);
        u.uRingN.value.set(0, 0, 1).applyQuaternion(ringQ);
        u.uPlanetC.value.copy(b.root.position);
        u.uRingIn.value = b.size * b.cfg.ring.inner * sc;
        u.uRingOut.value = b.size * b.cfg.ring.outer * sc;
      }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // pick by screen x: project each body centre, take the nearest
  const v = new THREE.Vector3();
  const indexAt = (clientX: number): number => {
    const r = canvas.getBoundingClientRect(), x = clientX - r.left;
    let best = -1, bd = Infinity;
    for (const b of bodies) {
      v.copy(b.root.position).project(camera);
      const sx = (v.x * 0.5 + 0.5) * r.width, d = Math.abs(sx - x);
      if (d < bd) { bd = d; best = b.i; }
    }
    return bd < (r.width / n) * 0.6 ? best : -1;
  };
  canvas.style.cursor = "pointer";
  const move = (e: PointerEvent): void => {
    const i = indexAt(e.clientX);
    if (i === hotIdx) return;
    hotIdx = i;
    onHover?.(i >= 0 ? projects[i] ?? null : null, i);
    canvas.style.cursor = i >= 0 ? "pointer" : "default";
  };
  const leave = (): void => { hotIdx = -1; onHover?.(null, -1); };
  const click = (e: MouseEvent): void => { const i = indexAt(e.clientX); const p = projects[i]; if (i >= 0 && p) onPick?.(p, i); };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("click", click);

  return {
    setHot(i: number) { hotIdx = i; },
    get count() { return bodies.length; },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf); cancelAnimationFrame(buildRaf);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("click", click);
      disposeTree(scene);
      renderer.dispose();
    },
  };
}
