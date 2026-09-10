// The system — a fixed, full-viewport three.js scene the whole page lives in. Plain three.js,
// framework-free, written so each piece ports 1:1 into R3F. No GSAP here: the host drives
// `body.mix` (system ⇄ list), `setScroll(k)` (camera pose along the page) and the flights.

import * as THREE from "three";
import { LANG_COLORS } from "../data.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BG = 0x06060a;
const WHITE = new THREE.Color(0xfafafa);
const NEON_B = new THREE.Color(0x00e5ff);
const NEON_A = new THREE.Color(0xff2bd6);
const UP = new THREE.Vector3(0, 1, 0);

const SUN_R = 6.0;
const PLANET_SCALE = 1.0;
const ORBITS = [17, 25, 34, 45, 58, 73, 90, 110];
const BELT_R = 65.5;
const FOV = 42;
const TYPE = { gas: 0, rocky: 1, lava: 2, ice: 3 };

// camera poses along the page — [phi (elevation), radius]; theta comes from the user's drag
const POSES = [
  [0.27, 132],  // works — the overview, low and far: the outer orbit fills the frame
  [0.15, 96],   // about — lower and closer, planets sweep past
  [0.50, 160],  // experience — high, looking down on the whole disc
  [0.07, 250],  // contact — far and edge-on, the sun burning through the plane
];

// ───────────────────────── shaders ─────────────────────────

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float f=0.0, a=0.5; for(int i=0;i<5;i++){ f+=a*snoise(p); p*=2.02; a*=0.5; } return f; }
`;

const V_WORLD = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec2 vUv;
void main(){
  vL = position; vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const CUT_GLSL = /* glsl */ `
uniform float uCut; uniform vec3 uCutC; uniform vec3 uCutX; uniform vec3 uCutZ;
bool inWedge(vec3 w){
  if (uCut <= 0.001) return false;
  vec3 d = w - uCutC;
  float x = dot(d, uCutX), y = d.y, z = dot(d, uCutZ);
  if (y < 0.0 || x < 0.0) return false;
  float ang = atan(z, x);                 // 0 at +X, π/2 at +Z
  return ang > -0.0001 && ang < uCut * 1.5707963;
}`;

const PLANET_FRAG = /* glsl */ `
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uRim;
uniform float uType; uniform float uSeed; uniform float uTime; uniform float uHot;
uniform float uOcean; uniform float uCloud; uniform float uCrater; uniform float uVein;
uniform float uRingOn; uniform vec3 uRingN; uniform vec3 uPlanetC; uniform float uRingIn; uniform float uRingOut;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
${CUT_GLSL}
void main(){
  if (inWedge(vW)) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(-vW);
  vec3 p = normalize(vL);
  vec3 q = p * 2.0 + uSeed;
  float w1 = fbm(q + vec3(0.0, uTime * 0.01, 0.0));
  vec3 warp = vec3(fbm(q + 1.7), fbm(q + 9.2), fbm(q + 4.1));
  float n = fbm(q * 1.6 + warp * 0.9);
  vec3 albedo = uC0; vec3 emissive = vec3(0.0); float rough = 0.6;
  if (uType < 0.5) {
    float lat = p.y + n * 0.07 + w1 * 0.04;
    float band  = sin(lat * 14.0 + uSeed) * 0.5 + 0.5;
    float band2 = sin(lat * 31.0 + n * 2.0 + 1.3) * 0.5 + 0.5;
    albedo = mix(mix(uC0, uC1, band), mix(uC2, uC3, band2), 0.3 + 0.2 * n);
    float storm = smoothstep(0.55, 0.85, fbm(q * 3.0 + warp));
    albedo = mix(albedo, uC3, storm * 0.3);
    rough = 0.35;
  } else if (uType < 1.5) {
    float h = n * 0.5 + 0.5 + w1 * 0.18;
    float ocean = smoothstep(uOcean + 0.02, uOcean - 0.02, h) * step(0.01, uOcean);
    vec3 land = mix(uC1, uC2, smoothstep(uOcean, uOcean + 0.28, h));
    land = mix(land, uC3, smoothstep(0.8, 0.92, h));
    float polar = smoothstep(0.74, 0.96, abs(p.y) + n * 0.06);
    land = mix(land, uC3, polar * 0.9);
    float cr = uCrater * smoothstep(0.62, 0.9, snoise(p * 9.0 + uSeed));
    land *= 1.0 - cr * 0.4;
    albedo = mix(land, uC0, ocean);
    rough = mix(0.75, 0.12, ocean);
  } else if (uType < 2.5) {
    float rock = n * 0.5 + 0.5;
    albedo = mix(uC0, uC1, rock);
    albedo = mix(albedo, uC2, smoothstep(0.6, 0.9, w1 * 0.5 + 0.5) * 0.5);
    float vein = 1.0 - smoothstep(0.0, 0.07, abs(snoise(q * 2.6 + warp * 0.6)));
    vein *= smoothstep(0.35, 0.7, fbm(q * 1.2 + 3.0) * 0.5 + 0.5);
    emissive = uC3 * vein * (1.1 + 0.35 * sin(uTime * 1.4 + n * 7.0)) * uVein;
    rough = 0.8;
  } else {
    float lat = p.y + n * 0.1;
    float band = sin(lat * 7.0 + uSeed) * 0.5 + 0.5;
    albedo = mix(uC0, uC1, band * 0.55 + n * 0.2);
    albedo = mix(albedo, uC2, smoothstep(0.6, 0.9, fbm(q * 2.0 + warp) * 0.5 + 0.5) * 0.7);
    rough = 0.3;
  }
  float cl = uCloud * smoothstep(0.48, 0.78, fbm(p * 3.5 + vec3(uTime * 0.025, 0.0, 0.0) + warp * 0.5 + 11.0) * 0.5 + 0.5);
  albedo = mix(albedo, vec3(0.96), cl);
  float nl = dot(N, L);
  float d = smoothstep(-0.12, 0.55, nl);
  if (uRingOn > 0.5) {                                        // the ring's shadow falls across the planet
    float denom = dot(L, uRingN);
    if (abs(denom) > 1e-3) {
      float tt = dot(uPlanetC - vW, uRingN) / denom;
      if (tt > 0.0) {
        float rr = length(vW + L * tt - uPlanetC);
        float rn = (rr - uRingIn) / max(0.001, uRingOut - uRingIn);
        float prof = smoothstep(0.24, 0.32, rn) * (1.0 - smoothstep(0.58, 0.63, rn)) + 0.7 * smoothstep(0.66, 0.7, rn) * (1.0 - smoothstep(0.93, 0.98, rn)) + 0.25 * smoothstep(0.0, 0.06, rn) * (1.0 - smoothstep(0.22, 0.3, rn));
        float inRing = smoothstep(uRingIn, uRingIn + 0.03, rr) * (1.0 - smoothstep(uRingOut - 0.03, uRingOut, rr));
        d *= 1.0 - 0.78 * inRing * clamp(prof, 0.0, 1.0);
      }
    }
  }
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), mix(72.0, 8.0, rough)) * (1.0 - rough) * 0.7;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 sunCol = vec3(1.0, 0.86, 0.76);
  vec3 col = albedo * (0.035 + d * 1.15) * sunCol + spec * sunCol;
  col += uRim * fres * (0.32 + uHot * 0.8) * (0.35 + 0.65 * d);
  col += uRim * pow(1.0 - max(dot(N, V), 0.0), 6.0) * 0.12;
  col += emissive;
  gl_FragColor = vec4(col, 1.0);
}`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uRim; uniform float uHot;
varying vec3 vN; varying vec3 vW;
${CUT_GLSL}
void main(){
  if (inWedge(vW)) discard;
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(-vW);
  float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.6);
  float day = 0.45 + 0.55 * smoothstep(-0.3, 0.5, dot(normalize(vN), L));
  gl_FragColor = vec4(uRim, f * (0.28 + uHot * 0.6) * day);
}`;

