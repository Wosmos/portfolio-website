// A single project planet in its own small canvas — the same shader body the flight deck flies to
// (makeBody in ship/scene.js), lit from the sun's direction, spinning, drag-to-rotate, hover glow,
// optional cutaway on click. Renders only while on screen. Used by the reading site.

import * as THREE from "three";
import { makeBody } from "./ship/scene.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);

export function createPlanetView({ canvas, project, index = 0, interactive = true, cutaway = false, fit = 1, onCut, onHover }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  const b = makeBody(project, index);
  // the sun is at the origin: put the body far along +z and the camera between the two, slightly above,
  // so the lit hemisphere faces us with the light over our shoulder
  const P = new THREE.Vector3(0, 0, 80); b.root.position.copy(P); scene.add(b.root);
  const extent = b.size * (b.ring ? b.cfg.ring.outer * 0.98 : 1.22) * fit;
  const camDir = new THREE.Vector3(0.42, 0.34, -1).normalize();
  const dist = () => extent / Math.tan((camera.fov / 2) * Math.PI / 180) * (camera.aspect < 1 ? 1 / camera.aspect : 1) * 1.05;
  function placeCamera() { camera.position.copy(P).addScaledVector(camDir, dist()); camera.lookAt(P); }

  // state
  let hot = 0, wantHot = 0, spinT = Math.random() * 6, yaw = 0, pitch = 0.12, vyaw = 0, vpitch = 0, dragging = false, visible = true, alive = true, t0 = performance.now();
  const cut = b.cut; cut.target = 0; cut.tm = 0;
  const tmp = new THREE.Vector3(), ringQ = new THREE.Quaternion();

  function resize() {
    const w = canvas.clientWidth || 200, h = canvas.clientHeight || 200;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); placeCamera();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: "80px" }); io.observe(canvas);

  let last = performance.now();
  function frame(now) {
    if (!alive) return; requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;   // real elapsed time, so slow frames do not slow the animation
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    hot += (wantHot - hot) * 0.12;
    // spin + user rotation with inertia
    if (!dragging) { vyaw *= 0.92; vpitch *= 0.9; yaw += vyaw; pitch += vpitch; pitch += (0.12 - pitch) * (Math.abs(vpitch) < 0.0005 ? 0.02 : 0); }
    if (!(cut.target > 0) && !reduced) spinT += dt * (0.22 + (index % 3) * 0.07) * (interactive ? 1 : 0.7);
    pitch = Math.max(-0.9, Math.min(0.9, pitch));
    b.spin.rotation.y = spinT + yaw; b.root.rotation.x = pitch;
    b.planet.material.uniforms.uTime.value = t; b.planet.material.uniforms.uHot.value = hot; b.atmo.material.uniforms.uHot.value = hot;
    // cutaway (same easing as the deck: 1.4 s open, 0.9 s close)
    const spd = cut.target > 0 ? 1 / 1.4 : 1 / 0.9; cut.tm = clamp01(cut.tm + (cut.target > 0 ? dt : -dt) * spd); cut.amount = smoother(cut.tm);
    if (cut.amount > 0.002 || cut.target > 0) {
      if (!cut.group.visible) cut.group.visible = true;
      if (cut.target > 0 && cut.tm < 0.3) { tmp.subVectors(camera.position, P).setY(0).normalize(); cut.group.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 4; }
      const q = new THREE.Quaternion(); cut.group.getWorldQuaternion(q);
      const cx = new THREE.Vector3(1, 0, 0).applyQuaternion(q), cz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      const setCut = (u) => { u.uCut.value = cut.amount; u.uCutC.value.copy(P); u.uCutX.value.copy(cx); u.uCutZ.value.copy(cz); };
      setCut(b.planet.material.uniforms); setCut(b.atmo.material.uniforms);
      for (const m of cut.shells) { setCut(m.material.uniforms); m.material.uniforms.uAlpha.value = Math.min(1, cut.amount * 3); m.material.uniforms.uTime.value = t; }
      for (const f of cut.faces) f.material.uniforms.uAlpha.value = Math.min(1, cut.amount * 3);
      cut.faceH.material.uniforms.uSpan.value = cut.amount; cut.faceB.rotation.y = -cut.amount * Math.PI / 2;
    } else if (cut.group.visible) { cut.group.visible = false; b.planet.material.uniforms.uCut.value = 0; b.atmo.material.uniforms.uCut.value = 0; }
    b.atmo.visible = !(cut.amount > 0.6);
    if (b.ring) {
      const u = b.planet.material.uniforms;
      b.ring.material.uniforms.uHot.value = hot; b.ring.material.uniforms.uPlanet.value.copy(P); b.ring.material.uniforms.uPlanetR.value = b.size;
      b.ring.getWorldQuaternion(ringQ); u.uRingN.value.set(0, 0, 1).applyQuaternion(ringQ);
      u.uPlanetC.value.copy(P); u.uRingIn.value = b.size * b.cfg.ring.inner; u.uRingOut.value = b.size * b.cfg.ring.outer;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // interaction
  let px = 0, py = 0, moved = 0;
  if (interactive) {
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerenter", () => { wantHot = 1; onHover?.(true); });
    canvas.addEventListener("pointerleave", () => { wantHot = 0; onHover?.(false); });
    canvas.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
    canvas.addEventListener("pointermove", (e) => { if (!dragging) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vyaw = dx * 0.006; vpitch = dy * 0.004; yaw += vyaw; pitch += vpitch; });
    const up = (e) => {
      if (!dragging) return; dragging = false; canvas.style.cursor = "grab";
      if (moved < 6) { if (cutaway) api.toggleCut(); return; }
      // a drag must not count as a click on the card link around the canvas
      const block = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      window.addEventListener("click", block, { capture: true, once: true }); setTimeout(() => window.removeEventListener("click", block, { capture: true }), 0);
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.style.cursor = "grab";
  }

  const api = {
    get cutOpen() { return cut.target > 0; },
    setCut(on) { cut.target = on ? 1 : 0; onCut?.(!!on); },
    toggleCut() { api.setCut(!(cut.target > 0)); },
    layers: cut.layers,
    setHot(v) { wantHot = v ? 1 : 0; },
    highlightLayer(k) { cut.shells.forEach((m, i) => (m.material.uniforms.uHi.value = i === k ? 1 : 0)); },
    dispose() { alive = false; ro.disconnect(); io.disconnect(); renderer.dispose(); },
  };
  return api;
}

// Mount a planet into every `[data-planet]` canvas on the page (data-planet = project id).
// Views are created lazily — one per frame, and only once the canvas is near the viewport — so eight
// shader compiles never land in the same frame. Returns the views in document order (created or not
// yet); `whenReady(view)` resolves once a view exists for that canvas.
export function mountPlanets(projects, { cutaway = false, ...opts } = {}) {
  const canvases = [...document.querySelectorAll("canvas[data-planet]")].filter((c) => projects.some((p) => p.id === c.dataset.planet));
  const views = new Array(canvases.length).fill(null); const queue = []; let pumping = false;
  const build = (c) => { const i = projects.findIndex((p) => p.id === c.dataset.planet); const v = createPlanetView({ canvas: c, project: projects[i], index: i, cutaway, ...opts }); views[canvases.indexOf(c)] = v; c.dispatchEvent(new CustomEvent("planet", { detail: v })); };
  const pump = () => { if (!queue.length) { pumping = false; return; } pumping = true; build(queue.shift()); requestAnimationFrame(pump); };
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); if (!queue.includes(e.target)) queue.push(e.target); } if (!pumping) requestAnimationFrame(pump); }, { rootMargin: "240px" });
  canvases.forEach((c) => io.observe(c));
  views.canvases = canvases;
  views.whenReady = (k = 0) => new Promise((res) => { if (views[k]) return res(views[k]); canvases[k]?.addEventListener("planet", (e) => res(e.detail), { once: true }); });
  return views;
}

