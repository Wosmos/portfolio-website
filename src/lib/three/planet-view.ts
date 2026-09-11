// Small planet renderers for the reading site: one project per canvas (drag to turn, optional cutaway)
// and one canvas holding all eight as a row. Both reuse `makeBody` from scene.ts, so a planet here is
// the same shader body the flight deck flies to. Ported from the prototype's planet-view.js.

import * as THREE from "three";
import { applyCut, disposeTree, makeBody, moonRadius, stepMoon, type Body } from "./scene";
import type {
  Layer, MoonConfig, MountOptions, PlanetStripApi, PlanetStripOptions, PlanetViewApi, PlanetViewOptions, ProjectFull,
} from "./types";

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

export function createPlanetView({ canvas, project, index = 0, interactive = true, cutaway = false, fit = 1, onCut, onHover, onMoonHover, onMoonPick }: PlanetViewOptions): PlanetViewApi {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  // no scene config here, so makeBody caps the radius against the default star — a stored size can
  // never draw a planet bigger than the sun on this side of the site either. `moons: true` is the only
  // override, and it changes nothing else: every other field is left undefined and falls through.
  const b = makeBody(project, index, { moons: true });
  // the sun is at the origin: put the body far along +z and the camera between the two, slightly above,
  // so the lit hemisphere faces us with the light over our shoulder
  const P = new THREE.Vector3(0, 0, 80);
  b.root.position.copy(P);
  scene.add(b.root);
  const extent = b.size * (b.cfg.ring ? b.extent * 0.98 : b.extent) * fit;
  // Off the sun's axis on purpose. Looking straight down the light leaves the whole disc lit, which is
  // what made these read as marbles: no terminator, no shape. From here roughly two thirds of the face
  // is lit and the rest falls into night, which is the single strongest cue that it is a sphere.
  const camDir = new THREE.Vector3(0.86, 0.3, -0.42).normalize();
  const dist = (): number => (extent / Math.tan(((camera.fov / 2) * Math.PI) / 180)) * (camera.aspect < 1 ? 1 / camera.aspect : 1) * 0.94;
  const placeCamera = (): void => { camera.position.copy(P).addScaledVector(camDir, dist()); camera.lookAt(P); };

  const reduced = reducedMotion();
  let hot = 0, wantHot = 0, spinT = Math.random() * 6, orbT = 0, yaw = 0, pitch = 0.12, vyaw = 0, vpitch = 0;
  let dragging = false, visible = true, alive = true, raf = 0;
  const t0 = performance.now();
  let last = t0;
  const cut = b.cut;
  const tmp = new THREE.Vector3(), ringQ = new THREE.Quaternion(), cutQ = new THREE.Quaternion();
  const cx = new THREE.Vector3(), cz = new THREE.Vector3();
  // moons: hot is what the pointer is on, lit is what a legend row asked for — either one brightens it
  let moonHot = -1, moonLit = -1, moonsHidden = false;
  const moonW = new THREE.Vector3();

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
    if (cut.target <= 0 && !reduced) spinT += dt * b.spinRate * (interactive ? 1 : 0.7);
    if (!reduced) orbT += dt;                                    // the moons' clock, so reduced motion parks them
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
    // Moons. The wedge would read a passing moon as debris inside the planet, so an open cutaway hides
    // them outright. `stepMoon` takes the world centre off the moon's matrix, which is what makes this
    // view's own `root.rotation.x` show up in the shadow and earthshine the planet shader computes.
    moonsHidden = cut.amount > 0.002 || cut.target > 0;
    if (b.moons.length > 0) {
      if (b.moonRoot) b.moonRoot.visible = !moonsHidden;
      const shadows = u.uMoons.value;
      for (let k = 0; k < b.moons.length; k++) {
        const mn = b.moons[k];
        mn.want = !moonsHidden && (k === moonHot || k === moonLit) ? 1 : 0;
        stepMoon(mn, orbT, dt, P, b.size, hot, moonW);
        const wr = moonsHidden ? 0 : moonRadius(mn, 1);
        shadows[k * 4] = moonW.x; shadows[k * 4 + 1] = moonW.y; shadows[k * 4 + 2] = moonW.z; shadows[k * 4 + 3] = wr;
      }
    }
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

  // Which moon is under a screen point. The meshes are raycast first, so what you see is what you
  // pick; a moon only a few pixels across gets a screen-space second pass, because on a card a moon is
  // 4 px wide and a fingertip is 40. The back side is excluded either way — the planet is in front of it.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const mw = new THREE.Vector3();
  function moonAtPoint(clientX: number, clientY: number): number {
    if (b.moons.length === 0 || moonsHidden) return -1;
    const r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return -1;
    const x = clientX - r.left, y = clientY - r.top;
    ndc.set((x / r.width) * 2 - 1, -(y / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const planetHit: THREE.Intersection | undefined = ray.intersectObject(b.planet, false)[0];
    const planetD = planetHit ? planetHit.distance : Infinity;
    let best = -1, bestD = Infinity;
    for (let k = 0; k < b.moons.length; k++) {
      const hit: THREE.Intersection | undefined = ray.intersectObject(b.moons[k].mesh, false)[0];
      if (hit && hit.distance < planetD && hit.distance < bestD) { bestD = hit.distance; best = k; }
    }
    if (best >= 0) return best;
    const tan2 = 2 * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    const camD = camera.position.distanceTo(P);
    let near = -1, nearD = Infinity;
    for (let k = 0; k < b.moons.length; k++) {
      const mn = b.moons[k];
      mn.mesh.getWorldPosition(mw);
      const dist = mw.distanceTo(camera.position);
      if (dist > camD) continue;                                   // round the back: unreachable, as it looks
      mw.project(camera);
      if (mw.z >= 1) continue;
      const sx = (mw.x * 0.5 + 0.5) * r.width, sy = (-mw.y * 0.5 + 0.5) * r.height;
      const grab = Math.max((moonRadius(mn, 1) * r.height) / (tan2 * dist), 6) + 5;
      const d = Math.hypot(sx - x, sy - y);
      if (d <= grab && d < nearD) { nearD = d; near = k; }
    }
    return near;
  }

  // interaction
  const off: Array<() => void> = [];
  if (interactive) {
    let px = 0, py = 0, moved = 0;
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    const setMoonHot = (k: number): void => {
      if (k === moonHot) return;
      moonHot = k;
      const mn = k >= 0 ? b.moons[k] : null;
      canvas.style.cursor = mn ? "pointer" : dragging ? "grabbing" : "grab";
      // the canvas is the only element a moon has, so the tooltip is where it says it is a target
      if (mn) canvas.title = `${mn.cfg.name}${mn.cfg.path ? ` · /${mn.cfg.path}` : ""} — open on github`;
      else canvas.removeAttribute("title");
      onMoonHover?.(mn ? mn.cfg : null, k);
    };
    const enter = (): void => { wantHot = 1; onHover?.(true); };
    const leave = (): void => { wantHot = 0; setMoonHot(-1); onHover?.(false); };
    // a drag, and a tap that opened a moon, must not also count as a click on the card link around us
    const blockClick = (): void => {
      const block = (ev: Event): void => { ev.preventDefault(); ev.stopPropagation(); };
      window.addEventListener("click", block, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", block, { capture: true }), 0);
    };
    const down = (e: PointerEvent): void => {
      setMoonHot(moonAtPoint(e.clientX, e.clientY));                // touch has no hover: the press is the aim
      dragging = true; moved = 0; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = moonHot >= 0 ? "pointer" : "grabbing";
    };
    const move = (e: PointerEvent): void => {
      if (!dragging) { setMoonHot(moonAtPoint(e.clientX, e.clientY)); return; }
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vyaw = dx * 0.006; vpitch = dy * 0.004; yaw += vyaw; pitch += vpitch;
    };
    const up = (e: PointerEvent): void => {
      if (!dragging) return;
      dragging = false; canvas.style.cursor = moonHot >= 0 ? "pointer" : "grab";
      if (moved < 6) {
        // a cancelled pointer is the browser taking the gesture: never open a tab off one
        const pick = e.type === "pointerup" ? onMoonPick : undefined;
        const mn = moonHot >= 0 ? b.moons[moonHot] : null;
        if (pick && mn) { blockClick(); pick(mn.cfg, moonHot); return; }
        if (cutaway) api.toggleCut();
        return;
      }
      blockClick();
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

  const moonCfgs: readonly MoonConfig[] = b.moons.map((mn) => mn.cfg);
  const api: PlanetViewApi = {
    get cutOpen() { return cut.target > 0; },
    get layers(): readonly Layer[] { return cut.layers; },
    get moons(): readonly MoonConfig[] { return moonCfgs; },
    setCut(on: boolean) { cut.target = on ? 1 : 0; onCut?.(on); },
    toggleCut() { api.setCut(cut.target <= 0); },
    setHot(v: boolean) { wantHot = v ? 1 : 0; },
    highlightLayer(k: number) { cut.shells.forEach((m, i) => { m.material.uniforms.uHi.value = i === k ? 1 : 0; }); },
    highlightMoon(k: number) { moonLit = k; },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      for (const fn of off) fn();
      canvas.removeAttribute("title");
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
export function mountPlanets(projects: readonly ProjectFull[], { cutaway = false, onMoonHover, onMoonPick, ...opts }: MountOptions = {}): MountedPlanets {
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-planet]")).filter((c) => projects.some((p) => p.id === c.dataset.planet));
  const views: (PlanetViewApi | null)[] = new Array<PlanetViewApi | null>(canvases.length).fill(null);
  const queue: HTMLCanvasElement[] = [];
  let pumping = false, raf = 0, disposed = false;

  const build = (c: HTMLCanvasElement): void => {
    const i = projects.findIndex((p) => p.id === c.dataset.planet);
    const project = projects[i];
    if (!project) return;
    const view = createPlanetView({
      canvas: c, project, index: i, cutaway, ...opts,
      onMoonHover: onMoonHover && ((m, k) => onMoonHover(project, m, k)),
      onMoonPick: onMoonPick && ((m, k) => onMoonPick(project, m, k)),
    });
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

/**
 * All eight planets in one canvas, in a row, sized to a common cell — one renderer, not eight.
 *
 * No moons here, deliberately: the cell normalises each planet to about 20 px, which puts a moon at 3 px
 * and its orbit — 2 to 4 planet radii — well inside the neighbouring planet's cell. They would read as
 * dirt on the glass and collide with the body next door, and each distinct moon count is another planet
 * shader variant to compile on the home page, which is the one page the strip has to stay cheap on.
 */
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
    const base = makeBody(p, i);   // same size cap as the deck; the cell then normalises what is left
    const extent = base.size * (base.cfg.ring ? base.extent * 0.78 : 1 + base.atmoT);  // rings may overflow the cell a little
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
      if (!reduced) b.spinT += dt * b.stripSpinRate;
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