// planetary ring. RingGeometry UVs are Cartesian, so the radius is rebuilt from the local
// position; density + colour come from a generated 1-D profile (see ringProfile). Lit face is
// direct-lit, the unlit face forward-scatters in the thin regions, the planet casts a soft shadow.
const RING_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uInner; uniform float uOuter; uniform float uHot;
uniform vec3 uPlanet; uniform float uPlanetR; uniform float uSeed;
varying vec3 vW; varying vec3 vL; varying vec3 vN;
${NOISE}
void main(){
  float rr = length(vL.xy);
  float r = clamp((rr - uInner) / (uOuter - uInner), 0.0, 1.0);
  vec4 prof = texture2D(uMap, vec2(r, 0.5));
  float ang = atan(vL.y, vL.x);
  float grain = 0.93 + 0.07 * snoise(vec3(ang * 4.0, r * 60.0, uSeed));          // faint azimuthal texture
  float dens = prof.a * grain;
  vec3 L = normalize(-vW); vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN);
  float nl = dot(N, L), nv = dot(N, V);
  float sameSide = step(0.0, nl * nv);
  float direct = 0.5 + 0.5 * abs(nl);
  float scatter = 0.18 + 0.55 * (1.0 - dens) * pow(max(0.0, -dot(V, L)), 1.5);   // sun behind the ring → thin parts glow
  float shade = mix(scatter, direct, sameSide);
  vec3 toP = uPlanet - vW; float tp = dot(toP, L);
  vec3 closest = vW + L * max(tp, 0.0);
  float shadow = tp > 0.0 ? smoothstep(uPlanetR * 0.88, uPlanetR * 1.14, length(closest - uPlanet)) : 1.0;
  vec3 col = prof.rgb * shade * (0.12 + 0.88 * shadow) * (1.0 + uHot * 0.25);
  float alpha = dens * mix(0.5, 0.95, sameSide) * (0.9 + uHot * 0.1);
  gl_FragColor = vec4(col, alpha);
}`;

// cutaway: a layer shell (one per language, sorted by share, thickness ∝ share) — the wedge is
// removed and the inside face is rendered darker; molten grain so it reads as rock, not plastic
const SHELL_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uSeed; uniform float uTime; uniform float uAlpha; uniform float uHi;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
${CUT_GLSL}
void main(){
  if (inWedge(vW)) discard;
  vec3 N = normalize(vN); vec3 L = normalize(-vW); vec3 V = normalize(cameraPosition - vW);
  if (!gl_FrontFacing) N = -N;
  vec3 p = normalize(vL);
  float g1 = fbm(p * 5.0 + uSeed) * 0.5 + 0.5;
  float g2 = fbm(p * 18.0 + uSeed * 2.0) * 0.5 + 0.5;
  float veins = smoothstep(0.55, 0.9, g2) * 0.35;
  vec3 base = uColor * (0.55 + 0.6 * g1);
  base = mix(base, base * 1.5 + vec3(0.06), veins);            // hotter veins
  float d = max(0.0, dot(N, L));
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 24.0) * 0.3;
  vec3 col = base * (0.22 + 0.9 * d) + spec * uColor;
  col *= gl_FrontFacing ? 1.0 : 0.62;                             // inner faces darker
  col = mix(col, col * 1.6 + vec3(0.12), uHi);
  gl_FragColor = vec4(col, uAlpha);
}`;
// flat cut faces: concentric bands from a 1-D layer texture (radius → colour), lit flat
const FACE_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uR; uniform float uSeed; uniform float uAlpha; uniform float uSpan;
varying vec3 vL; varying vec3 vW; varying vec3 vN;
${NOISE}
void main(){
  float r = length(vL.xy) / uR;
  if (r > 1.0) discard;
  float ang = atan(vL.y, vL.x);
  if (uSpan < 1.5 && ang > uSpan * 1.5707963 + 0.0005) discard;
  vec4 c = texture2D(uMap, vec2(r, 0.5));
  // boundary lines: sample neighbours and darken where the band colour changes
  float e = 0.0025;
  vec3 c0 = texture2D(uMap, vec2(max(0.0, r - e), 0.5)).rgb, c1 = texture2D(uMap, vec2(min(1.0, r + e), 0.5)).rgb;
  float edge = clamp(length(c1 - c0) * 4.0, 0.0, 1.0);
  // material: coarse grain + fine grain, radial streaks toward the core
  float g1 = fbm(vec3(vL.xy * 4.0 / uR, uSeed)) * 0.5 + 0.5;
  float g2 = fbm(vec3(vL.xy * 16.0 / uR, uSeed + 3.0)) * 0.5 + 0.5;
  float streak = snoise(vec3(ang * 14.0, r * 40.0, uSeed)) * 0.5 + 0.5;
  vec3 col = c.rgb * (0.6 + 0.55 * g1) * (0.85 + 0.3 * g2) * (0.9 + 0.2 * streak);
  col *= 0.55 + 0.45 * r;                                          // deeper = darker (heat haze is drawn by the core glow, not here)
  col += c.rgb * smoothstep(0.86, 0.94, r) * 0.25;                 // bright rim just under the crust
  col = mix(col, vec3(0.02, 0.02, 0.03), edge * 0.9);              // dark seam at every layer boundary
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.0, 0.12, 0.12 - r) * 0.9;   // glowing core
  vec3 L = normalize(-vW);
  float lit = 0.62 + 0.38 * abs(dot(normalize(vN), L));
  gl_FragColor = vec4(col * lit, uAlpha);
}`;

const SUN_FRAG = /* glsl */ `
uniform vec3 uCore; uniform vec3 uEdge; uniform float uTime; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
void main(){
  vec3 p = normalize(vL);
  vec3 V = normalize(cameraPosition - vW);
  float g  = fbm(p * 4.0 + vec3(0.0, uTime * 0.05, 0.0));
  float g2 = fbm(p * 11.0 - vec3(uTime * 0.08, 0.0, 0.0)) * 0.5;
  float limb = pow(max(dot(normalize(vN), V), 0.0), 0.55);
  vec3 col = mix(uEdge, uCore, limb) * (0.92 + g * 0.5 + g2 * 0.3);
  float h = p.y * 0.5 + 0.5;
  float cut = smoothstep(0.38, 0.0, h);
  float stripe = 1.0 - 0.45 * cut * smoothstep(0.62, 0.66, fract((vW.y + uTime * 0.08) * 2.2));
  col *= stripe;
  gl_FragColor = vec4(col * 0.95 * uFade, 1.0);
}`;

const NEBULA_VERT = /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const NEBULA_FRAG = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uTint; uniform float uMix; uniform float uFade; uniform float uTime;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float n1 = fbm(d * 2.2 + 3.1 + uTime * 0.004);
  float n2 = fbm(d * 4.6 - 1.7 + n1 * 0.6);
  float cloud = smoothstep(0.1, 0.95, n1 * 0.6 + n2 * 0.55 + 0.25);
  vec3 col = mix(uA, uB, smoothstep(-0.3, 0.6, n2)) * cloud;
  col = mix(col, uTint * cloud * 0.4, uMix * 0.22);
  col *= 0.24 + 0.14 * smoothstep(-0.3, 0.5, d.y);
  gl_FragColor = vec4(col * uFade, 1.0);
}`;

const STAR_VERT = /* glsl */ `
attribute float aPhase; attribute float aSize; attribute vec3 aColor;
uniform float uTime; varying float vA; varying vec3 vC;
void main(){
  vC = aColor;
  float tw = 0.6 + 0.4 * sin(uTime * (0.8 + aPhase * 2.2) + aPhase * 6.2831);
  vA = tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (0.75 + 0.25 * tw) * (1150.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const STAR_FRAG = /* glsl */ `