// All eight planets in one canvas, in a row, sized to a common cell — one renderer, not eight.
// Click resolves to the nearest planet; `onPick(project, index)`.
export function createPlanetStrip({ canvas, projects, onPick, onHover }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 500);
  const Z = 80, CELL = 2.6; const n = projects.length;
  const bodies = [];
  const addBody = (i) => {
    const p = projects[i]; const b = makeBody(p, i);
    const extent = b.size * (b.ring ? b.cfg.ring.outer * 0.78 : 1.14);   // rings may overflow the cell a little
    const k = (CELL * 0.44) / extent;
    b.root.scale.setScalar(k * (0.85 + 0.15 * Math.min(1, p.weight ?? 0.6)));
    b.root.position.set(-(i - (n - 1) / 2) * CELL, 0, Z);   // camera looks along +z, so world −x is screen-right
    scene.add(b.root); b.hot = 0; b.want = 0; b.spinT = Math.random() * 6; b.i = i; bodies.push(b);
    if (i + 1 < n) requestAnimationFrame(() => addBody(i + 1));            // one shader compile per frame
  };
  addBody(0);
  const camDir = new THREE.Vector3(0.05, 0.28, -1).normalize(); const center = new THREE.Vector3(0, 0, Z);
  let hotIdx = -1, visible = true, alive = true; const t0 = performance.now();
  function resize() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 60; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const halfW = (CELL * n) / 2; const dist = halfW / Math.tan((camera.fov / 2) * Math.PI / 180) / camera.aspect * 1.04;
    camera.position.copy(center).addScaledVector(camDir, dist); camera.lookAt(center);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver((es) => (visible = es[0].isIntersecting), { rootMargin: "80px" }); io.observe(canvas);
  const ringQ = new THREE.Quaternion();
  let last = performance.now();
  (function frame(now) {
    if (!alive) return; requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    bodies.forEach((b) => { const i = b.i;
      b.want = i === hotIdx ? 1 : 0; b.hot += (b.want - b.hot) * 0.12; if (!reduced) b.spinT += dt * (0.3 + (i % 3) * 0.08);
      b.spin.rotation.y = b.spinT; b.root.rotation.x = 0.1;
      const u = b.planet.material.uniforms; u.uTime.value = t; u.uHot.value = b.hot; b.atmo.material.uniforms.uHot.value = b.hot;
      if (b.ring) { const sc = b.root.scale.x; b.ring.material.uniforms.uHot.value = b.hot; b.ring.material.uniforms.uPlanet.value.copy(b.root.position); b.ring.material.uniforms.uPlanetR.value = b.size * sc;
        b.ring.getWorldQuaternion(ringQ); u.uRingN.value.set(0, 0, 1).applyQuaternion(ringQ); u.uPlanetC.value.copy(b.root.position); u.uRingIn.value = b.size * b.cfg.ring.inner * sc; u.uRingOut.value = b.size * b.cfg.ring.outer * sc; }
    });
    renderer.render(scene, camera);
  })(performance.now());
  // pick by screen x: project each body centre, take the nearest
  const v = new THREE.Vector3();
  const indexAt = (clientX) => { const r = canvas.getBoundingClientRect(); const x = clientX - r.left; let best = -1, bd = 1e9;
    bodies.forEach((b) => { v.copy(b.root.position).project(camera); const sx = (v.x * 0.5 + 0.5) * r.width; const d = Math.abs(sx - x); if (d < bd) { bd = d; best = b.i; } }); return bd < r.width / n * 0.6 ? best : -1; };
  canvas.style.cursor = "pointer";
  canvas.addEventListener("pointermove", (e) => { const i = indexAt(e.clientX); if (i !== hotIdx) { hotIdx = i; onHover?.(i >= 0 ? projects[i] : null, i); canvas.style.cursor = i >= 0 ? "pointer" : "default"; } });
  canvas.addEventListener("pointerleave", () => { hotIdx = -1; onHover?.(null, -1); });
  canvas.addEventListener("click", (e) => { const i = indexAt(e.clientX); if (i >= 0) onPick?.(projects[i], i); });
  return { setHot(i) { hotIdx = i; }, get count() { return bodies.length; }, get visible() { return visible; }, dispose() { alive = false; ro.disconnect(); io.disconnect(); renderer.dispose(); } };
}