uniform sampler2D uMap; varying float vA; varying vec3 vC;
void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); }`;

// the same stars as line segments: the head vertex sits on the star, the tail is pushed away from
// the vanishing point in screen space by uStretch — so every streak is a real star elongating
const STREAK_VERT = /* glsl */ `
attribute float aEnd; attribute vec3 aColor; attribute float aPhase;
uniform float uStretch; uniform vec2 uVanish; uniform float uTime;
varying float vA; varying vec3 vC;
void main(){
  vC = aColor;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uVanish;
  float len = length(d) + 1e-4;
  float jitter = 0.75 + 0.5 * fract(aPhase * 13.7);
  vec2 tail = ndc + (d / len) * uStretch * jitter * (0.25 + 0.9 * len);
  vA = aEnd > 0.5 ? 0.0 : 0.9;
  vec2 outNdc = aEnd > 0.5 ? tail : ndc;
  gl_Position = vec4(outNdc * clip.w, clip.z, clip.w);
}`;
const STREAK_FRAG = /* glsl */ `
uniform float uOpacity; varying float vA; varying vec3 vC;
void main(){ gl_FragColor = vec4(vC * 1.6, vA * uOpacity); }`;

const RGB_SHIFT = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 }, uVignette: { value: 0 }, uFlash: { value: 0 }, uDim: { value: 0 }, uGlow: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
  uniform sampler2D tDiffuse; uniform float uAmount; uniform float uVignette; uniform float uFlash; uniform float uDim; uniform float uGlow; uniform vec2 uCenter; varying vec2 vUv;
  void main(){
    vec2 d = vUv - 0.5;
    vec2 off = d * uAmount * (0.6 + length(d) * 2.4);
    float r = texture2D(tDiffuse, vUv + off).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv - off).b;
    float v = 1.0 - uVignette * smoothstep(0.3, 0.95, length(d) * 1.35);
    vec3 col = vec3(r, g, b) * v;
    col *= 1.0 - uDim;                                                                   // the world falls away inside the tunnel
    float gd = length((vUv - uCenter) * vec2(1.6, 1.0));
    col += vec3(0.62, 0.82, 1.0) * uGlow * (0.16 * exp(-gd * gd * 26.0) + 0.03 * exp(-gd * 5.0));  // light at the end of the tunnel
    col = mix(col, vec3(0.93, 0.97, 1.0), uFlash);
    gl_FragColor = vec4(col, 1.0);
  }`,
};

// radial motion blur toward the vanishing point of travel — 12 taps, only enabled in flight
const RADIAL_BLUR = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
  uniform sampler2D tDiffuse; uniform float uStrength; uniform vec2 uCenter; varying vec2 vUv;
  void main(){
    vec2 d = vUv - uCenter;
    float dist = length(d);
    vec2 step = d * uStrength * (0.35 + dist) / 12.0;
    vec3 acc = vec3(0.0); float wsum = 0.0;
    for (int i = 0; i < 12; i++) {
      float k = float(i) / 11.0;
      float wgt = 1.0 - k * 0.6;
      acc += texture2D(tDiffuse, vUv - step * float(i)).rgb * wgt; wsum += wgt;
    }
    gl_FragColor = vec4(acc / wsum, 1.0);
  }`,
};

// ───────────────────────── helpers ─────────────────────────

function discTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 1-D ring profile → RGBA texture along the radius: C / B / Cassini / A regions, ~40 overlaid
// ringlet frequencies, two dozen random gaps plus Encke, icy colour tinted by the planet's palette.
function ringProfile(cfg, seed) {
  const N = 2048, data = new Uint8Array(N * 4);
  let h = (seed * 7919) | 0; const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const regions = [[0.0, 0.27, 0.2], [0.29, 0.6, 0.95], [0.6, 0.645, 0.05], [0.645, 0.96, 0.62]];
  const gaps = [[0.86, 0.006, 0.95], [0.45, 0.004, 0.7]];
  for (let i = 0; i < 24; i++) gaps.push([0.05 + rnd() * 0.9, 0.0015 + rnd() * 0.006, 0.35 + rnd() * 0.6]);
  const waves = []; for (let k = 0; k < 40; k++) waves.push([30 + rnd() * 620, rnd() * 6.283, 0.02 + rnd() * 0.09]);
  const ca = new THREE.Color(cfg.ring.ca), cb = new THREE.Color(cfg.ring.cb), ice = new THREE.Color(0.88, 0.85, 0.8), tint = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = i / (N - 1);
    let d = 0; for (const [a, b, v] of regions) d += v * sm(a - 0.012, a + 0.012, r) * (1 - sm(b - 0.012, b + 0.012, r));
    let f = 1; for (const [fr, ph, amp] of waves) f += amp * Math.sin(r * fr + ph);
    f = Math.min(1.6, Math.max(0.2, f)) / 1.15;
    for (const [c, w, dep] of gaps) { const x = (r - c) / w; d *= 1 - dep * Math.exp(-x * x); }
    d = Math.min(1, Math.max(0, d * f)) * sm(0, 0.025, r) * (1 - sm(0.965, 1, r));
    const t = 0.5 + 0.5 * Math.sin(r * 41 + seed);
    tint.copy(ca).lerp(cb, t).lerp(ice, 0.42 + 0.35 * d);
    data[i * 4] = tint.r * 255; data[i * 4 + 1] = tint.g * 255; data[i * 4 + 2] = tint.b * 255; data[i * 4 + 3] = d * 255;
  }
  const tex = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat);
  tex.needsUpdate = true; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ── planet body builder — shared by the flight deck and the reading site's planet views ──
const sphereGeo = new THREE.SphereGeometry(1, 72, 72);
// cutaway builders
const cutUniforms = () => ({ uCut: { value: 0 }, uCutC: { value: new THREE.Vector3() }, uCutX: { value: new THREE.Vector3(1, 0, 0) }, uCutZ: { value: new THREE.Vector3(0, 0, 1) } });
function layerTexture(layers, size) {
  // radius 0 → 1: core outward. Crust = 6 %, the rest split by share (largest share = outermost, under the crust)
  const N = 1024, data = new Uint8Array(N * 4), col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = i / (N - 1); let L = layers[layers.length - 1];
    for (const l of layers) if (r >= l.r0 && r < l.r1) { L = l; break; }
    if (r >= 0.94) col.set(0x14171f); else { col.set(L.color); const k = layers.indexOf(L); col.offsetHSL(0, 0.06, (k % 2 ? -0.08 : 0.05)); }
    data[i * 4] = col.r * 255; data[i * 4 + 1] = col.g * 255; data[i * 4 + 2] = col.b * 255; data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat); t.needsUpdate = true; t.minFilter = t.magFilter = THREE.LinearFilter; return t;
}
function buildCutaway(p, size, i) {
  const group = new THREE.Group(); group.visible = false;
  const langs = (p.langs || [["Other", 100]]).slice().sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((a, l) => a + l[1], 0);
  // shells from the crust inward. Each language's share is its share of the sphere's VOLUME (that is what
  // the eye reads in a cross-section), so r = 0.94 · ∛(cumulative share from the core). Exactly the data,
  // but a 0.4 % language is a visible band instead of a dot.
  const layers = []; let cum = total;
  for (const [name, pct] of langs) { const r1 = 0.94 * Math.cbrt(cum / total); cum -= pct; const r0 = 0.94 * Math.cbrt(Math.max(0, cum) / total); layers.push({ name, pct, r0, r1, color: LANG_COLORS[name] ?? LANG_COLORS.Other }); }
  layers[layers.length - 1].r0 = 0;
  const shells = layers.map((L, k) => {
    const m = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ vertexShader: V_WORLD, fragmentShader: SHELL_FRAG, side: THREE.DoubleSide, transparent: true,
      uniforms: { uColor: { value: new THREE.Color(L.color) }, uSeed: { value: i * 3.1 + k }, uTime: { value: 0 }, uAlpha: { value: 0 }, uHi: { value: 0 }, ...cutUniforms() } }));
    m.scale.setScalar(size * L.r1 * 0.985); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1 - k; m.material.polygonOffsetUnits = -1; m.renderOrder = 2 + k; group.add(m); return m;
  });
  const tex = layerTexture(layers, size);
  const faceMat = (span) => new THREE.ShaderMaterial({ vertexShader: V_WORLD, fragmentShader: FACE_FRAG, side: THREE.DoubleSide, transparent: true,
    uniforms: { uMap: { value: tex }, uR: { value: size * 0.94 }, uSeed: { value: i * 5.7 }, uAlpha: { value: 0 }, uSpan: { value: span } } });
  const quarter = new THREE.CircleGeometry(size * 0.94 * 0.999, 96, 0, Math.PI / 2);
  const faceA = new THREE.Mesh(quarter, faceMat(2));                          // vertical face at angle 0 (plane z=0, x>0, y>0)
  const faceB = new THREE.Mesh(quarter, faceMat(2));                          // vertical face at the moving angle (rotates with uCut)
  const faceH = new THREE.Mesh(quarter, faceMat(0));                          // horizontal face (y=0), span follows uCut
  faceH.rotation.x = Math.PI / 2;                                              // local x→x, local y→+z (the wedge quadrant)
  faceB.rotation.y = 0;                                                        // set per frame
  for (const f of [faceA, faceB, faceH]) { f.renderOrder = 20; f.material.polygonOffset = true; f.material.polygonOffsetFactor = -12; f.material.polygonOffsetUnits = -4; group.add(f); }
  return { group, shells, faces: [faceA, faceB, faceH], faceH, faceB, layers, amount: 0, target: 0 };
}


// One project → one body: tilt/spin groups, shader planet, atmosphere shell, cutaway group, optional ring.
// Lighting comes from the world origin (the sun), so the body must sit away from (0,0,0).
export function makeBody(p, i) {
  const cfg = p.planet, size = cfg.size * PLANET_SCALE;
  const root = new THREE.Group();

  const tilt = new THREE.Group(); tilt.rotation.z = ((i * 0.37) % 0.6) - 0.3;
  const spin = new THREE.Group();
  tilt.add(spin); root.add(tilt);

  const mat = new THREE.ShaderMaterial({ vertexShader: V_WORLD, fragmentShader: PLANET_FRAG,
    uniforms: {
      uC0: { value: new THREE.Color(cfg.c0) }, uC1: { value: new THREE.Color(cfg.c1) }, uC2: { value: new THREE.Color(cfg.c2) }, uC3: { value: new THREE.Color(cfg.c3) },
      uRim: { value: new THREE.Color(cfg.rim) }, uType: { value: TYPE[cfg.type] ?? 0 }, uSeed: { value: i * 7.31 + 2.0 },
      uTime: { value: 0 }, uHot: { value: 0 }, uOcean: { value: cfg.ocean ?? 0 }, uCloud: { value: cfg.cloud ?? 0 }, uCrater: { value: cfg.crater ?? 0 }, uVein: { value: cfg.vein ?? 0 },
      uRingOn: { value: cfg.ring ? 1 : 0 }, uRingN: { value: new THREE.Vector3(0, 1, 0) }, uPlanetC: { value: new THREE.Vector3() }, uRingIn: { value: 0 }, uRingOut: { value: 0 },
      ...cutUniforms(),
    } });
  const planet = new THREE.Mesh(sphereGeo, mat); planet.scale.setScalar(size); planet.userData.index = i; spin.add(planet);
  const atmo = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ vertexShader: V_WORLD, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uRim: { value: new THREE.Color(cfg.rim) }, uHot: { value: 0 }, ...cutUniforms() } }));
  atmo.scale.setScalar(size * 1.14); atmo.userData.index = i; root.add(atmo);
  const cut = buildCutaway(p, size, i);
  root.add(cut.group);

  let ring = null;
  if (cfg.ring) {
    const inner = size * cfg.ring.inner, outer = size * cfg.ring.outer;
    ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 320, 1), new THREE.ShaderMaterial({ vertexShader: V_WORLD, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uMap: { value: ringProfile(cfg, i) }, uInner: { value: inner }, uOuter: { value: outer }, uHot: { value: 0 }, uPlanet: { value: new THREE.Vector3() }, uPlanetR: { value: size }, uSeed: { value: i * 3.7 } } }));
    ring.rotation.x = Math.PI / 2 + cfg.ring.tilt;
    tilt.add(ring);
  }
  return { root, tilt, spin, planet, atmo, ring, cut, size, cfg };
}
export { cutUniforms, TYPE, PLANET_SCALE };

const clamp01 = (x) => Math.min(1, Math.max(0, x));
// one flight profile, used in both directions so out and back are exact mirrors: a smooth
// build (no lurch), a broad peak, a smooth brake. speed01 = normalised |velocity|.
const flightCurve = (t) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); }; // smootherstep
const easeOut = flightCurve, easeBack = flightCurve;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function speedOf(fn, t) { const h = 0.002; return (fn(Math.min(1, t + h)) - fn(Math.max(0, t - h))) / (2 * h); }
const vmax = (fn) => { let m = 0; for (let i = 0; i <= 400; i++) m = Math.max(m, speedOf(fn, i / 400)); return m; };
const VMAX_OUT = vmax(easeOut), VMAX_BACK = vmax(easeBack);
// flight time grows with distance: a hop to the next orbit is short, crossing the system is long
const flightDuration = (dist) => Math.min(4.6, Math.max(1.5, 0.9 + dist * 0.0175));

// ───────────────────────── scene ─────────────────────────

export function createSystem({ canvas, labelsEl, projects, onSelect, onSunSelect, onFlightEvent, onBeltLevel, reducedMotion = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 4000);
  scene.add(camera);

  const disc = discTexture();
  const uFade = { value: 1 };
  const nebulaTint = new THREE.Color(NEON_A);

  // nebula sky
  const nebula = new THREE.Mesh(new THREE.SphereGeometry(1700, 48, 32),
    new THREE.ShaderMaterial({ vertexShader: NEBULA_VERT, fragmentShader: NEBULA_FRAG, side: THREE.BackSide, depthWrite: false,
      uniforms: { uA: { value: new THREE.Color(0x3b0764) }, uB: { value: new THREE.Color(0x0b2f6e) }, uTint: { value: nebulaTint }, uMix: { value: 0 }, uFade, uTime: { value: 0 } } }));
  scene.add(nebula);

  // twinkling stars
  const STARS = 4200;
  const sp = new Float32Array(STARS * 3), sc = new Float32Array(STARS * 3), sph = new Float32Array(STARS), ssz = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    const r = 620 + Math.random() * 640, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.cos(ph); sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const k = Math.random();
    const c = k < 0.07 ? NEON_B : k < 0.12 ? NEON_A : k < 0.3 ? new THREE.Color(0xcfd8ff) : k < 0.36 ? new THREE.Color(0xffe4c4) : WHITE;
    sc[i * 3] = c.r; sc[i * 3 + 1] = c.g; sc[i * 3 + 2] = c.b;
    sph[i] = Math.random(); ssz[i] = 0.9 + Math.pow(Math.random(), 3) * 3.2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute("aColor", new THREE.BufferAttribute(sc, 3));
  starGeo.setAttribute("aPhase", new THREE.BufferAttribute(sph, 1));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(ssz, 1));
  const starMat = new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uMap: { value: disc } } });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  // streak twin of the starfield (2 vertices per star)
  const lp = new Float32Array(STARS * 6), lc = new Float32Array(STARS * 6), le = new Float32Array(STARS * 2), lph = new Float32Array(STARS * 2);
  for (let i = 0; i < STARS; i++) for (let k = 0; k < 2; k++) {
    lp.set(sp.subarray(i * 3, i * 3 + 3), (i * 2 + k) * 3); lc.set(sc.subarray(i * 3, i * 3 + 3), (i * 2 + k) * 3);
    le[i * 2 + k] = k; lph[i * 2 + k] = sph[i];
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  streakGeo.setAttribute("aColor", new THREE.BufferAttribute(lc, 3));
  streakGeo.setAttribute("aEnd", new THREE.BufferAttribute(le, 1));
  streakGeo.setAttribute("aPhase", new THREE.BufferAttribute(lph, 1));
  const streakMat = new THREE.ShaderMaterial({ vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uStretch: { value: 0 }, uVanish: { value: new THREE.Vector2(0, 0) }, uOpacity: { value: 0 }, uTime: { value: 0 } } });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false; streaks.visible = false;
  stars.add(streaks); // inherits the slow sky rotation

  // sun
  const sunMat = new THREE.ShaderMaterial({ vertexShader: V_WORLD, fragmentShader: SUN_FRAG,
    uniforms: { uCore: { value: new THREE.Color(0xffc978) }, uEdge: { value: new THREE.Color(0xff2bd6) }, uTime: { value: 0 }, uFade } });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 96, 96), sunMat);
  sun.userData.sun = true;
  scene.add(sun);
  const coronaA = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: 0xff2bd6, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
  coronaA.scale.setScalar(SUN_R * 7.5);
  const coronaB = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: 0xffb06b, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  coronaB.scale.setScalar(SUN_R * 3.6);
  scene.add(coronaA, coronaB);
  const streakTex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 32; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "rgba(255,180,220,0)"); gr.addColorStop(0.5, "rgba(255,220,240,1)"); gr.addColorStop(1, "rgba(255,180,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 32); const gv = g.createLinearGradient(0, 0, 0, 32); gv.addColorStop(0, "rgba(0,0,0,1)"); gv.addColorStop(0.5, "rgba(0,0,0,0)"); gv.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gv; g.fillRect(0, 0, 512, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const anamorphic = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex, color: 0xff9be0, transparent: true, opacity: 0.35, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  anamorphic.scale.set(SUN_R * 22, SUN_R * 0.9, 1);
  scene.add(anamorphic);
  scene.add(new THREE.PointLight(0xffd9c0, 12500, 0, 2), new THREE.AmbientLight(0x2a2a44, 0.8));

  // orbit lines
  const rings = ORBITS.map((r) => {
    const pts = [];
    for (let i = 0; i < 360; i++) { const a = (i / 360) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const mat = new THREE.LineBasicMaterial({ color: WHITE.clone(), transparent: true, opacity: 0.1 });
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
    scene.add(line);
    return { line, mat, hot: 0 };
  });

  // asteroid belt
  const BELT = 2200;
  const belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x5a5e69, roughness: 0.95, metalness: 0.05, flatShading: true }), BELT);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
    for (let i = 0; i < BELT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = BELT_R + (Math.random() - 0.5) * 6.0 + (Math.random() - 0.5) * 3.5;
      pos.set(Math.cos(a) * r, (Math.random() - 0.5) * 2.2, Math.sin(a) * r);
      e.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28); q.setFromEuler(e);
      const k = 0.08 + Math.pow(Math.random(), 3) * 0.4; s.set(k, k * (0.6 + Math.random() * 0.8), k);
      m.compose(pos, q, s); belt.setMatrixAt(i, m);
    }
    belt.instanceMatrix.needsUpdate = true;
  }
  scene.add(belt);

  // comet — a head sprite trailing a fading line; crosses the sky every so often
  const COMET_N = 70;
  const cometPos = new Float32Array(COMET_N * 3), cometCol = new Float32Array(COMET_N * 3);
  const cometGeo = new THREE.BufferGeometry();
  cometGeo.setAttribute("position", new THREE.BufferAttribute(cometPos, 3));
  cometGeo.setAttribute("color", new THREE.BufferAttribute(cometCol, 3));
  const cometTrail = new THREE.Line(cometGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const cometHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: 0xdff6ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  cometHead.scale.setScalar(2.6);
  cometTrail.frustumCulled = false;
  scene.add(cometTrail, cometHead);
  const comet = { active: false, t: 0, dur: 7, from: new THREE.Vector3(), to: new THREE.Vector3(), next: 6 + Math.random() * 8, hist: [] };
  function spawnComet() {
    const a = Math.random() * Math.PI * 2, y = 25 + Math.random() * 70;
    comet.from.set(Math.cos(a) * 320, y, Math.sin(a) * 320);
    comet.to.set(Math.cos(a + 2.4 + Math.random()) * 320, y - 25 - Math.random() * 50, Math.sin(a + 2.4 + Math.random()) * 320);
    comet.t = 0; comet.active = true; comet.hist.length = 0; comet.dur = 6 + Math.random() * 4;
  }
  function updateComet(dt) {
    if (!comet.active) {
      comet.next -= dt;
      if (comet.next <= 0) { spawnComet(); comet.next = 14 + Math.random() * 16; }
      cometHead.visible = cometTrail.visible = false;
      return;
    }
    comet.t += dt / comet.dur;
    const e = comet.t;
    const p = new THREE.Vector3().lerpVectors(comet.from, comet.to, e);
    p.y += Math.sin(e * Math.PI) * 16;
    comet.hist.unshift(p.clone()); if (comet.hist.length > COMET_N) comet.hist.pop();
    const fade = Math.sin(Math.min(1, e) * Math.PI);
    for (let i = 0; i < COMET_N; i++) {
      const h = comet.hist[Math.min(i, comet.hist.length - 1)];
      cometPos[i * 3] = h.x; cometPos[i * 3 + 1] = h.y; cometPos[i * 3 + 2] = h.z;
      const k = (1 - i / COMET_N) * fade;
      cometCol[i * 3] = 0.55 * k; cometCol[i * 3 + 1] = 0.9 * k; cometCol[i * 3 + 2] = 1.0 * k;
    }
    cometGeo.attributes.position.needsUpdate = true; cometGeo.attributes.color.needsUpdate = true;
    cometHead.position.copy(p); cometHead.material.opacity = fade;
    cometHead.visible = cometTrail.visible = true;
    if (comet.t >= 1) comet.active = false;
  }

  // planets
  let domHot = -1;
  const bodies = projects.map((p, i) => {
    const r = ORBITS[i];
    const omega = 0.06 * Math.pow(ORBITS[0] / r, 1.5);
    const theta0 = (i * 2.399) % (Math.PI * 2);
    const { root, spin, planet, atmo, ring, cut, size } = makeBody(p, i);
    const pick = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    pick.scale.setScalar(Math.max(size * 1.3, 2.4)); pick.userData.index = i; root.add(pick);
    scene.add(root);

    const el = document.createElement("button");
    el.type = "button"; el.className = "lab";
    el.setAttribute("aria-label", `${p.title} — ${p.tagline}`);
    el.innerHTML = `<span class="lab__name">${p.title}</span><span class="lab__sub">${p.tagline}</span>`;
    el.tabIndex = -1;
    el.addEventListener("pointerenter", () => (domHot = i));
    el.addEventListener("pointerleave", () => (domHot = domHot === i ? -1 : domHot));
    el.addEventListener("click", (e) => { e.stopPropagation(); if (active && focusIdx < 0 && !sunFocus && !flight.active) onSelect?.(p); });
    labelsEl.appendChild(el);

    return { p, root, spin, planet, atmo, ring, pick, el, cut, theta0, size, r, omega, hot: 0, mix: 0,
      orbitPos: new THREE.Vector3(), stackPos: new THREE.Vector3(), pos: new THREE.Vector3() };
  });
  bodies.forEach((b, i) => { const t = bodies.length === 1 ? 0.5 : i / (bodies.length - 1); b.stackPos.set(-60, 32 - t * 64, 14); });

  const travelDir = new THREE.Vector3(0, 0, -1);

  // post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 0.8);
  composer.addPass(bloom);
  const blur = new ShaderPass(RADIAL_BLUR);
  blur.enabled = false;
  composer.addPass(blur);
  const rgb = new ShaderPass(RGB_SHIFT);
  composer.addPass(rgb);
  composer.addPass(new OutputPass());

  // ── camera model: spherical around the sun; theta from drag, phi/radius from the page pose
  const view = { theta: 0.35, vel: 0, phi: POSES[0][0], radius: POSES[0][1], fit: 1, scroll: 0, throttle: 0, phiOff: 0 };
  const camBase = new THREE.Vector3(), lookBase = new THREE.Vector3(0, -4, 0);
  function updateBase() {
    const k = Math.min(POSES.length - 1, Math.max(0, view.scroll));
    const i = Math.floor(k), f = k - i, a = POSES[i], b = POSES[Math.min(POSES.length - 1, i + 1)];
    view.phi = Math.min(1.2, Math.max(0.05, a[0] + (b[0] - a[0]) * f + view.phiOff));
    view.radius = (a[1] + (b[1] - a[1]) * f) * view.fit * (1 - 0.55 * view.throttle);
    camBase.set(Math.sin(view.theta) * Math.cos(view.phi) * view.radius, Math.sin(view.phi) * view.radius, Math.cos(view.theta) * Math.cos(view.phi) * view.radius);
  }
  updateBase();
  camera.position.copy(camBase);
  camera.lookAt(lookBase);

  // interaction: hover, click, drag-to-orbit
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-10, -10), pointer = new THREE.Vector2(0, 0);
  let rayHot = -1, hotHover = -1, hotIdx = -1, focusIdx = -1, sunHot = false, sunFocus = false;
  let active = false, dragging = false, dragMoved = false, dragX = 0, dragY = 0, lastDragX = 0, lastDragY = 0;
  let w = 1, h = 1; const w2 = () => w, h2 = () => h;
  const stage = canvas.parentElement;
  const setNdc = (e) => { const rect = canvas.getBoundingClientRect(); ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); pointer.copy(ndc); };
  stage.addEventListener("pointermove", (e) => {
    setNdc(e);
    if (dragging) {
      const dx = e.clientX - dragX, dy = e.clientY - dragY;
      if (Math.hypot(e.clientX - lastDragX, e.clientY - lastDragY) > 6) dragMoved = true;
      if (focusIdx >= 0) { inspect.yaw += dx * 0.006; inspect.pitch = Math.min(1.2, Math.max(-1.2, inspect.pitch + dy * 0.004)); }
      else { view.theta -= dx * 0.0045; view.vel = -dx * 0.0045; view.phiOff = Math.min(0.5, Math.max(-0.2, view.phiOff + dy * 0.002)); }
      dragX = e.clientX; dragY = e.clientY;
    }
  });
  stage.addEventListener("pointerleave", () => { ndc.set(-10, -10); rayHot = -1; sunHot = false; });
  canvas.addEventListener("pointerdown", (e) => { if (!active || sunFocus || flight.active) return; if (focusIdx >= 0 && !(bodies[focusIdx].cut.target > 0)) return; dragging = true; dragMoved = false; dragX = lastDragX = e.clientX; dragY = lastDragY = e.clientY; view.vel = 0; canvas.classList.add("is-dragging"); });
  addEventListener("pointerup", () => { dragging = false; canvas.classList.remove("is-dragging"); });
  const pickables = bodies.map((b) => b.pick);
  function pickAt() {
    raycaster.setFromCamera(ndc, camera);
    const sunHit = raycaster.intersectObject(sun, false)[0];
    const hits = raycaster.intersectObjects(pickables, false);
    let best = null;
    for (const hh of hits) {
      const b = bodies[hh.object.userData.index];
      const real = raycaster.ray.distanceToPoint(b.pos) <= b.size * b.root.scale.x * 1.15;
      if (sunHit && !real && hh.distance > sunHit.distance * 0.8) continue;
      if (!best || hh.distance < best.distance) best = hh;
    }
    if (best && (!sunHit || best.distance < sunHit.distance)) return { planet: bodies[best.object.userData.index].p };
    if (sunHit) return { sun: true };
    return null;
  }
  canvas.addEventListener("click", (e) => {
    if (dragMoved || !active || focusIdx >= 0 || sunFocus || flight.active) return;
    setNdc(e);
    const hit = pickAt();
    if (hit?.planet) onSelect?.(hit.planet);
    else if (hit?.sun) onSunSelect?.();
  });

  function resize() {
    const rect = stage.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w, h);
    camera.aspect = w / h;
    view.fit = Math.min(1.6, Math.max(1, 1.55 / camera.aspect));   // portrait: do not back off so far that planets vanish
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ── flight
  const flight = { active: false, stopped: false, t: 0, dur: 2.2, kind: "out", from: new THREE.Vector3(), to: new THREE.Vector3(), lookFrom: new THREE.Vector3(), lookTo: new THREE.Vector3(), onDone: null };
  let warp = 0, warpDir = 1, hyper = 1, tOrbit = 0, flash = 0, charge = 0, tunnel = 0, lurched = false, beltSide = 0, beltLevel = 0, tiltX = 0, tiltY = 0, flareT = 0, holdAngle = 0;
  const lookAhead = new THREE.Vector3(), lookPose = new THREE.Vector3(), vanish = new THREE.Vector3();
  const camPos = camera.position, lookCur = lookBase.clone();
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), right = new THREE.Vector3(), shake = new THREE.Vector3(), ringQ = new THREE.Quaternion();

  const inspect = { yaw: 0, pitch: 0 };
  function poseFor(b, outPos, outLook) {
    const P = b.pos, R = b.size;
    tmp.copy(P).negate().normalize().applyAxisAngle(UP, holdAngle + inspect.yaw);   // station-keeping drift + inspect yaw
    right.crossVectors(tmp.clone().negate(), UP).normalize();
    const dist = R * (b.ring ? 5.6 : 4.8);
    for (let k = 0; k < 8; k++) {
      outPos.copy(P).addScaledVector(tmp, dist);
      if (outPos.length() > SUN_R * 2.0) break;
      tmp.addScaledVector(right, 0.45).normalize();
    }
    outPos.addScaledVector(UP, R * (b.ring ? 1.6 : 1.15) + R * 4.8 * Math.sin(inspect.pitch));
    right.crossVectors(tmp.clone().negate(), UP).normalize();
    const cutOn = b.cut && b.cut.target > 0;
    outLook.copy(P).addScaledVector(right, cutOn ? R * 0.4 : R * 1.35).addScaledVector(UP, -R * 0.12);   // cutaway: centre the planet
  }
  function poseForSun(outPos, outLook) {
    tmp.copy(camPos).setY(0).normalize();
    right.crossVectors(tmp.clone().negate(), UP).normalize();
    outPos.copy(tmp).multiplyScalar(SUN_R * 3.4).addScaledVector(UP, SUN_R * 0.9);
    outLook.set(0, 0, 0).addScaledVector(right, SUN_R * 1.1);
  }
  const arcCtrl = new THREE.Vector3(), lookPoseStart = new THREE.Vector3();
  function startFlight(kind, toPos, toLook, onDone) {
    flight.from.copy(camPos); flight.lookFrom.copy(lookCur);
    flight.to.copy(toPos); flight.lookTo.copy(toLook);
    flight.t = 0; flight.active = true; flight.kind = kind; flight.onDone = onDone; flight.stopped = false;
    for (const b of bodies) b.cut.target = 0;
    const dist = flight.from.distanceTo(flight.to);
    flight.dur = reducedMotion ? 0.01 : flightDuration(dist);
    warpDir = kind === "out" ? 1 : -1;
    // arc: lift the midpoint above the plane and bow it away from the sun so the path never cuts through it
    arcCtrl.lerpVectors(flight.from, flight.to, 0.5);
    tmp.copy(arcCtrl).setY(0); const away = tmp.length() > 1 ? tmp.normalize() : new THREE.Vector3(1, 0, 0);
    arcCtrl.addScaledVector(UP, dist * 0.22).addScaledVector(away, dist * 0.18);
    beltSide = Math.sign(Math.hypot(camPos.x, camPos.z) - BELT_R);
    onFlightEvent?.(kind === "out" ? "launch" : "launchBack", { dur: flight.dur, dist });
  }
  function bezier(a, c, b, t, out) { const u = 1 - t; return out.set(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y, u * u * a.z + 2 * u * t * c.z + t * t * b.z); }
  function flyTo(id, onDone) {
    const idx = bodies.findIndex((b) => b.p.id === id);
    if (idx < 0) return false;
    focusIdx = idx; sunFocus = false; holdAngle = 0; inspect.yaw = 0; inspect.pitch = 0;
    poseFor(bodies[idx], camTarget, lookTarget);
    nebulaTint.copy(bodies[idx].planet.material.uniforms.uRim.value);
    startFlight("out", camTarget, lookTarget, onDone);
    return true;
  }
  function flyToSun(onDone) {
    focusIdx = -1; sunFocus = true;
    poseForSun(camTarget, lookTarget);
    nebulaTint.set(0xffb06b);
    startFlight("out", camTarget, lookTarget, onDone);
  }
  function unfocus(onDone) {
    if (focusIdx < 0 && !sunFocus && !flight.active) { onDone?.(); return; }
    focusIdx = -1; sunFocus = false;
    updateBase();
    startFlight("back", camBase, lookBase, onDone);
  }

  // ── frame loop
  let last = performance.now(), paused = false, raf = 0, t = 0;
  const scr = { x: 0, y: 0, z: 0 };
  function project(v) { tmp2.copy(v).project(camera); scr.x = (tmp2.x * 0.5 + 0.5) * w; scr.y = (-tmp2.y * 0.5 + 0.5) * h; scr.z = tmp2.z; }
  const fovRad = () => (camera.fov * Math.PI) / 360;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (paused) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reducedMotion) t += dt;
    const focused = focusIdx >= 0 || sunFocus;
    const orbiting = !focused && !flight.active;
    const cutOpen = focusIdx >= 0 && bodies[focusIdx].cut.target > 0;
    if (orbiting && !reducedMotion) tOrbit += dt * hyper;
    if (focusIdx >= 0 && !flight.active && !reducedMotion && !cutOpen) holdAngle += dt * 0.05;

    // drag inertia
    if (!dragging) { view.theta += view.vel; view.vel *= 0.92; }
    if (!focused && !flight.active && !dragging && !reducedMotion) view.theta += dt * 0.012; // slow idle drift
    updateBase();

    raycaster.setFromCamera(ndc, camera);
    rayHot = -1; sunHot = false;
    if (orbiting && active && !dragging) {
      const hit = pickAt();
      if (hit?.planet) rayHot = bodies.findIndex((b) => b.p === hit.planet);
      else if (hit?.sun) sunHot = true;
    }
    hotHover = domHot >= 0 ? domHot : rayHot;
    hotIdx = focusIdx >= 0 ? focusIdx : hotHover;
    canvas.style.cursor = rayHot >= 0 || sunHot ? "pointer" : dragging ? "grabbing" : orbiting && active ? "grab" : "";

    sunMat.uniforms.uTime.value = t;
    nebula.material.uniforms.uTime.value = t;
    starMat.uniforms.uTime.value = t;
    sun.rotation.y = t * 0.03;
    flareT += (0 - flareT) * Math.min(1, dt * 1.6);
    const pulse = (1 + 0.12 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3)) * (1 + 3.5 * flareT);
    coronaA.material.opacity = 0.12 * uFade.value * pulse * (sunHot ? 1.5 : 1);
    coronaB.material.opacity = 0.18 * uFade.value * pulse;
    coronaB.scale.setScalar(SUN_R * 3.6 * (0.98 + 0.03 * Math.sin(t * 1.7)));
    { tmp.set(0, 0, 0).project(camera); const off = Math.hypot(tmp.x, tmp.y); anamorphic.material.opacity = uFade.value * (0.13 + 0.5 * flareT) * (1 - clamp01(off * 0.9)) * (tmp.z < 1 ? 1 : 0); anamorphic.scale.x = SUN_R * (22 + 40 * flareT); }
    belt.rotation.y = tOrbit * 0.02;
    belt.visible = uFade.value > 0.4;
    if (!reducedMotion) { stars.rotation.y += dt * 0.0012; nebula.rotation.y += dt * 0.0008; }
    updateComet(reducedMotion ? 0 : dt);

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const th = b.theta0 + b.omega * tOrbit;
      b.orbitPos.set(Math.cos(th) * b.r, 0, Math.sin(th) * b.r);
      b.pos.lerpVectors(b.orbitPos, b.stackPos, b.mix);
      b.root.position.copy(b.pos);
      const want = i === hotIdx ? 1 : 0;
      b.hot += (want - b.hot) * Math.min(1, dt * 6);
      b.root.scale.setScalar((1 + 0.06 * b.hot) * (1 - 0.3 * b.mix));
      if (!(i === focusIdx && cutOpen)) b.spinT = (b.spinT ?? 0) + dt * (0.22 + (i % 3) * 0.07) * (i === focusIdx ? 1.4 : 1);
      b.spin.rotation.y = b.spinT ?? 0;
      b.planet.material.uniforms.uTime.value = t;
      // cutaway: ease toward target, orient the wedge to face the camera when it opens
      const c = b.cut;
      { const spd = c.target > 0 ? 1 / 1.4 : 1 / 0.9; c.tm = clamp01((c.tm ?? 0) + (c.target > 0 ? dt : -dt) * spd); const u = c.tm; c.amount = u * u * u * (u * (u * 6 - 15) + 10); }
      if (c.amount > 0.002 || c.target > 0) {
        if (!c.group.visible) { c.group.visible = true; }
        if (c.target > 0 && c.tm < 0.3) { tmp.subVectors(camPos, b.pos).setY(0).normalize(); c.group.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 4; }
        const q = c.group.quaternion; const cx = new THREE.Vector3(1, 0, 0).applyQuaternion(q), cz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        const setCut = (u) => { u.uCut.value = c.amount; u.uCutC.value.copy(b.pos); u.uCutX.value.copy(cx); u.uCutZ.value.copy(cz); };
        setCut(b.planet.material.uniforms); setCut(b.atmo.material.uniforms);
        for (const m of c.shells) { setCut(m.material.uniforms); m.material.uniforms.uAlpha.value = Math.min(1, c.amount * 3); m.material.uniforms.uTime.value = t; }
        for (const f of c.faces) f.material.uniforms.uAlpha.value = Math.min(1, c.amount * 3);
        c.faceH.material.uniforms.uSpan.value = c.amount;
        c.faceB.rotation.y = -c.amount * Math.PI / 2;
        c.group.scale.setScalar(b.root.scale.x > 0 ? 1 : 1);
      } else if (c.group.visible) { c.group.visible = false; b.planet.material.uniforms.uCut.value = 0; b.atmo.material.uniforms.uCut.value = 0; }
      b.planet.material.uniforms.uHot.value = b.hot;
      b.atmo.material.uniforms.uHot.value = b.hot; b.atmo.visible = !(b.cut && b.cut.amount > 0.6);
      if (b.ring) {
        const sc = b.root.scale.x, u = b.planet.material.uniforms;
        b.ring.material.uniforms.uHot.value = b.hot; b.ring.material.uniforms.uPlanet.value.copy(b.pos); b.ring.material.uniforms.uPlanetR.value = b.size * sc;
        b.ring.getWorldQuaternion(ringQ); u.uRingN.value.set(0, 0, 1).applyQuaternion(ringQ);
        u.uPlanetC.value.copy(b.pos); u.uRingIn.value = b.size * b.p.planet.ring.inner * sc; u.uRingOut.value = b.size * b.p.planet.ring.outer * sc;
      }

      project(b.pos);
      const px = (b.size * (b.ring ? 1.9 : 1.15) * h) / (2 * Math.tan(fovRad()) * b.pos.distanceTo(camPos));
      b.el.style.transform = `translate(${scr.x.toFixed(1)}px, ${(scr.y + px).toFixed(1)}px) translate(-50%, 8px)`;
      const show = orbiting && active && scr.z < 1 ? 1 : 0;
      const dcam = b.pos.distanceTo(camPos);
      const depth = i === hotIdx ? 1 : 1 - 0.5 * clamp01((dcam - view.radius * 0.95) / (view.radius * 0.5));
      b.el.style.opacity = String((1 - b.mix) * show * (1 - Math.max(warp, tunnel)) * depth);

      b.el.classList.toggle("is-hot", i === hotIdx);
    }
    rings.forEach((rg, i) => {
      rg.hot += (bodies[i].hot - rg.hot) * Math.min(1, dt * 6);
      rg.mat.opacity = (0.1 + 0.32 * rg.hot) * (1 - 0.75 * (1 - uFade.value));
      rg.mat.color.lerpColors(WHITE, NEON_B, rg.hot * 0.9);
    });

    // camera
    shake.set(0, 0, 0);
    if (flight.active) {
      flight.t = Math.min(1, flight.t + dt / flight.dur);
      const out = flight.kind === "out";
      const fn = out ? easeOut : easeBack;
      const e = fn(flight.t);
      bezier(flight.from, arcCtrl, flight.to, e, camPos);
      bezier(flight.from, arcCtrl, flight.to, Math.min(1, e + 0.01), tmp2);
      if (tmp2.distanceToSquared(camPos) > 1e-6) travelDir.subVectors(tmp2, camPos).normalize();
      warp = clamp01(speedOf(fn, flight.t) / (out ? VMAX_OUT : VMAX_BACK));
      tunnel = reducedMotion ? 0 : warp;
      charge = 0;
      const side = Math.sign(Math.hypot(camPos.x, camPos.z) - BELT_R);
      if (side !== beltSide && beltSide !== 0) onFlightEvent?.("belt");
      beltSide = side;
      // look: hold the departure view, turn into the direction of travel as speed builds, settle onto the destination pose as it brakes
      if (out) {
        lookPose.lerpVectors(flight.lookFrom, flight.lookTo, sstep(0.35, 0.9, flight.t));
        lookAhead.copy(camPos).addScaledVector(travelDir, 160);
        const wLook = sstep(0.06, 0.3, flight.t) * (1 - sstep(0.62, 0.9, flight.t));
        lookCur.lerpVectors(lookPose, lookAhead, wLook);
      } else {
        // going home: watch the planet fall away, then turn to the system as it comes into frame
        lookCur.lerpVectors(flight.lookFrom, flight.lookTo, sstep(0.3, 0.95, flight.t));
      }
      if (warp > 0.6 && !reducedMotion) shake.set((Math.random() - 0.5), (Math.random() - 0.5), 0).multiplyScalar(0.06 * (warp - 0.6));
      if (flight.t >= 1) {
        flight.active = false;
        onFlightEvent?.(out ? "arrive" : "home");
        const cb = flight.onDone; flight.onDone = null; cb?.();
      }
    } else {
      warp += (0 - warp) * Math.min(1, dt * 5);
      tunnel += (0 - tunnel) * Math.min(1, dt * 12);
      charge = 0;
      if (focusIdx >= 0) {
        const b = bodies[focusIdx];
        poseFor(b, camTarget, lookTarget);
        if (!(b.cut.target > 0)) camTarget.addScaledVector(right, pointer.x * b.size * 0.25).addScaledVector(UP, pointer.y * b.size * 0.15);
      } else if (sunFocus) {
        poseForSun(camTarget, lookTarget);
      } else {
        camTarget.copy(camBase);
        lookTarget.copy(lookBase);
        if (!dragging) { camTarget.x += (pointer.x + tiltX) * 3.6; camTarget.y += (pointer.y + tiltY) * 2.2; }
      }
      camPos.lerp(camTarget, Math.min(1, dt * (dragging ? 8 : 2.2)));
      lookCur.lerp(lookTarget, Math.min(1, dt * 2.2));
    }
    flash += (0 - flash) * Math.min(1, dt * (flash > 0.5 ? 14 : 7));
    tmp.copy(lookCur).add(shake);
    camera.lookAt(tmp);
    camera.rotation.z += 0.035 * tunnel * warpDir;                                 // a small bank with the turn
    // FOV: tighten 3° on the charge, open to 68° at speed, compress to 38° on the arrival hit, settle at 42°
    camera.fov = FOV + 16 * tunnel;
    camera.updateProjectionMatrix();

    const wantMix = focused ? 1 : 0;
    nebula.material.uniforms.uMix.value += (wantMix - nebula.material.uniforms.uMix.value) * Math.min(1, dt * 1.5);

    // star streaks: the sky itself stretches away from the vanishing point in proportion to speed
    vanish.copy(camPos).addScaledVector(travelDir, 400).project(camera);
    const cx = clamp01(vanish.x * 0.5 + 0.5), cy = clamp01(vanish.y * 0.5 + 0.5);
    streaks.visible = tunnel > 0.02;
    if (streaks.visible) {
      streakMat.uniforms.uVanish.value.set(vanish.x, vanish.y);
      streakMat.uniforms.uStretch.value = (0.9 * tunnel * tunnel + 0.12 * tunnel) * (warpDir > 0 ? 1 : 0.7);
      streakMat.uniforms.uOpacity.value = Math.min(1, tunnel * 1.6);
    }
    starMat.uniforms.uTime.value = t;
    stars.visible = true;
    blur.enabled = tunnel > 0.03;
    if (blur.enabled) { blur.uniforms.uCenter.value.set(cx, cy); blur.uniforms.uStrength.value = 0.05 * tunnel * tunnel; }
    rgb.uniforms.uCenter.value.set(cx, cy);
    rgb.uniforms.uDim.value = 0.18 * tunnel;
    rgb.uniforms.uGlow.value = 0.35 * tunnel;
    rgb.uniforms.uAmount.value = tunnel * 0.006;
    rgb.uniforms.uVignette.value = tunnel * 0.5;
    rgb.uniforms.uFlash.value = 0;
    bloom.strength = 0.5 + 0.25 * tunnel + 0.9 * flareT;

    // asteroid belt proximity → debris rumble level
    const dBelt = Math.abs(Math.hypot(camPos.x, camPos.z) - BELT_R);
    const lvl = clamp01(1 - dBelt / 22) * clamp01(1 - Math.abs(camPos.y) / 30);
    if (Math.abs(lvl - beltLevel) > 0.02) { beltLevel = lvl; onBeltLevel?.(lvl); }

    composer.render();
  }
  raf = requestAnimationFrame(frame);

  return {
    bodies, camera, scene, renderer, fade: uFade,
    setPaused(v) { paused = v; if (!v) last = performance.now(); },
    setActive(v) { active = v; },
    setScroll(k) { view.scroll = k; },
    setThrottle(k) { view.throttle = Math.min(1, Math.max(-0.6, k)); },
    heading() { return { theta: view.theta, phi: view.phi, roll: camera.rotation.z, speed: warp, flying: flight.active, flightT: flight.t, flightDur: flight.dur, hot: hotIdx, sunHot, pos: camPos.clone(), bodies: bodies.map((b) => ({ id: b.p.id, x: b.pos.x, y: b.pos.y, z: b.pos.z, r: b.r, size: b.size })) }; },
    project(v) { const t = new THREE.Vector3(v.x, v.y, v.z).project(camera); return { x: (t.x * 0.5 + 0.5) * w, y: (-t.y * 0.5 + 0.5) * h, z: t.z }; },
    setTilt(dx, dy) { tiltX = dx; tiltY = dy; },
    setHeading(theta) { view.theta = theta; view.vel = 0; },
    level() { view.phiOff = 0; },
    nudge(dTheta) { view.theta += dTheta; view.vel = 0; },
    flare() { flareT = 1; },
    cutaway(id, on) { const b = bodies.find((x) => x.p.id === id); if (!b) return; b.cut.target = on ? 1 : 0; if (on) { tmp.subVectors(camPos, b.pos).setY(0).normalize(); b.cut.group.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 4; } },
    cutawayOpen(id) { const b = bodies.find((x) => x.p.id === id); return !!b && b.cut.target > 0; },
    layersOf(id) { const b = bodies.find((x) => x.p.id === id); return b ? b.cut.layers : []; },
    highlightLayer(id, idx) { const b = bodies.find((x) => x.p.id === id); if (!b) return; b.cut.shells.forEach((m, k) => (m.material.uniforms.uHi.value = k === idx ? 1 : 0)); },
    layerAnchors(id) {
      const b = bodies.find((x) => x.p.id === id); if (!b || b.cut.amount < 0.05) return [];
      const q = b.cut.group.quaternion; const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(q); const az = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      // points on the vertical face A (angle 0 → +X), elevated 35°, at each layer's mid radius; crust at 0.97
      // dots sit on the vertical face A (angle 0), a little above the floor, at each layer's outer edge so the
      // small inner layers still get distinct points; thin layers are clamped to a minimum spacing in world units
      const rows = b.cut.layers.map((L) => ({ name: L.name, pct: L.pct, r: (L.r0 + L.r1) / 2, color: L.color }));
      const Rp = b.size * b.root.scale.x;
      // place dots outer→inner at each layer's true outer edge, then enforce a minimum radial gap so the tiny
      // inner layers (0.2 %…) still get distinct, readable anchors; never below 8 % of the radius
      const gap = 0.045, rs = []; let prev = Infinity;
      for (const L of rows) { let r = Math.min(L.r, prev - gap); rs.push(r); prev = r; }
      const under = 0.08 - rs[rs.length - 1]; if (under > 0) for (let i = 0; i < rs.length; i++) rs[i] = Math.max(rs[i] + under * (i / (rs.length - 1)), 0.08 + gap * (rs.length - 1 - i));
      return rows.map((L, i) => { const rr = Math.min(rs[i], 0.985) * Rp;
        const el = 0.52, mid = Math.SQRT1_2; const w = new THREE.Vector3().copy(b.pos).addScaledVector(ax, Math.cos(el) * rr * mid).addScaledVector(az, Math.cos(el) * rr * mid).addScaledVector(UP, Math.sin(el) * rr);
        const pr = w.clone().project(camera); return { name: L.name, pct: L.pct, color: L.color, x: (pr.x * 0.5 + 0.5) * w2(), y: (-pr.y * 0.5 + 0.5) * h2(), z: pr.z, amount: b.cut.amount }; });
    },
    pick() { return active && focusIdx < 0 && !sunFocus && !flight.active ? pickAt() : null; },
    setHyper(v) { hyper = v ? 9 : 1; },
    flyTo, flyToSun, unfocus,
    next(onDone) { if (focusIdx < 0) return; flyTo(bodies[(focusIdx + 1) % bodies.length].p.id, onDone); },
    prev(onDone) { if (focusIdx < 0) return; flyTo(bodies[(focusIdx - 1 + bodies.length) % bodies.length].p.id, onDone); },
    focusedId() { return focusIdx >= 0 ? bodies[focusIdx].p.id : sunFocus ? "sun" : null; },
    isFlying() { return flight.active; },
    dispose() { cancelAnimationFrame(raf); scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); disc.dispose(); composer.dispose(); renderer.dispose(); },
  };
}
