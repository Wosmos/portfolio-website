// The system — the fixed, full-viewport three.js scene the flight deck lives in: sun, eight shader
// planets on their orbits, belt, comet, starfield with warp streaks, flights and cutaways.
// Ported from prototypes/ship/scene.js; `makeBody` is shared with planet-view.ts.

import * as THREE from "three";
import { lowPower } from "@/lib/device";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { DEFAULT_ORBITS, LANG_COLORS } from "@/data/portfolio";
import type { PlanetType, RingConfig } from "@/data/portfolio";
import { arrange, clampPlanetSize, type Arrangement, type ScaleMode } from "@/lib/scale";
import { visibleMoons } from "./types";
import type {
  FlightEventName, Heading, HeadingMoon, Layer, LayerAnchor, MoonConfig, Pick, PlanetFull,
  ProjectFull, SystemApi, SystemOptions, Vec3,
} from "./types";

const BG = 0x06060a;
const WHITE = new THREE.Color(0xfafafa);
const NEON_B = new THREE.Color(0x00e5ff);
const NEON_A = new THREE.Color(0xff2bd6);
const UP = new THREE.Vector3(0, 1, 0);

const SUN_R_DEFAULT = 6.0;
export const PLANET_SCALE = 1.0;

const BELT_R_DEFAULT = 65.5;
const FOV_DEFAULT = 42;
// The order is the order of the branch chain in planetFrag and MOON_FRAG; a new family is appended here.
export const TYPE: Readonly<Record<PlanetType, number>> = { gas: 0, rocky: 1, lava: 2, ice: 3, liquid: 4, muddy: 5 };

// camera poses along the page — [phi (elevation), radius]; theta comes from the user's drag
const POSES: readonly (readonly [number, number])[] = [
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

/**
 * The planet surface. `moons` is how many moons cast a shadow on this body: at zero the shader
 * declares no moon uniforms and contains no moon code at all, so a planet without moons compiles to
 * exactly the program it did before moons existed (and, three.js caching programs by source, every
 * such planet still shares one).
 */
const planetFrag = (moons: number) => /* glsl */ `
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uRim;
uniform float uType; uniform float uSeed; uniform float uTime; uniform float uHot;
uniform float uOcean; uniform float uCloud; uniform float uCrater; uniform float uVein;
uniform float uGlow; uniform float uBands; uniform float uBandSharp;
uniform float uRingOn; uniform vec3 uRingN; uniform vec3 uPlanetC; uniform float uRingIn; uniform float uRingOut;
${moons > 0 ? `uniform vec4 uMoons[${moons}];    // xyz world centre, w radius — zeroed while hidden` : ""}
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
${BRDF}
${CUT_GLSL}
// Sharpens a 0–1 band value towards a step. At uBandSharp 0 the mix returns the sine untouched, which
// is what keeps a planet with no bandSharp set looking exactly as it did.
float bandEdge(float b, float s){
  float w = max(0.02, 0.5 * (1.0 - s));
  return mix(b, smoothstep(0.5 - w, 0.5 + w, b), s);
}
void main(){
  if (inWedge(vW)) discard;
  vec3 Ng = normalize(vN);                                  // geometric normal: limb, fresnel, rim
  vec3 N = Ng;                                              // shading normal: bent by the crust below
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(-vW);
  vec3 p = normalize(vL);
  vec3 q = p * 2.0 + uSeed;
  float w1 = fbm(q + vec3(0.0, uTime * 0.01, 0.0));
  vec3 warp = vec3(fbm(q + 1.7), fbm(q + 9.2), fbm(q + 4.1));
  float n = fbm(q * 1.6 + warp * 0.9);
  // one tangent frame on the sphere, shared by the crust relief and the ocean swell
  vec3 t1 = normalize(cross(Ng, vec3(0.0, 1.0, 0.0)) + vec3(1e-3, 0.0, 0.0));
  vec3 t2 = cross(Ng, t1);
  vec3 albedo = uC0; vec3 emissive = vec3(0.0); float rough = 0.6;
  // Ns is the normal the specular lobe uses — only the ocean bends it, so every other family is
  // untouched. sheen lifts the limb where a surface is wet enough to mirror the sky.
  vec3 Ns = N; float sheen = 0.0; float night = 0.0;
  // glint is how mirror-like the surface is. Only water and ice ever raise it, so rock, dust and gas
  // no longer catch a highlight they have no business catching.
  float glint = 0.0;
  // relief is how hard the crust bends the shading normal — 0 on a body with no crust to bend.
  float relief = 0.0;
  if (uType < 0.5) {
    float lat = p.y + n * 0.07 + w1 * 0.04;
    // the second set is always 17 cycles finer than the first, so uBands moves both together
    float band  = bandEdge(sin(lat * uBands + uSeed) * 0.5 + 0.5, uBandSharp);
    float band2 = bandEdge(sin(lat * (uBands + 17.0) + n * 2.0 + 1.3) * 0.5 + 0.5, uBandSharp);
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
    glint = ocean; relief = 0.55 * (1.0 - ocean);
  } else if (uType < 2.5) {
    float rock = n * 0.5 + 0.5;
    albedo = mix(uC0, uC1, rock);
    albedo = mix(albedo, uC2, smoothstep(0.6, 0.9, w1 * 0.5 + 0.5) * 0.5);
    float vein = 1.0 - smoothstep(0.0, 0.07, abs(snoise(q * 2.6 + warp * 0.6)));
    vein *= smoothstep(0.35, 0.7, fbm(q * 1.2 + 3.0) * 0.5 + 0.5);
    emissive = uC3 * vein * (1.1 + 0.35 * sin(uTime * 1.4 + n * 7.0)) * uVein;
    rough = 0.8; relief = 0.5;
  } else if (uType < 3.5) {
    float lat = p.y + n * 0.1;
    float band = bandEdge(sin(lat * uBands * 0.5 + uSeed) * 0.5 + 0.5, uBandSharp);
    albedo = mix(uC0, uC1, band * 0.55 + n * 0.2);
    albedo = mix(albedo, uC2, smoothstep(0.6, 0.9, fbm(q * 2.0 + warp) * 0.5 + 0.5) * 0.7);
    rough = 0.3; glint = 0.6; relief = 0.3;
  } else if (uType < 4.5) {
    // ocean world. uOcean is the sea level, uCrater raises archipelagos, uVein lights the night side.
    float sea = uOcean > 0.005 ? uOcean : 0.62;                       // an ocean world is mostly ocean by default
    float h = n * 0.5 + 0.5 + w1 * 0.14 + uCrater * smoothstep(0.55, 0.85, fbm(q * 3.4 + warp * 1.3)) * 0.22;
    float water = smoothstep(sea + 0.015, sea - 0.045, h);
    float shelf = smoothstep(sea - 0.15, sea, h) * water;             // the pale shallows every coastline sits in
    vec3 land = mix(uC1, uC2, smoothstep(sea, sea + 0.26, h));
    land = mix(land, uC3, smoothstep(0.82, 0.95, h));
    land = mix(land, uC3, smoothstep(0.76, 0.97, abs(p.y) + n * 0.05) * 0.9);
    vec3 deep = mix(uC0, uC0 * 0.5, smoothstep(0.0, 0.3, sea - h));
    albedo = mix(land, mix(deep, mix(uC0, uC1, 0.55), shelf * 0.85), water);
    // wind-driven swell: sample the wave field at three points and tilt the normal along the gradient,
    // which is what turns the sun into a moving glint instead of a static hot spot
    vec3 wq = p * 34.0 + vec3(uTime * 0.3, 0.0, uTime * -0.2);
    float s0 = snoise(wq), s1 = snoise(wq + t1 * 0.6), s2 = snoise(wq + t2 * 0.6);
    Ns = normalize(N - (t1 * (s1 - s0) + t2 * (s2 - s0)) * 0.5 * water);
    albedo *= 1.0 + 0.05 * s0 * water;
    rough = mix(0.85, 0.05, water);
    sheen = water; night = 1.0;
    glint = water; relief = 0.42 * (1.0 - water);
    emissive = uC3 * uVein * (1.0 - water) * smoothstep(0.45, 0.82, fbm(q * 6.0 + 21.0) * 0.5 + 0.5);
  } else {
    // silt world. Iron-oxide bands, dune fields combed along the latitudes, dry channels, no shine.
    float lat = p.y;
    albedo = mix(uC0, uC1, bandEdge(0.5 + 0.5 * sin(lat * uBands * 0.5 + n * 1.6 + uSeed), uBandSharp * 0.6));
    albedo = mix(albedo, uC2, smoothstep(0.45, 0.85, fbm(q * 2.2 + warp * 0.8) * 0.5 + 0.5) * 0.6);
    float dune = 0.5 + 0.5 * sin(lat * 42.0 + snoise(q * 2.0) * 6.0);
    dune *= smoothstep(0.35, 0.75, fbm(q * 1.7 + 5.0) * 0.5 + 0.5) * (1.0 - smoothstep(0.62, 0.9, abs(lat)));
    albedo *= 0.92 + 0.18 * dune;
    float bed = (1.0 - smoothstep(0.0, 0.055, abs(snoise(q * 2.2 + warp * 0.4)))) * uVein;
    bed *= smoothstep(0.3, 0.7, fbm(q * 1.1 + 7.0) * 0.5 + 0.5);
    albedo = mix(albedo, uC0 * 0.55, bed * 0.8);
    albedo *= 1.0 - uCrater * smoothstep(0.58, 0.88, snoise(p * 11.0 + uSeed)) * 0.45;
    // the ocean knob has nothing to flood on a dry world, so it sets the polar frost instead
    albedo = mix(albedo, uC3, smoothstep(1.0 - uOcean * 0.4, 1.04 - uOcean * 0.4, abs(p.y) + n * 0.04));
    rough = 0.96; relief = 0.62;
  }
  // Crust relief. One octave of height differenced along the two tangents, which tilts the shading
  // normal into the slope: the terrain then lights itself instead of reading as paint on a ball. The
  // cloud deck below is deliberately applied after it, because cloud sits above the crust.
  if (relief > 0.001) {
    vec3 hq = p * 11.0 + uSeed * 1.31;
    float e = 0.55;
    float h0 = snoise(hq), h1 = snoise(hq + t1 * e), h2 = snoise(hq + t2 * e);
    N = normalize(Ng - (t1 * (h1 - h0) + t2 * (h2 - h0)) * relief * 0.7);
    albedo *= 0.94 + 0.12 * (h0 * 0.5 + 0.5);
  }
  // dust rolls over a silt world where cloud would sit on the others, so the haze is tinted, not white
  bool dusty = uType > 4.5;
  float cl = uCloud * smoothstep(0.48, 0.78, fbm(p * 3.5 + vec3(uTime * 0.025, 0.0, 0.0) + warp * 0.5 + 11.0) * 0.5 + 0.5);
  albedo = mix(albedo, dusty ? mix(uC1, uC2, 0.6) * 1.18 : vec3(0.96), cl * (dusty ? 0.7 : 1.0));
  // cloud is smooth and flat, so it undoes the relief and the glint underneath it
  N = normalize(mix(N, Ng, cl)); glint *= 1.0 - cl;
  float nl = dot(N, L);
  // A real terminator is narrow. Spread over 0.67 of the cosine it washed two thirds of the disc into
  // an even glow, which is what made these read as flat marbles however much surface detail they had.
  float d = smoothstep(-0.04, 0.22, nl);
  // planetshine: what the night side gets back from whatever else is in the system
  float shine = 0.0;
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
    // ringshine: from the night side the lit face of the ring is a bright arc overhead, brightest
    // over the equator where the ring subtends most sky
    shine += 0.11 * (1.0 - abs(dot(Ng, uRingN))) * (1.0 - d);
  }
${moons > 0 ? `  // Moons, analytically, against the sun direction — no shadow map, no second pass.
  for (int mi = 0; mi < ${moons}; mi++) {
    vec4 mo = uMoons[mi];
    if (mo.w <= 0.0) continue;                              // hidden moon: no shadow, no shine
    vec3 rel = mo.xyz - vW;
    float along = dot(rel, L);
    float md = max(length(rel), 1e-3);
    if (along > 0.0) {
      // the transit: how far this fragment's line to the sun passes from the moon's centre. The sun
      // is not a point, so the umbra gets a penumbra a little wider than the moon itself.
      float perp = length(rel - L * along);
      d *= mix(1.0, 0.12, 1.0 - smoothstep(mo.w * 0.6, mo.w * 1.45, perp));
    }
    vec3 mdir = rel / md;
    float mLit = clamp(0.5 - 0.5 * dot(normalize(-mo.xyz), mdir), 0.0, 1.0);
    shine += max(dot(N, mdir), 0.0) * (mo.w * mo.w) / (md * md) * mLit * 1.3;
  }
` : ""}  // Terminator. The beam that grazes the surface has lost its blue to the long path through the air,
  // so the light warms as it dims instead of stepping from white day to black night.
  float graze = 1.0 - smoothstep(0.0, 0.5, nl);
  vec3 sunCol = mix(vec3(1.0, 0.86, 0.76), vec3(1.0, 0.5, 0.27), graze * 0.82);
  // glint: a mirror lobe, and only where there is something to mirror — water or ice
  float spec = ggx(Ns, V, L, mix(0.05, 0.5, rough)) * glint * 2.1;
  float limb = 1.0 - max(dot(Ng, V), 0.0);
  float fres = pow(limb, 3.0);
  // 0.035 of ambient on a near-white albedo is a visible grey; a body in vacuum has almost none, and
  // what little the night side gets comes from the ring and the moons below, not from nowhere.
  vec3 col = albedo * (0.012 + d * 1.02) * sunCol + spec * sunCol;
  // limb reddening: near the edge the line of sight crosses far more atmosphere than at the centre
  col = mix(col, col * vec3(1.1, 0.82, 0.6), pow(limb, 2.0) * 0.5 * d);
  // and a thin bright rim of forward-scattered light, day side only
  col += uRim * pow(limb, 6.0) * 0.65 * smoothstep(-0.04, 0.34, nl);
  // Every one of these is scattered sunlight, so none of it exists where the sun does not reach. They
  // used to carry a floor (0.35, 0.25, and one term with no day term at all), which painted the whole
  // night limb in the rim colour — that cyan crescent was the planet's dark side, lit by nothing.
  // Only uHot survives into the night, because lava is its own light source.
  col += uRim * fres * 0.32 * d + uRim * fres * uHot * 0.8;
  col += uRim * fres * sheen * 0.22 * d;                            // wet limb mirrors the sky
  col += albedo * shine;                                            // ring- and moonlight on the dark side
  col += emissive * uGlow * mix(1.0, clamp(1.0 - d * 1.6, 0.0, 1.0), night);
  // above 1, glow also lights the night side, so a planet without lava veins can still burn
  col += uRim * max(0.0, uGlow - 1.0) * 0.12 * (1.0 - d) * (0.4 + 0.6 * fres);
  gl_FragColor = vec4(col, 1.0);
}`;

// GGX: the specular shape a rough surface actually has. Phong gave water a round dot; this gives the
// stretched, grazing-angle glint you see on a real sea, and lets roughness mean something physical.
const BRDF = /* glsl */ `
float ggx(vec3 N, vec3 V, vec3 L, float rough){
  float a = max(0.035, rough * rough);
  vec3 H = normalize(V + L);
  float nh = max(dot(N, H), 0.0), nv = max(dot(N, V), 1e-4), nl = max(dot(N, L), 0.0);
  float a2 = a * a;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / max(1e-6, 3.14159265 * dd * dd);                 // microfacet distribution
  float k = a * 0.5;                                              // Smith, height-correlated enough for this
  float G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(H, V), 0.0), 5.0);    // Schlick, dielectric
  return D * G * F / max(1e-4, 4.0 * nv * nl) * nl;
}`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uRim; uniform float uHot; uniform float uAlpha;
varying vec3 vN; varying vec3 vW;
${CUT_GLSL}
void main(){
  if (inWedge(vW)) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(-vW);
  float mu = abs(dot(N, V));
  // The shell is additive, so whatever it contributes over the disc is light added to the surface —
  // at 2.6 it still put ~7% of the rim colour across the middle of the face, which lifted the blacks
  // and flattened the terminator. The air belongs at the limb: a steeper falloff keeps it there.
  float f = pow(1.0 - mu, 5.0);
  float nl = dot(N, L);
  // Air glows because sunlight passes through it. Behind the terminator there is none, bar the little
  // that bends round — so the floor is 0.05, not 0.45, and the ring of light ends where the day does.
  float day = 0.05 + 0.95 * smoothstep(-0.16, 0.3, nl);
  // Rayleigh: the longest paths are the ones grazing the terminator, and they arrive red. The shell
  // keeps its own colour high on the day side and turns to sunset where it thins into night.
  float sunset = (1.0 - smoothstep(-0.22, 0.46, nl)) * pow(1.0 - mu, 1.4);
  vec3 tint = mix(uRim, vec3(1.0, 0.44, 0.21), clamp(sunset, 0.0, 1.0) * 0.85);
  // forward scattering: looking into the sun through the shell lights the whole limb
  float fwd = pow(max(0.0, -dot(V, L)) * 0.5 + 0.5, 3.0);
  float a = f * (uAlpha + uHot * 0.6) * day * (0.78 + 0.85 * fwd) * 1.35;   // narrower band, so it may be brighter in it
  a += pow(1.0 - mu, 7.0) * smoothstep(-0.02, 0.3, nl) * (0.5 + 0.5 * fwd) * uAlpha * 1.7;   // thin day rim
  gl_FragColor = vec4(tint, a);
}`;

// A moon: one small sphere, tidally locked, lit by the sun at the origin. Everything that makes it
// read as a moon rather than a pebble is here — cratered relief with a real normal, a narrow airless
// terminator, the planet's shadow when it passes behind, and the planet's own light on its dark side.
// No cutaway code: a moon is hidden outright while its planet is open, so it never needs the wedge.
const MOON_FRAG = /* glsl */ `
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uShine;
uniform float uType; uniform float uSeed; uniform float uTime; uniform float uHot;
uniform vec3 uPlanet; uniform float uPlanetR;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
${BRDF}
// One height field, three samples: two crater scales over a low swell. Differenced along the tangents
// it gives the bowls a normal, which is the difference between craters and a speckled ball.
float mRelief(vec3 p, float sd){
  float big = smoothstep(0.04, 0.50, snoise(p * 5.0 + sd));
  float small = smoothstep(0.22, 0.64, snoise(p * 15.0 + sd * 1.7));
  return 0.26 * snoise(p * 2.2 + sd * 0.5) - 0.70 * big - 0.32 * small;
}
void main(){
  vec3 Ng = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(-vW);
  vec3 p = normalize(vL);
  vec3 t1 = normalize(cross(Ng, vec3(0.0, 1.0, 0.0)) + vec3(1e-3, 0.0, 0.0));
  vec3 t2 = cross(Ng, t1);
  // the step has to stay inside one cell of the finest octave, or the difference is noise, not a slope
  float e = 0.04;
  float h0 = mRelief(p, uSeed), h1 = mRelief(p + t1 * e, uSeed), h2 = mRelief(p + t2 * e, uSeed);
  vec3 N = normalize(Ng - (t1 * (h1 - h0) + t2 * (h2 - h0)) * 2.6);
  float basin = clamp(-h0 * 1.4, 0.0, 1.0);                   // crater floors are the dark maria
  float ridge = clamp((h1 + h2 - 2.0 * h0) * 10.0, 0.0, 1.0); // and their walls the bright ejecta
  vec3 albedo = mix(uC0, uC1, clamp(0.5 + 0.9 * h0, 0.0, 1.0)) * (1.0 - 0.34 * basin) + uC1 * ridge * 0.28;
  float rough = 0.95, glint = 0.0;
  vec3 emissive = vec3(0.0);
  // the same chain as the planet's, so one type table serves both: gas · rocky · lava · ice · liquid · muddy
  if (uType < 0.5) {                                          // gas: bands, no craters to catch light
    float lat = asin(clamp(p.y, -1.0, 1.0));
    float band = sin(lat * 9.0 + uSeed) * 0.5 + 0.5;
    albedo = mix(uC0, uC1, band * 0.8 + 0.1 * h0);
    N = Ng;                                                   // nothing solid to relieve
    rough = 0.9;
  } else if (uType < 1.5) {                                   // rocky: bare regolith, the default above
    rough = 0.96;
  } else if (uType < 2.5) {                                   // lava: cracks still glowing
    emissive = uC1 * (1.0 - smoothstep(0.0, 0.09, abs(h0 + 0.18))) * (0.8 + 0.3 * sin(uTime * 1.7));
    rough = 0.85;
  } else if (uType < 3.5) {                                   // ice
    albedo = mix(albedo, uC1 * 1.3, 0.4); rough = 0.32; glint = 0.55;
  } else if (uType < 4.5) {                                   // liquid
    albedo = mix(albedo, uC0 * 0.8, 0.5); rough = 0.1; glint = 0.9;
  } else {                                                    // muddy: dust smooths the craters over
    albedo = mix(albedo, mix(uC0, uC1, 0.65), 0.35); rough = 0.98;
    N = normalize(mix(N, Ng, 0.4));
  }
  float nl = dot(N, L);
  float d = smoothstep(-0.05, 0.24, nl);                      // no air, so a narrow terminator
  // Eclipse: sphere against sphere along the sun direction. If the planet lies between this fragment
  // and the sun the moon falls into its shadow, with a penumbra a little wider than the planet.
  vec3 rel = uPlanet - vW;
  float along = dot(rel, L);
  float pdist = max(length(rel), uPlanetR * 1.001);
  if (along > 0.0) d *= 0.04 + 0.96 * smoothstep(uPlanetR * 0.7, uPlanetR * 1.15, length(rel - L * along));
  // the last light before night has crossed the most regolith and comes back the reddest
  vec3 sunCol = mix(vec3(1.0, 0.9, 0.82), vec3(1.0, 0.48, 0.26), (1.0 - smoothstep(0.0, 0.34, nl)) * 0.8);
  float spec = ggx(N, V, L, mix(0.06, 0.55, rough)) * glint * 1.6;
  // Planetshine: the lit face of the planet lights the moon's night side, dimming as the planet's own
  // phase wanes — a moon between the sun and its planet sees a new planet and gets nothing back.
  vec3 pdir = rel / pdist;
  float phase = clamp(0.5 - 0.5 * dot(normalize(-uPlanet), normalize(vW - uPlanet)), 0.0, 1.0);
  float shine = max(dot(N, pdir), 0.0) * ((uPlanetR * uPlanetR) / (pdist * pdist)) * phase;
  vec3 col = albedo * (0.085 + d * 1.05) * sunCol + spec * sunCol + uShine * shine * 2.2 + emissive;
  // a limb rim on every side: without it a moon turned away from the sun reads as a hole in the sky
  float limb = pow(1.0 - max(dot(Ng, V), 0.0), 3.0);
  col += albedo * limb * 0.22;
  col += uC1 * limb * (0.06 + 0.4 * uHot) * (0.35 + 0.65 * d);
  gl_FragColor = vec4(col, 1.0);
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
${BRDF}
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
  float spec = ggx(N, V, L, 0.34) * 0.5;
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

// The photosphere. What makes a sphere read as a star rather than a lamp is, in order: differential
// rotation (the equator laps the poles, so the surface shears), granulation cells split by dark
// intergranular lanes, limb darkening, and a chromosphere rim that is a different colour from the disc.
const SUN_FRAG = /* glsl */ `
uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uEdge; uniform float uTime; uniform float uFade;
uniform float uGran; uniform float uLimb; uniform float uSpots; uniform float uSpin; uniform float uFlare; uniform float uPulse;
uniform float uR;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
${NOISE}
void main(){
  vec3 p = normalize(vL);
  vec3 V = normalize(cameraPosition - vW);
  float mu = max(dot(normalize(vN), V), 0.0);                 // 1 at the centre of the disc, 0 at the limb

  // How large the star is in the frame — its radius over the distance to it, so roughly its angular
  // radius in radians. Granulation cells smaller than a pixel do not average out, they shimmer, so the
  // fine octaves fade with apparent size instead of always being drawn. In the true-to-scale mode, where
  // the star is a speck, this is what keeps it a clean dot.
  float app = uR / max(length(cameraPosition - vW), 1e-3);
  float fine = smoothstep(0.018, 0.11, app);
  float near = smoothstep(0.12, 0.30, app);

  float lat = asin(clamp(p.y, -1.0, 1.0));
  float cl = cos(lat);
  float lon = atan(p.z, p.x) + uTime * uSpin * (0.020 + 0.034 * cl * cl);
  vec3 q = vec3(cl * cos(lon), p.y, cl * sin(lon));

  float coarse = fbm(q * 5.0 + vec3(0.0, uTime * 0.05, 0.0)) * 0.5 + 0.5;
  float cell = pow(clamp(1.0 - abs(snoise(q * 22.0 + vec3(0.0, 0.0, uTime * 0.16))), 0.0, 1.0), 2.2);
  // both terms average to about 1, so fading between them changes the texture and not the brightness
  float detail = 0.66 + 0.54 * cell + 0.26 * coarse;
  float gran = mix(1.0, mix(0.80 + 0.34 * coarse, detail, fine), clamp(uGran, 0.0, 2.0));
  if (near > 0.01) {                                          // close in, the cells split further
    float fcell = pow(clamp(1.0 - abs(snoise(q * 62.0 + vec3(0.0, 0.0, uTime * 0.4))), 0.0, 1.0), 2.0);
    gran *= 1.0 + near * (0.20 * fcell - 0.09);
  }

  // sunspots keep to two mid-latitude belts, each umbra wrapped in a lighter penumbra
  float off = (abs(lat) - 0.28) / 0.17;                       // pow() is undefined on a negative base
  float belt = exp(-off * off);
  float sn = snoise(q * 3.1 + 17.0) * 0.5 + 0.5 + 0.3 * snoise(q * 7.0);
  float spotF = clamp(uSpots, 0.0, 1.0) * belt;
  float pen = smoothstep(0.50, 0.66, sn) * spotF;
  float umbra = smoothstep(0.64, 0.75, sn) * spotF;
  float dark = 1.0 - 0.8 * umbra - 0.3 * max(pen - umbra, 0.0);

  float ld = 1.0 - clamp(uLimb, 0.0, 2.0) * (0.42 * (1.0 - mu) + 0.28 * (1.0 - mu) * (1.0 - mu));
  float x = 1.0 - mu;
  vec3 ramp = x < 0.5 ? mix(uCore, uMid, x * 2.0) : mix(uMid, uEdge, (x - 0.5) * 2.0);
  vec3 col = ramp * gran * max(ld, 0.0) * dark;

  // faculae: the magnetic network that surrounds an active region is hotter than the quiet sun, and
  // shows most at the limb where you are looking along the bright walls of the granules
  float fac = smoothstep(0.40, 0.55, sn) * (1.0 - smoothstep(0.0, 0.4, pen)) * spotF;
  col *= 1.0 + fac * (0.10 + 0.5 * (1.0 - mu));

  // chromosphere: a thin hotter rim, combed into spicules that resolve into finer jets close up and
  // flicker on the flare pulse
  float rim = smoothstep(0.4, 0.0, mu);
  float spic = 0.5 + 0.5 * snoise(q * 24.0 + vec3(0.0, uTime * 0.7, 0.0));
  spic = mix(spic, spic * (0.5 + 0.9 * (0.5 + 0.5 * snoise(q * 96.0 + vec3(0.0, uTime * 2.1, 0.0)))), near);
  col += mix(uEdge, vec3(1.0, 0.34, 0.2), 0.55) * rim * (0.14 + 0.42 * spic) * (0.55 + 0.9 * uFlare * (0.3 + 2.0 * uPulse));
  gl_FragColor = vec4(col * 0.95 * uFade, 1.0);
}`;

// The corona, on one back-face shell. Every fragment recovers how far its view ray passes from the
// star's centre, so the halo is a function of distance in the sky rather than of the shell's geometry —
// which is what lets streamers and prominences reach past the limb without a second camera-facing quad.
const CORONA_FRAG = /* glsl */ `
uniform vec3 uMid; uniform vec3 uEdge; uniform float uR; uniform float uTime; uniform float uFade;
uniform float uCorona; uniform float uFlare; uniform float uPulse;
varying vec3 vW;
${NOISE}
void main(){
  vec3 V = normalize(vW - cameraPosition);
  float b = length(cross(vW, V));                             // impact parameter of this ray to the origin
  float d = b / max(1e-4, uR) - 1.0;
  if (d < -0.004) discard;                                    // the photosphere owns the disc
  vec3 rp = normalize(vW - V * dot(vW, V));                   // out from the centre, in the plane of the sky
  float breathe = 0.9 + 0.1 * sin(uTime * 0.33) + 0.06 * sin(uTime * 0.87 + 1.7);
  float streamer = clamp(fbm(rp * 2.6 + vec3(0.0, uTime * 0.02, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
  float sharp = pow(streamer, 2.3);
  // helmet streamers gather over the active belts, so the corona is fat at the equator and thin at
  // the poles — and each streamer reaches much further out than the gap beside it, which is the whole
  // difference between a corona and a uniform ball of light around the star
  float eq = 1.0 - 0.5 * abs(rp.y);
  float reach = mix(4.4, 1.15, clamp(sharp * eq, 0.0, 1.0));
  float halo = exp(-max(d, 0.0) * reach) * (0.20 + 1.05 * sharp) * eq * breathe;
  // polar plumes: short, fine, and only over the poles
  float plume = exp(-max(d, 0.0) * 8.0) * pow(clamp(0.5 + 0.5 * snoise(rp * 20.0 + uTime * 0.03), 0.0, 1.0), 3.0)
              * smoothstep(0.5, 0.95, abs(rp.y)) * 0.55;
  float wisp = clamp(0.55 + 0.45 * snoise(rp * 9.0 + uTime * 0.05), 0.0, 1.0);
  float prom = exp(-max(d, 0.0) * 15.0) * pow(wisp, 3.0) * uFlare * (0.45 + 2.6 * uPulse);
  vec3 col = mix(uEdge, uMid, 0.35) * (halo + plume) * 0.55 + mix(uEdge, vec3(1.0, 0.42, 0.28), 0.6) * prom;
  gl_FragColor = vec4(col * uCorona * uFade, 1.0);
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

const POST_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RGB_SHIFT_FRAG = /* glsl */ `
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
  }`;

// radial motion blur toward the vanishing point of travel — 12 taps, only enabled in flight
const RADIAL_BLUR_FRAG = /* glsl */ `
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
  }`;

// ───────────────────────── typed uniforms ─────────────────────────

type U<T> = THREE.IUniform<T>;
type UniformMap = Record<string, THREE.IUniform>;
export type CutUniforms = { uCut: U<number>; uCutC: U<THREE.Vector3>; uCutX: U<THREE.Vector3>; uCutZ: U<THREE.Vector3> };
export type PlanetUniforms = CutUniforms & {
  uC0: U<THREE.Color>; uC1: U<THREE.Color>; uC2: U<THREE.Color>; uC3: U<THREE.Color>; uRim: U<THREE.Color>;
  uType: U<number>; uSeed: U<number>; uTime: U<number>; uHot: U<number>;
  uOcean: U<number>; uCloud: U<number>; uCrater: U<number>; uVein: U<number>;
  uGlow: U<number>; uBands: U<number>; uBandSharp: U<number>;
  uRingOn: U<number>; uRingN: U<THREE.Vector3>; uPlanetC: U<THREE.Vector3>; uRingIn: U<number>; uRingOut: U<number>;
  /** `vec4[n]`, flat: one xyz world centre + w radius per moon. `NO_MOONS` when the body has none, in
   *  which case the compiled shader never declares it and three.js never looks at it. */
  uMoons: U<Float32Array>;
};
export type AtmoUniforms = CutUniforms & { uRim: U<THREE.Color>; uHot: U<number>; uAlpha: U<number> };
export type MoonUniforms = {
  uC0: U<THREE.Color>; uC1: U<THREE.Color>; uShine: U<THREE.Color>;
  uType: U<number>; uSeed: U<number>; uTime: U<number>; uHot: U<number>;
  uPlanet: U<THREE.Vector3>; uPlanetR: U<number>;
};
export type RingUniforms = { uMap: U<THREE.Texture>; uInner: U<number>; uOuter: U<number>; uHot: U<number>; uPlanet: U<THREE.Vector3>; uPlanetR: U<number>; uSeed: U<number> };
export type ShellUniforms = CutUniforms & { uColor: U<THREE.Color>; uSeed: U<number>; uTime: U<number>; uAlpha: U<number>; uHi: U<number> };
export type FaceUniforms = { uMap: U<THREE.Texture>; uR: U<number>; uSeed: U<number>; uAlpha: U<number>; uSpan: U<number> };
type SunUniforms = {
  uCore: U<THREE.Color>; uMid: U<THREE.Color>; uEdge: U<THREE.Color>; uTime: U<number>; uFade: U<number>;
  uGran: U<number>; uLimb: U<number>; uSpots: U<number>; uSpin: U<number>; uFlare: U<number>; uPulse: U<number>;
  uR: U<number>;
};
type CoronaUniforms = {
  uMid: U<THREE.Color>; uEdge: U<THREE.Color>; uR: U<number>; uTime: U<number>; uFade: U<number>;
  uCorona: U<number>; uFlare: U<number>; uPulse: U<number>;
};
type NebulaUniforms = { uA: U<THREE.Color>; uB: U<THREE.Color>; uTint: U<THREE.Color>; uMix: U<number>; uFade: U<number>; uTime: U<number> };
type StarUniforms = { uTime: U<number>; uMap: U<THREE.Texture> };
type StreakUniforms = { uStretch: U<number>; uVanish: U<THREE.Vector2>; uOpacity: U<number>; uTime: U<number> };
type RgbUniforms = { tDiffuse: U<THREE.Texture | null>; uAmount: U<number>; uVignette: U<number>; uFlash: U<number>; uDim: U<number>; uGlow: U<number>; uCenter: U<THREE.Vector2> };
type BlurUniforms = { tDiffuse: U<THREE.Texture | null>; uStrength: U<number>; uCenter: U<THREE.Vector2> };

/** ShaderMaterial whose `uniforms` keep their literal type, so `.value` is never `any`. */
export class ShaderMat<TU extends UniformMap> extends THREE.ShaderMaterial {
  declare uniforms: TU;
  constructor(params: Omit<THREE.ShaderMaterialParameters, "uniforms"> & { uniforms: TU }) { super(params); }
}
export type ShaderMesh<G extends THREE.BufferGeometry, TU extends UniformMap> = THREE.Mesh<G, ShaderMat<TU>>;

// ───────────────────────── helpers ─────────────────────────

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext("2d");
  if (!g) throw new Error("2D canvas context unavailable");
  return g;
}

function discTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = ctx2d(c);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 1-D ring profile → RGBA texture along the radius: C / B / Cassini / A regions, ~40 overlaid
// ringlet frequencies, two dozen random gaps plus Encke, icy colour tinted by the planet's palette.
function ringProfile(ring: RingConfig, seed: number): THREE.DataTexture {
  const N = 2048, data = new Uint8Array(N * 4);
  let h = (seed * 7919) | 0; const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const regions: [number, number, number][] = [[0.0, 0.27, 0.2], [0.29, 0.6, 0.95], [0.6, 0.645, 0.05], [0.645, 0.96, 0.62]];
  const gaps: [number, number, number][] = [[0.86, 0.006, 0.95], [0.45, 0.004, 0.7]];
  for (let i = 0; i < 24; i++) gaps.push([0.05 + rnd() * 0.9, 0.0015 + rnd() * 0.006, 0.35 + rnd() * 0.6]);
  const waves: [number, number, number][] = []; for (let k = 0; k < 40; k++) waves.push([30 + rnd() * 620, rnd() * 6.283, 0.02 + rnd() * 0.09]);
  const ca = new THREE.Color(ring.ca), cb = new THREE.Color(ring.cb), ice = new THREE.Color(0.88, 0.85, 0.8), tint = new THREE.Color();
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
export const cutUniforms = (): CutUniforms => ({ uCut: { value: 0 }, uCutC: { value: new THREE.Vector3() }, uCutX: { value: new THREE.Vector3(1, 0, 0) }, uCutZ: { value: new THREE.Vector3(0, 0, 1) } });
function layerTexture(layers: readonly Layer[]): THREE.DataTexture {
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

export type ShellMesh = ShaderMesh<THREE.SphereGeometry, ShellUniforms>;
export type FaceMesh = ShaderMesh<THREE.CircleGeometry, FaceUniforms>;
export interface Cutaway {
  group: THREE.Group; shells: ShellMesh[]; faces: FaceMesh[]; faceH: FaceMesh; faceB: FaceMesh; layers: Layer[];
  /** eased 0→1 wedge opening */ amount: number; /** 0 closed · 1 open */ target: number; /** linear time 0→1 */ tm: number;
}
function buildCutaway(p: ProjectFull, size: number, i: number): Cutaway {
  const group = new THREE.Group(); group.visible = false;
  const source = p.langs.length > 0 ? p.langs : ([["Other", 100]] as const);
  const langs = source.slice().sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((a, l) => a + l[1], 0);
  // shells from the crust inward. Each language's share is its share of the sphere's VOLUME (that is what
  // the eye reads in a cross-section), so r = 0.94 · ∛(cumulative share from the core). Exactly the data,
  // but a 0.4 % language is a visible band instead of a dot.
  const layers: Layer[] = []; let cum = total;
  for (const [name, pct] of langs) { const r1 = 0.94 * Math.cbrt(cum / total); cum -= pct; const r0 = 0.94 * Math.cbrt(Math.max(0, cum) / total); layers.push({ name, pct, r0, r1, color: LANG_COLORS[name] ?? LANG_COLORS.Other }); }
  layers[layers.length - 1].r0 = 0;
  const shells = layers.map((L, k): ShellMesh => {
    const m = new THREE.Mesh(sphereGeo, new ShaderMat<ShellUniforms>({ vertexShader: V_WORLD, fragmentShader: SHELL_FRAG, side: THREE.DoubleSide, transparent: true,
      uniforms: { uColor: { value: new THREE.Color(L.color) }, uSeed: { value: i * 3.1 + k }, uTime: { value: 0 }, uAlpha: { value: 0 }, uHi: { value: 0 }, ...cutUniforms() } }));
    m.scale.setScalar(size * L.r1 * 0.985); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1 - k; m.material.polygonOffsetUnits = -1; m.renderOrder = 2 + k; group.add(m); return m;
  });
  const tex = layerTexture(layers);
  const faceMat = (span: number) => new ShaderMat<FaceUniforms>({ vertexShader: V_WORLD, fragmentShader: FACE_FRAG, side: THREE.DoubleSide, transparent: true,
    uniforms: { uMap: { value: tex }, uR: { value: size * 0.94 }, uSeed: { value: i * 5.7 }, uAlpha: { value: 0 }, uSpan: { value: span } } });
  const quarter = new THREE.CircleGeometry(size * 0.94 * 0.999, 96, 0, Math.PI / 2);
  const faceA: FaceMesh = new THREE.Mesh(quarter, faceMat(2));                // vertical face at angle 0 (plane z=0, x>0, y>0)
  const faceB: FaceMesh = new THREE.Mesh(quarter, faceMat(2));                // vertical face at the moving angle (rotates with uCut)
  const faceH: FaceMesh = new THREE.Mesh(quarter, faceMat(0));                // horizontal face (y=0), span follows uCut
  faceH.rotation.x = Math.PI / 2;                                              // local x→x, local y→+z (the wedge quadrant)
  faceB.rotation.y = 0;                                                        // set per frame
  for (const f of [faceA, faceB, faceH]) { f.renderOrder = 20; f.material.polygonOffset = true; f.material.polygonOffsetFactor = -12; f.material.polygonOffsetUnits = -4; group.add(f); }
  return { group, shells, faces: [faceA, faceB, faceH], faceH, faceB, layers, amount: 0, target: 0, tm: 0 };
}

/** One project rendered as a planet: the groups, shader meshes and cutaway `makeBody` builds. */
export interface Body {
  root: THREE.Group; tilt: THREE.Group; spin: THREE.Group;
  planet: ShaderMesh<THREE.SphereGeometry, PlanetUniforms>; atmo: ShaderMesh<THREE.SphereGeometry, AtmoUniforms>;
  ring: ShaderMesh<THREE.RingGeometry, RingUniforms> | null; cut: Cutaway; size: number; cfg: PlanetFull;
  /** Radians per second, from `spin` or from what the body's index used to give it. */
  spinRate: number;
  /** The same, at the slightly brisker rate the planet strip has always used. */
  stripSpinRate: number;
  /** Outer radius as a multiple of `size`, so a view can frame a thicker atmosphere. */
  extent: number;
  /** The resolved atmosphere thickness, for views that frame the shell rather than the ring. */
  atmoT: number;
  /** Moons, in row order. Empty on a body with none: no geometry, no group, no uniforms, no frame work. */
  moons: readonly MoonBody[];
  /** What they hang from, so one flag hides the lot while the cutaway wedge is open. */
  moonRoot: THREE.Group | null;
}

const DEG = Math.PI / 180;
const TURNS = (Math.PI * 2) / 60;   // turns per minute → radians per second

/**
 * What each of the optional planet parameters means when the row does not set it. These are read off
 * the shader and the animation loops as they were before the fields existed, several of them derived
 * from the body's index, which is why they cannot simply be constants in the schema.
 */
export function planetDefaults(i: number): { seed: number; spinRate: number; stripSpinRate: number; tilt: number; atmo: number; atmoAlpha: number; glow: number; bands: number; bandSharp: number } {
  return {
    seed: i * 7.31 + 2.0,
    spinRate: 0.22 + (i % 3) * 0.07,
    stripSpinRate: 0.3 + (i % 3) * 0.08,
    tilt: ((i * 0.37) % 0.6) - 0.3,
    atmo: 0.14,
    atmoAlpha: 0.28,
    glow: 1,
    bands: 14,
    bandSharp: 0,
  };
}

// ── moons ───────────────────────────────────────────────
// One per meaningful nested child folder in the repository. Everything about a moon is relative to its
// planet — `size` and `orbit` are multiples of the planet's radius — so the same row reads correctly
// under all three scale modes.

/** A moon may not be more than this fraction of its planet's radius, or it starts hiding the planet. */
const MOON_SIZE_CAP = 0.32;
/** Shared, so a planet with no moons allocates nothing for the uniform it never declares. */
const NO_MOONS = new Float32Array(0);

let moonGeoCache: THREE.SphereGeometry | null = null;
/** Built by the first moon anywhere and shared from then on; a system with none never builds it. */
const moonGeometry = (): THREE.SphereGeometry => (moonGeoCache ??= new THREE.SphereGeometry(1, 24, 18));

export interface MoonBody {
  cfg: MoonConfig;
  mesh: ShaderMesh<THREE.SphereGeometry, MoonUniforms>;
  /** Radius and orbit radius, in scene units at the planet's own scale. */
  size: number; dist: number;
  /** Radians per second, and where on the orbit it starts. */
  omega: number; phase: number;
  /** sin and cos of the inclination, so a frame costs one sin, one cos and three multiplies. */
  st: number; ct: number;
  /** Hover/focus glow: the target a pointer sets, and the eased value the shader and the scale read. */
  want: number; hot: number;
  /** Eased label opacity. A hard 0/1 from the collision test made the name flicker as the moon orbited. */
  labK: number;
}

/** The moons a row asks to draw: visible ones, in the order given, capped at `MOON_MAX`. */
export function moonsOf(p: ProjectFull): readonly MoonConfig[] {
  return visibleMoons(p.moons ?? p.planet.moons);
}

/**
 * `floor` is the smallest orbit that clears the atmosphere shell and any ring. A row that leaves
 * `phase` at zero — which detection has no reason to set — would stack every moon of a repository on
 * one point, so an unset phase is fanned out by index instead; a phase the admin actually chose wins.
 */
function makeMoon(m: MoonConfig, i: number, k: number, of: number, planetSize: number, floor: number, shine: number): MoonBody {
  const size = planetSize * Math.min(Math.max(m.size, 0.04), MOON_SIZE_CAP);
  const dist = Math.max(planetSize * Math.min(Math.max(m.orbit, 1.15), 16), floor + size * 1.5);
  const base = new THREE.Color(m.colour);
  const mesh: ShaderMesh<THREE.SphereGeometry, MoonUniforms> = new THREE.Mesh(moonGeometry(),
    new ShaderMat<MoonUniforms>({ vertexShader: V_WORLD, fragmentShader: MOON_FRAG,
      uniforms: {
        uC0: { value: base.clone().multiplyScalar(0.7) },
        uC1: { value: base.clone().offsetHSL(0, -0.08, 0.16) },
        uShine: { value: new THREE.Color(shine).multiplyScalar(0.5) },
        uType: { value: TYPE[m.type] }, uSeed: { value: i * 13.7 + k * 4.31 + 1.0 },
        uTime: { value: 0 }, uHot: { value: 0 },
        uPlanet: { value: new THREE.Vector3() }, uPlanetR: { value: planetSize },
      } }));
  mesh.scale.setScalar(size);
  const tilt = m.tilt * DEG;
  const phase = m.phase === 0 ? (k * Math.PI * 2) / Math.max(1, of) : m.phase * DEG;
  return { cfg: m, mesh, size, dist, omega: m.speed * TURNS, phase, st: Math.sin(tilt), ct: Math.cos(tilt), want: 0, hot: 0, labK: 0 };
}

/**
 * Where a moon sits at time `t`, in its planet's local frame. The orbit is a circle inclined about the
 * planet's +X axis, so `tilt` 0 is the orbital plane and 90° is polar.
 */
export function moonAt(m: MoonBody, t: number, out: THREE.Vector3): number {
  const a = m.phase + m.omega * t;
  const c = Math.cos(a), s = Math.sin(a);
  out.set(c * m.dist, s * m.dist * m.st, s * m.dist * m.ct);
  return a;
}

const moonLocal = new THREE.Vector3();
/**
 * One moon's frame, shared by the deck and by the reading site's views: advance the orbit, aim the
 * locked face, ease the hover glow, and hand back the world centre in `out`.
 *
 * That centre comes off the moon's own world matrix, not from arithmetic on the planet's position,
 * because the shadow and earthshine uniforms are read in world space and the reading site's views
 * rotate `root` to let you turn the planet. The deck leaves `root` unrotated, so for it the matrix and
 * the arithmetic are the same three multiply-adds and nothing about it changes.
 */
export function stepMoon(mn: MoonBody, t: number, dt: number, planetC: THREE.Vector3, planetR: number, planetHot: number, out: THREE.Vector3): void {
  mn.hot += (mn.want - mn.hot) * Math.min(1, dt * 12);
  const ang = moonAt(mn, t, moonLocal);
  mn.mesh.position.copy(moonLocal);
  mn.mesh.rotation.y = -ang;                                      // tidally locked: one face to the planet
  mn.mesh.scale.setScalar(mn.size * (1 + 0.14 * mn.hot));         // a hovered moon swells enough to read as picked
  const u = mn.mesh.material.uniforms;
  u.uTime.value = t; u.uHot.value = Math.max(planetHot, mn.hot);
  u.uPlanet.value.copy(planetC); u.uPlanetR.value = planetR;
  mn.mesh.getWorldPosition(out);
}
/** The world radius `stepMoon` just gave the moon, for the shadow slot and for screen-radius maths. */
export const moonRadius = (mn: MoonBody, scale: number): number => mn.size * (1 + 0.14 * mn.hot) * scale;

/**
 * What a scale arrangement wants to say about one body instead of the stored row. Only the fields the
 * arrangement actually computes are here; everything else still comes from the project's own config.
 */
export interface BodyOverride {
  size?: number; tilt?: number; spin?: number; type?: PlanetType; ring?: RingConfig;
  /** The star this body orbits, so no stored size can produce a planet larger than it. */
  sunRadius?: number;
  /** Draw the row's moons. Off by default, so the reading site's views stay the geometry they were. */
  moons?: boolean;
}

// One project → one body: tilt/spin groups, shader planet, atmosphere shell, cutaway group, optional ring.
// Lighting comes from the world origin (the sun), so the body must sit away from (0,0,0).
export function makeBody(p: ProjectFull, i: number, over?: BodyOverride): Body {
  const cfg: PlanetFull = over
    ? { ...p.planet, ...(over.type ? { type: over.type } : {}), ...(over.size === undefined ? {} : { size: over.size }),
        ...(over.tilt === undefined ? {} : { tilt: over.tilt }), ...(over.spin === undefined ? {} : { spin: over.spin }),
        ...(over.ring && !p.planet.ring ? { ring: over.ring } : {}) }
    : p.planet;
  // the last line of the "nothing may outgrow its star" rule the API and the admin also enforce
  const size = clampPlanetSize(cfg.size * PLANET_SCALE, over?.sunRadius ?? SUN_R_DEFAULT);
  const d = planetDefaults(i);
  const atmoT = cfg.atmo ?? d.atmo;
  // the moon count decides the planet's shader variant, so it has to be known before the material
  const moonCfg = over?.moons ? moonsOf(p) : [];
  const root = new THREE.Group();

  const tilt = new THREE.Group(); tilt.rotation.z = cfg.tilt === undefined ? d.tilt : cfg.tilt * DEG;
  const spin = new THREE.Group();
  tilt.add(spin); root.add(tilt);

  const mat = new ShaderMat<PlanetUniforms>({ vertexShader: V_WORLD, fragmentShader: planetFrag(moonCfg.length),
    uniforms: {
      uC0: { value: new THREE.Color(cfg.c0) }, uC1: { value: new THREE.Color(cfg.c1) }, uC2: { value: new THREE.Color(cfg.c2) }, uC3: { value: new THREE.Color(cfg.c3) },
      uRim: { value: new THREE.Color(cfg.rim) }, uType: { value: TYPE[cfg.type] }, uSeed: { value: cfg.seed ?? d.seed },
      uTime: { value: 0 }, uHot: { value: 0 }, uOcean: { value: cfg.ocean ?? 0 }, uCloud: { value: cfg.cloud ?? 0 }, uCrater: { value: cfg.crater ?? 0 }, uVein: { value: cfg.vein ?? 0 },
      uGlow: { value: cfg.glow ?? d.glow }, uBands: { value: cfg.bands ?? d.bands }, uBandSharp: { value: cfg.bandSharp ?? d.bandSharp },
      uRingOn: { value: cfg.ring ? 1 : 0 }, uRingN: { value: new THREE.Vector3(0, 1, 0) }, uPlanetC: { value: new THREE.Vector3() }, uRingIn: { value: 0 }, uRingOut: { value: 0 },
      uMoons: { value: moonCfg.length > 0 ? new Float32Array(moonCfg.length * 4) : NO_MOONS },
      ...cutUniforms(),
    } });
  const planet = new THREE.Mesh(sphereGeo, mat); planet.scale.setScalar(size); spin.add(planet);
  const atmo = new THREE.Mesh(sphereGeo, new ShaderMat<AtmoUniforms>({ vertexShader: V_WORLD, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uRim: { value: new THREE.Color(cfg.rim) }, uHot: { value: 0 }, uAlpha: { value: cfg.atmoAlpha ?? d.atmoAlpha }, ...cutUniforms() } }));
  atmo.scale.setScalar(size * (1 + atmoT)); root.add(atmo);
  const cut = buildCutaway(p, size, i);
  root.add(cut.group);

  let ring: Body["ring"] = null;
  if (cfg.ring) {
    const inner = size * cfg.ring.inner, outer = size * cfg.ring.outer;
    ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 320, 1), new ShaderMat<RingUniforms>({ vertexShader: V_WORLD, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uMap: { value: ringProfile(cfg.ring, i) }, uInner: { value: inner }, uOuter: { value: outer }, uHot: { value: 0 }, uPlanet: { value: new THREE.Vector3() }, uPlanetR: { value: size }, uSeed: { value: i * 3.7 } } }));
    ring.rotation.x = Math.PI / 2 + cfg.ring.tilt;
    tilt.add(ring);
  }

  // moons hang off `root`, not off `tilt` or `spin`: they travel with the planet but owe nothing to
  // its axis or its day, and their own orbital inclination is their `tilt`
  let moonRoot: THREE.Group | null = null;
  const moons: MoonBody[] = [];
  if (moonCfg.length > 0) {
    const floor = size * Math.max(1 + atmoT, cfg.ring ? cfg.ring.outer + 0.12 : 0);
    moonRoot = new THREE.Group();
    for (let k = 0; k < moonCfg.length; k++) {
      const mn = makeMoon(moonCfg[k], i, k, moonCfg.length, size, floor, cfg.rim);
      moons.push(mn); moonRoot.add(mn.mesh);
    }
    root.add(moonRoot);
  }

  return {
    root, tilt, spin, planet, atmo, ring, cut, size, cfg, moons, moonRoot,
    spinRate: cfg.spin === undefined ? d.spinRate : cfg.spin * TURNS,
    stripSpinRate: cfg.spin === undefined ? d.stripSpinRate : cfg.spin * TURNS,
    extent: cfg.ring ? cfg.ring.outer : Math.max(1.22, 1 + atmoT + 0.08), atmoT,
  };
}

/** Write the cutaway wedge into a material's cut uniforms. Shared by the deck and the planet views. */
export function applyCut(u: CutUniforms, amount: number, centre: THREE.Vector3, cx: THREE.Vector3, cz: THREE.Vector3): void {
  u.uCut.value = amount; u.uCutC.value.copy(centre); u.uCutX.value.copy(cx); u.uCutZ.value.copy(cz);
}

function disposeMaterial(m: THREE.Material): void {
  if (m instanceof THREE.ShaderMaterial) {
    for (const key of Object.keys(m.uniforms)) { const v: unknown = m.uniforms[key].value; if (v instanceof THREE.Texture) v.dispose(); }
  } else if (m instanceof THREE.SpriteMaterial && m.map) m.map.dispose();
  m.dispose();
}
/** Free GPU resources under `root`. The shared unit and moon spheres are kept — other bodies use them. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Sprite) { disposeMaterial(o.material); return; }   // sprites share one static geometry
    if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points) {
      const g: THREE.BufferGeometry = o.geometry; if (g !== sphereGeo && g !== moonGeoCache) g.dispose();
      const m: THREE.Material | THREE.Material[] = o.material; (Array.isArray(m) ? m : [m]).forEach(disposeMaterial);
    }
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** FNV-1a. Repositories must land on the same patch of sky on every load, so the seed is the name. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
// one flight profile, used in both directions so out and back are exact mirrors: a smooth
// build (no lurch), a broad peak, a smooth brake. speed01 = normalised |velocity|.
const flightCurve = (t: number) => { const u = clamp01(t); return u * u * u * (u * (u * 6 - 15) + 10); }; // smootherstep
const easeOut = flightCurve, easeBack = flightCurve;
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function speedOf(fn: (t: number) => number, t: number): number { const h = 0.002; return (fn(Math.min(1, t + h)) - fn(Math.max(0, t - h))) / (2 * h); }
const vmax = (fn: (t: number) => number) => { let m = 0; for (let i = 0; i <= 400; i++) m = Math.max(m, speedOf(fn, i / 400)); return m; };
const VMAX_OUT = vmax(easeOut), VMAX_BACK = vmax(easeBack);
// flight time grows with distance: a hop to the next orbit is short, crossing the system is long
const flightDuration = (dist: number) => Math.min(4.6, Math.max(1.5, 0.9 + dist * 0.0175));

// ───────────────────────── scene ─────────────────────────

interface SceneBody extends Body {
  p: ProjectFull; pick: THREE.Mesh; el: HTMLButtonElement; theta0: number; r: number; omega: number;
  hot: number; mix: number; spinT: number; orbitPos: THREE.Vector3; stackPos: THREE.Vector3; pos: THREE.Vector3;
  /** One per moon, in the same order. Empty on a body with no moons — no nodes are made. */
  moonEls: readonly HTMLElement[];
  /** Eased 0→1: how loudly this body's moon labels are showing. */
  moonLab: number;
}
interface Flight {
  active: boolean; stopped: boolean; t: number; dur: number; kind: "out" | "back";
  from: THREE.Vector3; to: THREE.Vector3; lookFrom: THREE.Vector3; lookTo: THREE.Vector3; onDone: (() => void) | null;
}
interface Comet { active: boolean; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; next: number; hist: THREE.Vector3[] }

/** A ring for a body the arrangement says is ringed but whose row never drew one. */
const arrangedRing = (p: ProjectFull): RingConfig => ({ ca: p.planet.c2, cb: p.planet.c3, inner: 1.42, outer: 2.35, tilt: 0.12 });

export function createSystem({ canvas, labelsEl, projects, scene: cfg, repoStars, onSelect, onSunSelect, onFlightEvent, onBeltLevel, reducedMotion = false }: SystemOptions): SystemApi {
  // everything the admin can change; anything it does not set keeps the original constant
  const FOV = cfg?.fov ?? FOV_DEFAULT;
  const orbitScale = cfg?.orbitScale ?? 1;
  const stored = (cfg?.orbits?.length ? cfg.orbits : DEFAULT_ORBITS).map((r) => r * orbitScale);
  const mode: ScaleMode = cfg?.scaleMode ?? "stylised";
  // One arrangement decides sizes, orbits, tilts, spins, the belt and what a scene unit is worth. In
  // `stylised` only its auPerUnit is taken, so the stored orbits and sizes still draw the picture; in
  // `relative` and `real` the arrangement wins and the per-project numbers stop having any effect.
  const layout: Arrangement = arrange(mode, {
    count: projects.length,
    outerRadius: Math.max(20, ...stored),
    spanAu: cfg?.spanAu ?? 30,
    sunRadius: cfg?.sunRadius ?? SUN_R_DEFAULT,
  });
  const arranged = mode !== "stylised";
  const bodyLayout = (i: number) => layout.bodies[Math.min(i, layout.bodies.length - 1)];
  const SUN_R = arranged ? layout.sunRadius : (cfg?.sunRadius ?? SUN_R_DEFAULT);
  // in `real` the star is a speck; the camera pose and the click target still need something to aim at
  const SUN_FRAME = Math.max(SUN_R, 2.5);
  const ORBITS = projects.map((_, i) => (arranged ? bodyLayout(i).orbit : stored[i] ?? DEFAULT_ORBITS[i] ?? 20));
  const BELT_R = arranged ? layout.belt.radius : (cfg?.beltRadius ?? BELT_R_DEFAULT);
  const BELT_W = Math.max(0.5, arranged ? layout.belt.width : (cfg?.beltWidth ?? 9));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 4000);
  scene.add(camera);

  const disc = discTexture();
  const uFade: U<number> = { value: 1 };
  const nebulaTint = new THREE.Color(NEON_A);

  // nebula sky
  const nebula = new THREE.Mesh(new THREE.SphereGeometry(1700, 48, 32),
    new ShaderMat<NebulaUniforms>({ vertexShader: NEBULA_VERT, fragmentShader: NEBULA_FRAG, side: THREE.BackSide, depthWrite: false,
      uniforms: { uA: { value: new THREE.Color(cfg?.nebulaA ?? 0x3b0764) }, uB: { value: new THREE.Color(cfg?.nebulaB ?? 0x0b2f6e) }, uTint: { value: nebulaTint }, uMix: { value: 0 }, uFade, uTime: { value: 0 } } }));
  scene.add(nebula);

  // twinkling stars
  const STARS = Math.max(200, Math.min(20000, cfg?.starCount ?? 4200));
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
  const starMat = new ShaderMat<StarUniforms>({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uMap: { value: disc } } });
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
  const streakMat = new ShaderMat<StreakUniforms>({ vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uStretch: { value: 0 }, uVanish: { value: new THREE.Vector2(0, 0) }, uOpacity: { value: 0 }, uTime: { value: 0 } } });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false; streaks.visible = false;
  stars.add(streaks); // inherits the slow sky rotation

  // ── constellations: one star per other repository, sized by its commit count, joined by main language.
  // Two draw calls behind everything else; with no repositories to draw the sky is the plain starfield.
  let conMat: ShaderMat<StarUniforms> | null = null;
  if ((cfg?.constellations ?? true) && repoStars && repoStars.length > 0) {
    const gain = Math.max(0, cfg?.constellationGain ?? 1);
    const R = 1560;                                    // beyond the starfield, inside the nebula sky
    const n = repoStars.length;
    const cp = new Float32Array(n * 3), cc = new Float32Array(n * 3), cph = new Float32Array(n), csz = new Float32Array(n);
    const col = new THREE.Color(), places: THREE.Vector3[] = [];
    repoStars.forEach((rs, i) => {
      const h = hash32(rs.name) / 4294967296, h2 = hash32(`${rs.name}·sky`) / 4294967296;
      const th = h * Math.PI * 2, cy = h2 * 1.7 - 0.85, sy = Math.sqrt(Math.max(0, 1 - cy * cy));
      const at = new THREE.Vector3(Math.cos(th) * sy * R, cy * R, Math.sin(th) * sy * R);
      places.push(at);
      cp[i * 3] = at.x; cp[i * 3 + 1] = at.y; cp[i * 3 + 2] = at.z;
      const mag = clamp01(Math.log1p(Math.max(0, rs.commits)) / Math.log(600));
      const lift = clamp01(Math.log1p(Math.max(0, rs.stars)) / Math.log(200)) * 0.18;
      col.setHex(rs.colour).multiplyScalar(Math.min(1.15, 0.3 + 0.75 * mag + lift));
      cc[i * 3] = col.r; cc[i * 3 + 1] = col.g; cc[i * 3 + 2] = col.b;
      cph[i] = h2;
      csz[i] = (1.6 + 5.0 * mag) * gain;
    });
    const conGeo = new THREE.BufferGeometry();
    conGeo.setAttribute("position", new THREE.BufferAttribute(cp, 3));
    conGeo.setAttribute("aColor", new THREE.BufferAttribute(cc, 3));
    conGeo.setAttribute("aPhase", new THREE.BufferAttribute(cph, 1));
    conGeo.setAttribute("aSize", new THREE.BufferAttribute(csz, 1));
    conMat = new ShaderMat<StarUniforms>({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uMap: { value: disc } } });
    const conStars = new THREE.Points(conGeo, conMat);
    conStars.frustumCulled = false; conStars.renderOrder = -1;
    conStars.raycast = () => undefined;                // background art: it must never take a click
    stars.add(conStars);

    // one figure per language, chained nearest-first so it reads as a constellation rather than a fan
    const byLang = new Map<string, number[]>();
    repoStars.forEach((rs, i) => { const k = rs.language || "Other"; const a = byLang.get(k); if (a) a.push(i); else byLang.set(k, [i]); });
    const lp: number[] = [], lc: number[] = [];
    for (const idx of byLang.values()) {
      if (idx.length < 2) continue;
      const rest = idx.slice(1);
      let cur = idx[0];
      while (rest.length > 0) {
        let bi = 0, bd = Infinity;
        for (let k = 0; k < rest.length; k++) { const dd = places[cur].distanceToSquared(places[rest[k]]); if (dd < bd) { bd = dd; bi = k; } }
        const nx = rest.splice(bi, 1)[0];
        if (bd < (R * 1.1) ** 2) {                     // a line across the whole dome reads as noise, not a figure
          const a = places[cur], b = places[nx];
          lp.push(a.x, a.y, a.z, b.x, b.y, b.z);
          col.setHex(repoStars[cur].colour).multiplyScalar(0.5);
          lc.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }
        cur = nx;
      }
    }
    if (lp.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
      lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
      const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16 * Math.min(1.5, gain), depthWrite: false, blending: THREE.AdditiveBlending }));
      lines.frustumCulled = false; lines.renderOrder = -1;
      lines.raycast = () => undefined;
      stars.add(lines);
    }
  }

  // sun
  const sunCore = new THREE.Color(cfg?.sunColorCore ?? 0xffc978);
  const sunEdge = new THREE.Color(cfg?.sunColorEdge ?? 0xff2bd6);
  const sunMid = cfg?.sunColorMid === undefined ? sunCore.clone().lerp(sunEdge, 0.5) : new THREE.Color(cfg.sunColorMid);
  const uPulse: U<number> = { value: 0 };          // flare(), shared by the photosphere and the corona
  const uCoronaK: U<number> = { value: cfg?.sunCorona ?? 1 };
  const uFlareK: U<number> = { value: cfg?.sunFlare ?? 1 };
  const sunMat = new ShaderMat<SunUniforms>({ vertexShader: V_WORLD, fragmentShader: SUN_FRAG,
    uniforms: {
      uCore: { value: sunCore }, uMid: { value: sunMid }, uEdge: { value: sunEdge }, uTime: { value: 0 }, uFade,
      uGran: { value: cfg?.sunGranulation ?? 1 }, uLimb: { value: cfg?.sunLimb ?? 1 }, uSpots: { value: cfg?.sunSpots ?? 0 },
      uSpin: { value: cfg?.sunSpin ?? 1 }, uFlare: uFlareK, uPulse, uR: { value: SUN_R },
    } });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 96, 96), sunMat);
  scene.add(sun);
  // the corona shell, and an invisible sphere that keeps the star clickable when it is a speck
  const corona = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 4.0, 48, 32),
    new ShaderMat<CoronaUniforms>({ vertexShader: V_WORLD, fragmentShader: CORONA_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uMid: { value: sunMid }, uEdge: { value: sunEdge }, uR: { value: SUN_R }, uTime: { value: 0 }, uFade, uCorona: uCoronaK, uFlare: uFlareK, uPulse } }));
  scene.add(corona);
  const sunPick = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  sunPick.scale.setScalar(Math.max(SUN_R * 1.02, 2.4));
  scene.add(sunPick);
  const coronaA = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: 0xff2bd6, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
  coronaA.scale.setScalar(SUN_R * 7.5);
  const coronaB = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: 0xffb06b, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  coronaB.scale.setScalar(SUN_R * 3.6);
  scene.add(coronaA, coronaB);
  const streakTex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 32; const g = ctx2d(c); const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "rgba(255,180,220,0)"); gr.addColorStop(0.5, "rgba(255,220,240,1)"); gr.addColorStop(1, "rgba(255,180,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 32); const gv = g.createLinearGradient(0, 0, 0, 32); gv.addColorStop(0, "rgba(0,0,0,1)"); gv.addColorStop(0.5, "rgba(0,0,0,0)"); gv.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gv; g.fillRect(0, 0, 512, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const anamorphic = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex, color: 0xff9be0, transparent: true, opacity: 0.35, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  anamorphic.scale.set(SUN_R * 22, SUN_R * 0.9, 1);
  scene.add(anamorphic);
  scene.add(new THREE.PointLight(0xffd9c0, 12500 * (cfg?.sunIntensity ?? 1), 0, 2), new THREE.AmbientLight(0x2a2a44, 0.8));

  // orbit lines
  const rings = ORBITS.map((r) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 360; i++) { const a = (i / 360) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const mat = new THREE.LineBasicMaterial({ color: WHITE.clone(), transparent: true, opacity: 0.1 });
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
    scene.add(line);
    return { line, mat, hot: 0 };
  });

  // asteroid belt: rocks spread across BELT_W with a thin vertical scatter, tinted off one base colour
  const BELT = Math.max(100, Math.min(8000, cfg?.beltDensity ?? 2200));
  const beltThick = Math.max(0, cfg?.beltThickness ?? 1.2);
  const rockK = Math.max(0.05, cfg?.beltRockSize ?? 1);
  const beltHex = cfg?.beltColor ?? 0x5a5e69;
  const belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05, flatShading: true }), BELT);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
    const tint = new THREE.Color();
    // three uniform draws averaged: the rocks crowd the middle of the belt the way a real one does
    const bell = () => (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
    for (let i = 0; i < BELT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = BELT_R + bell() * BELT_W;                       // width and thickness are full extents
      pos.set(Math.cos(a) * r, bell() * beltThick, Math.sin(a) * r);
      e.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28); q.setFromEuler(e);
      const k = (0.08 + Math.pow(Math.random(), 3) * 0.4) * rockK; s.set(k, k * (0.6 + Math.random() * 0.8), k);
      m.compose(pos, q, s); belt.setMatrixAt(i, m);
      belt.setColorAt(i, tint.setHex(beltHex).multiplyScalar(0.6 + Math.random() * 0.7));
    }
    belt.instanceMatrix.needsUpdate = true;
    if (belt.instanceColor) belt.instanceColor.needsUpdate = true;
  }
  belt.rotation.x = (cfg?.beltTilt ?? 0) * DEG;   // Euler XYZ: the per-frame y spin happens inside this tilt
  scene.add(belt);

  // comet — a head sprite trailing a fading line; crosses the sky every so often
  const COMET_N = 70;
  const cometPos = new Float32Array(COMET_N * 3), cometCol = new Float32Array(COMET_N * 3);
  const cometGeo = new THREE.BufferGeometry();
  const cometPosAttr = new THREE.BufferAttribute(cometPos, 3), cometColAttr = new THREE.BufferAttribute(cometCol, 3);
  cometGeo.setAttribute("position", cometPosAttr);
  cometGeo.setAttribute("color", cometColAttr);
  const cometTrail = new THREE.Line(cometGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const cometHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: 0xdff6ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  cometHead.scale.setScalar(2.6);
  cometTrail.frustumCulled = false;
  scene.add(cometTrail, cometHead);
  const comet: Comet = { active: false, t: 0, dur: 7, from: new THREE.Vector3(), to: new THREE.Vector3(), next: 6 + Math.random() * 8, hist: [] };
  function spawnComet() {
    const a = Math.random() * Math.PI * 2, y = 25 + Math.random() * 70;
    comet.from.set(Math.cos(a) * 320, y, Math.sin(a) * 320);
    comet.to.set(Math.cos(a + 2.4 + Math.random()) * 320, y - 25 - Math.random() * 50, Math.sin(a + 2.4 + Math.random()) * 320);
    comet.t = 0; comet.active = true; comet.hist.length = 0; comet.dur = 6 + Math.random() * 4;
  }
  function updateComet(dt: number) {
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
    cometPosAttr.needsUpdate = true; cometColAttr.needsUpdate = true;
    cometHead.position.copy(p); cometHead.material.opacity = fade;
    cometHead.visible = cometTrail.visible = true;
    if (comet.t >= 1) comet.active = false;
  }

  // ── interaction + flight state (declared before the labels so their handlers can read it)
  let rayHot = -1, hotHover = -1, hotIdx = -1, focusIdx = -1, sunHot = false, sunFocus = false;
  /** Which body's which moon. A moon is a folder, so picking one names it rather than flying anywhere. */
  interface MoonRef { b: number; k: number }
  let moonHot: MoonRef | null = null, moonFocus: MoonRef | null = null;
  const isMoon = (r: MoonRef | null, i: number, k: number): boolean => r !== null && r.b === i && r.k === k;
  let active = false, dragging = false, dragMoved = false, dragX = 0, dragY = 0, lastDragX = 0, lastDragY = 0;
  // how far a press may travel and still count as a tap; a finger is never as still as a mouse
  let dragSlop = 6;
  let w = 1, h = 1;
  const flight: Flight = { active: false, stopped: false, t: 0, dur: 2.2, kind: "out", from: new THREE.Vector3(), to: new THREE.Vector3(), lookFrom: new THREE.Vector3(), lookTo: new THREE.Vector3(), onDone: null };
  const inspect = { yaw: 0, pitch: 0 };

  // planets
  let domHot = -1;
  const bodies: SceneBody[] = projects.map((p, i) => {
    const r = ORBITS[i];
    const omega = 0.06 * Math.pow(ORBITS[0] / r, 1.5);   // Kepler-ish: the period grows with r^1.5
    const theta0 = (i * 2.399) % (Math.PI * 2);
    const L = bodyLayout(i);
    // in an arranged mode the layout supplies the body; a ring is only ever added, never taken away,
    // because a stored ring is a drawing decision and its colours are not the arrangement's to guess
    const body = makeBody(p, i, arranged
      ? { size: L.size, tilt: L.tilt, spin: L.spin, type: L.type, ring: L.ringed ? arrangedRing(p) : undefined, sunRadius: SUN_R, moons: true }
      : { sunRadius: SUN_R, moons: true });
    const pick = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    // a fat click target, but never so fat that neighbouring orbits overlap (they do at real scale)
    pick.scale.setScalar(Math.max(body.size * 1.3, Math.min(2.4, r * 0.35))); body.root.add(pick);
    scene.add(body.root);

    const el = document.createElement("button");
    el.type = "button"; el.className = "lab";
    el.setAttribute("aria-label", `${p.title} — ${p.tagline}`);
    const name = document.createElement("span"); name.className = "lab__name"; name.textContent = p.title;
    const sub = document.createElement("span"); sub.className = "lab__sub"; sub.textContent = p.tagline;
    el.append(name, sub);
    el.tabIndex = -1;
    el.addEventListener("pointerenter", () => { domHot = i; });
    el.addEventListener("pointerleave", () => { domHot = domHot === i ? -1 : domHot; });
    // the label is a target from any state; the deck decides whether that means fly, re-aim or refuse
    el.addEventListener("click", (e) => { e.stopPropagation(); if (active) onSelect?.(p); });
    labelsEl.appendChild(el);

    // Moon labels are the planet's own machinery, one class quieter: same `.lab` markup, no tagline,
    // no pointer target, and a smaller type size set here so the deck's stylesheet needs no new rule.
    // The `.lab__sub` line carries the folder the moon was detected from, and `.lab.is-hot` — the rule
    // the planet labels already have — is what reveals it once the pointer picks the moon.
    const moonEls = body.moons.map((mn) => {
      const ml = document.createElement("div");
      ml.className = "lab lab--moon";
      ml.setAttribute("aria-hidden", "true");                   // the planet's own label already names the project
      ml.style.pointerEvents = "none"; ml.style.fontSize = "8px"; ml.style.letterSpacing = ".2em"; ml.style.opacity = "0";
      const mname = document.createElement("span"); mname.className = "lab__name"; mname.textContent = mn.cfg.name;
      mname.style.pointerEvents = "none"; mname.style.padding = "1px 5px";
      ml.append(mname);
      if (mn.cfg.path) {
        const msub = document.createElement("span"); msub.className = "lab__sub"; msub.textContent = `/${mn.cfg.path}`;
        msub.style.pointerEvents = "none"; msub.style.fontSize = "8px"; msub.style.padding = "1px 5px";
        ml.append(msub);
      }
      labelsEl.appendChild(ml);
      return ml;
    });

    return { ...body, p, pick, el, theta0, r, omega, hot: 0, mix: 0, spinT: 0, moonEls, moonLab: 0,
      orbitPos: new THREE.Vector3(), stackPos: new THREE.Vector3(), pos: new THREE.Vector3() };
  });
  bodies.forEach((b, i) => { const t = bodies.length === 1 ? 0.5 : i / (bodies.length - 1); b.stackPos.set(-60, 32 - t * 64, 14); });

  const travelDir = new THREE.Vector3(0, 0, -1);

  // post
  // The composer owns the render path, so the renderer's own `antialias` never runs — every planet edge
  // and ring line crawls without this. three's default target is already HalfFloat; what it lacks is
  // multisampling, and that is the whole difference on a silhouette.
  const aaSamples = lowPower() ? 0 : 4;
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: aaSamples });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // Threshold 0.8 let a lit planet bloom, which is why every body wore a halo — a planet reflects light,
// it does not emit it. At 1.15 only the star, its corona and the lava veins cross the line.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5 * (cfg?.bloom ?? 1), 0.5, 1.15);
  composer.addPass(bloom);
  const blurU: BlurUniforms = { tDiffuse: { value: null }, uStrength: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } };
  const blur = new ShaderPass(new ShaderMat<BlurUniforms>({ uniforms: blurU, vertexShader: POST_VERT, fragmentShader: RADIAL_BLUR_FRAG }));
  blur.enabled = false;
  composer.addPass(blur);
  const rgbU: RgbUniforms = { tDiffuse: { value: null }, uAmount: { value: 0 }, uVignette: { value: 0 }, uFlash: { value: 0 }, uDim: { value: 0 }, uGlow: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } };
  const rgb = new ShaderPass(new ShaderMat<RgbUniforms>({ uniforms: rgbU, vertexShader: POST_VERT, fragmentShader: RGB_SHIFT_FRAG }));
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
  const stage: HTMLElement = canvas.parentElement ?? canvas;
  const setNdc = (e: PointerEvent | MouseEvent) => { const rect = canvas.getBoundingClientRect(); ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); pointer.copy(ndc); };
  const onStageMove = (e: PointerEvent) => {
    setNdc(e);
    if (dragging) {
      const dx = e.clientX - dragX, dy = e.clientY - dragY;
      if (Math.hypot(e.clientX - lastDragX, e.clientY - lastDragY) > dragSlop) dragMoved = true;
      if (focusIdx >= 0) { inspect.yaw += dx * 0.006; inspect.pitch = Math.min(1.2, Math.max(-1.2, inspect.pitch + dy * 0.004)); }
      else { view.theta -= dx * 0.0045; view.vel = -dx * 0.0045; view.phiOff = Math.min(0.5, Math.max(-0.2, view.phiOff + dy * 0.002)); }
      dragX = e.clientX; dragY = e.clientY;
    }
  };
  const onStageLeave = () => { ndc.set(-10, -10); rayHot = -1; sunHot = false; };
  // a touch screen has no hover, so the press itself has to aim: setNdc first and the next frame's
  // raycast lights whatever is under the finger, whether or not this press turns into a drag
  const onCanvasDown = (e: PointerEvent) => {
    setNdc(e);
    if (!active || sunFocus || flight.active) return;
    if (focusIdx >= 0 && !(bodies[focusIdx].cut.target > 0)) return;
    dragging = true; dragMoved = false; dragSlop = e.pointerType === "mouse" ? 6 : 14;
    dragX = lastDragX = e.clientX; dragY = lastDragY = e.clientY; view.vel = 0; canvas.classList.add("is-dragging");
  };
  const onWindowUp = () => { dragging = false; canvas.classList.remove("is-dragging"); };
  stage.addEventListener("pointermove", onStageMove);
  stage.addEventListener("pointerleave", onStageLeave);
  canvas.addEventListener("pointerdown", onCanvasDown);
  window.addEventListener("pointerup", onWindowUp);
  const pickables = bodies.map((b) => b.pick);
  function pickAt(): Pick | null {
    raycaster.setFromCamera(ndc, camera);
    const sunHit: THREE.Intersection | undefined = raycaster.intersectObject(sunPick, false)[0];
    const hits = raycaster.intersectObjects(pickables, false);
    let best: THREE.Intersection | null = null, bestIdx = -1;
    for (const hh of hits) {
      const idx = pickables.findIndex((m) => m === hh.object);
      if (idx < 0) continue;
      const b = bodies[idx];
      const real = raycaster.ray.distanceToPoint(b.pos) <= b.size * b.root.scale.x * 1.15;
      if (sunHit && !real && hh.distance > sunHit.distance * 0.8) continue;
      if (!best || hh.distance < best.distance) { best = hh; bestIdx = idx; }
    }
    if (best && (!sunHit || best.distance < sunHit.distance)) return { index: bestIdx };
    if (sunHit) return { sun: true };
    return null;
  }
  // Moon picking: the moon meshes themselves, so a folder is a target and not just a dot beside a
  // planet. A moon smaller than MOON_PICK_PX on screen is skipped, so a distant orbit can never steal
  // the click that was meant for the planet it belongs to.
  const MOON_PICK_PX = 4;
  const moonPicks = bodies.flatMap((b, i) => b.moons.map((mn, k) => ({ b: i, k, mn, body: b })));
  function pickMoon(): MoonRef | null {
    if (moonPicks.length === 0) return null;
    raycaster.setFromCamera(ndc, camera);
    const tan2 = 2 * Math.tan(fovRad());
    let best: MoonRef | null = null, bd = Infinity;
    for (const mp of moonPicks) {
      if (!(mp.body.moonRoot?.visible ?? false) || mp.body.mix > 0.02) continue;
      const hit: THREE.Intersection | undefined = raycaster.intersectObject(mp.mn.mesh, false)[0];
      if (!hit || hit.distance >= bd) continue;
      const sc = mp.body.root.scale.x;
      // the moons are raycast alone, so a moon round the back has to be occluded by hand: past the
      // planet's centre, with the ray inside the planet's silhouette, is behind the planet
      if (hit.distance > raycaster.ray.origin.distanceTo(mp.body.pos)
        && raycaster.ray.distanceToPoint(mp.body.pos) <= mp.body.size * sc) continue;
      if ((moonRadius(mp.mn, sc) * h) / (tan2 * hit.distance) < MOON_PICK_PX) continue;
      bd = hit.distance; best = { b: mp.b, k: mp.k };
    }
    return best;
  }
  const onCanvasClick = (e: MouseEvent) => {
    if (dragMoved || !active) return;
    setNdc(e);
    // a moon is reachable while a planet is focused, which is the only time it is big enough to read
    const mh = flight.active ? null : pickMoon();
    if (mh) { moonFocus = isMoon(moonFocus, mh.b, mh.k) ? null : mh; return; }
    moonFocus = null;
    const hit = pickAt();
    // A planet is a target in every state. Mid-flight it re-aims the ship, while holding at another
    // body it starts a new hop; only a tap on the body we are already parked at is a no-op. The deck
    // is what answers — with a reroute, or with a refusal you can see.
    if (hit?.index !== undefined) { if (flight.active || hit.index !== focusIdx) onSelect?.(bodies[hit.index].p); return; }
    if (hit?.sun && (flight.active || !sunFocus)) onSunSelect?.();
  };
  canvas.addEventListener("click", onCanvasClick);

  function resize() {
    const rect = stage.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w, h);
    camera.aspect = w / h;
    view.fit = Math.min(1.6, Math.max(1, 1.55 / camera.aspect));   // portrait: do not back off so far that planets vanish
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(stage);
  resize();

  // ── flight
  let warp = 0, warpDir = 1, hyper = 1, tOrbit = 0, flash = 0, tunnel = 0, beltSide = 0, beltLevel = 0, tiltX = 0, tiltY = 0, flareT = 0, holdAngle = 0;
  const lookAhead = new THREE.Vector3(), lookPose = new THREE.Vector3(), vanish = new THREE.Vector3();
  const camPos = camera.position, lookCur = lookBase.clone();
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), right = new THREE.Vector3(), shake = new THREE.Vector3(), ringQ = new THREE.Quaternion();

  /** How far round from the star the arrival pose sits, in radians — about 50°. */
  const SUN_OFF_AXIS = 0.88;
  function poseFor(b: SceneBody, outPos: THREE.Vector3, outLook: THREE.Vector3) {
    const P = b.pos, R = b.size;
    // Off the sun's axis on purpose. -P points straight at the star, so arriving along it put the camera
    // between sun and planet and lit the whole disc — no terminator, and a lit sphere with no terminator
    // reads as a flat disc however much detail its surface has.
    tmp.copy(P).negate().normalize().applyAxisAngle(UP, SUN_OFF_AXIS + holdAngle + inspect.yaw);
    right.crossVectors(tmp.clone().negate(), UP).normalize();
    const dist = R * (b.ring ? 5.6 : 4.8);
    for (let k = 0; k < 8; k++) {
      outPos.copy(P).addScaledVector(tmp, dist);
      if (outPos.length() > SUN_FRAME * 2.0) break;
      tmp.addScaledVector(right, 0.45).normalize();
    }
    outPos.addScaledVector(UP, R * (b.ring ? 1.6 : 1.15) + R * 4.8 * Math.sin(inspect.pitch));
    right.crossVectors(tmp.clone().negate(), UP).normalize();
    const cutOn = b.cut.target > 0;
    outLook.copy(P).addScaledVector(right, cutOn ? R * 0.4 : R * 1.35).addScaledVector(UP, -R * 0.12);   // cutaway: centre the planet
  }
  function poseForSun(outPos: THREE.Vector3, outLook: THREE.Vector3) {
    tmp.copy(camPos).setY(0).normalize();
    right.crossVectors(tmp.clone().negate(), UP).normalize();
    outPos.copy(tmp).multiplyScalar(SUN_FRAME * 3.4).addScaledVector(UP, SUN_FRAME * 0.9);
    outLook.set(0, 0, 0).addScaledVector(right, SUN_FRAME * 1.1);
  }
  const arcCtrl = new THREE.Vector3();
  function startFlight(kind: Flight["kind"], toPos: THREE.Vector3, toLook: THREE.Vector3, onDone?: () => void) {
    flight.from.copy(camPos); flight.lookFrom.copy(lookCur);
    flight.to.copy(toPos); flight.lookTo.copy(toLook);
    flight.t = 0; flight.active = true; flight.kind = kind; flight.onDone = onDone ?? null; flight.stopped = false;
    for (const b of bodies) b.cut.target = 0;
    moonFocus = null;                                             // the folder you were reading is not where we are going
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
  const emit = (name: FlightEventName) => onFlightEvent?.(name, { dur: flight.dur, dist: flight.from.distanceTo(flight.to) });
  function bezier(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) { const u = 1 - t; return out.set(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y, u * u * a.z + 2 * u * t * c.z + t * t * b.z); }
  function flyTo(id: string, onDone?: () => void): boolean {
    const idx = bodies.findIndex((b) => b.p.id === id);
    if (idx < 0) return false;
    focusIdx = idx; sunFocus = false; holdAngle = 0; inspect.yaw = 0; inspect.pitch = 0;
    poseFor(bodies[idx], camTarget, lookTarget);
    nebulaTint.copy(bodies[idx].planet.material.uniforms.uRim.value);
    startFlight("out", camTarget, lookTarget, onDone);
    return true;
  }
  function flyToSun(onDone?: () => void) {
    focusIdx = -1; sunFocus = true;
    poseForSun(camTarget, lookTarget);
    nebulaTint.set(0xffb06b);
    startFlight("out", camTarget, lookTarget, onDone);
  }
  function unfocus(onDone?: () => void) {
    if (focusIdx < 0 && !sunFocus && !flight.active) { onDone?.(); return; }
    focusIdx = -1; sunFocus = false;
    updateBase();
    startFlight("back", camBase, lookBase, onDone);
  }
  const findBody = (id: string) => bodies.find((x) => x.p.id === id);

  /**
   * The moons of whichever planet the deck is holding, with where each one currently is on screen, so
   * the deck can list them without knowing anything about three.js — and `hot`/`focused` so it can say
   * which one the pointer picked. With nothing focused it falls back to the planet whose moon the
   * pointer is on, because a moon is pickable from the orbit view too. Empty when there is no such body.
   */
  function moonHeading(): readonly HeadingMoon[] {
    // whichever body the deck is holding, or — with nothing focused — the one whose moon the pointer is on
    const idx = focusIdx >= 0 ? focusIdx : moonFocus ? moonFocus.b : moonHot ? moonHot.b : -1;
    const b = idx >= 0 ? bodies[idx] : null;
    if (!b || b.moons.length === 0) return [];
    const sc = b.root.scale.x, tan2 = 2 * Math.tan(fovRad()), dPlanet = b.pos.distanceTo(camPos);
    return b.moons.map((mn, k): HeadingMoon => {
      mn.mesh.getWorldPosition(moonW);
      project(moonW);
      const dist = moonW.distanceTo(camPos);
      return { id: `${b.p.id}/${mn.cfg.path || mn.cfg.name}`, name: mn.cfg.name, path: mn.cfg.path,
        x: scr.x, y: scr.y, z: scr.z, px: (moonRadius(mn, sc) * h) / (tan2 * dist), dist, front: dist < dPlanet,
        hot: isMoon(moonHot, idx, k), focused: isMoon(moonFocus, idx, k) };
    });
  }

  // ── frame loop
  let last = performance.now(), paused = false, raf = 0, t = 0, disposed = false;
  const scr = { x: 0, y: 0, z: 0 };
  function project(v: THREE.Vector3) { tmp2.copy(v).project(camera); scr.x = (tmp2.x * 0.5 + 0.5) * w; scr.y = (-tmp2.y * 0.5 + 0.5) * h; scr.z = tmp2.z; }
  const fovRad = () => (camera.fov * Math.PI) / 360;

  const moonW = new THREE.Vector3();
  const moonLabXY: number[] = [];   // where this body's moon labels have already landed, x,y pairs
  /**
   * One body's moons: advance the orbits, hand the planet their world positions for its shadow pass,
   * and place the labels. Only ever called for a body that has moons, so a body without any costs the
   * one array-length test at the call site and nothing else.
   *
   * `labX`/`labY` are where the planet's own label sits, because a moon label must never land on it.
   */
  function updateMoons(b: SceneBody, i: number, dt: number, labX: number, labY: number): void {
    // the cutaway opens a wedge into the planet; a moon crossing that would read as debris inside it
    const hidden = b.cut.amount > 0.002 || b.cut.target > 0;
    if (b.moonRoot) b.moonRoot.visible = !hidden;
    const sc = b.root.scale.x;
    const shadows = b.planet.material.uniforms.uMoons.value;
    const dcam = b.pos.distanceTo(camPos);
    // quieter than a planet: only close in, or on the body the deck is holding
    const near = clamp01(1 - (dcam - b.size * 10) / (b.size * 30));
    const want = hidden || !active || flight.active ? 0 : i === focusIdx ? 1 : near;
    b.moonLab += (want - b.moonLab) * Math.min(1, dt * 5);
    const tan2 = 2 * Math.tan(fovRad());
    const canLight = !hidden && active && !flight.active;
    moonLabXY.length = 0;
    for (let k = 0; k < b.moons.length; k++) {
      const mn = b.moons[k];
      // hovered or clicked: the label is pinned open, which is what shows the folder line
      const lit = canLight && (isMoon(moonHot, i, k) || isMoon(moonFocus, i, k));
      mn.want = lit ? 1 : 0;
      stepMoon(mn, t, dt, b.pos, b.size * sc, b.hot, moonW);
      const wr = hidden ? 0 : moonRadius(mn, sc);                   // a zero radius switches the shader's slot off
      shadows[k * 4] = moonW.x; shadows[k * 4 + 1] = moonW.y; shadows[k * 4 + 2] = moonW.z; shadows[k * 4 + 3] = wr;
      const el = b.moonEls[k];
      el.classList.toggle("is-hot", lit);
      if (b.moonLab < 0.004 && !lit) { mn.labK = 0; if (el.style.opacity !== "0") el.style.opacity = "0"; continue; }
      project(moonW);
      const mdist = moonW.distanceTo(camPos);
      const mpx = (moonRadius(mn, sc) * h) / (tan2 * mdist);
      const x = scr.x, y = scr.y - mpx - 4;
      // give way to the planet's own label, and to any moon label already placed this frame
      let clear = Math.abs(x - labX) < 52 && Math.abs(y - labY) < 16 ? 0 : 1;
      for (let j = 0; clear > 0 && j < moonLabXY.length; j += 2) {
        if (Math.abs(x - moonLabXY[j]) < 44 && Math.abs(y - moonLabXY[j + 1]) < 13) clear = 0;
      }
      if (clear > 0) moonLabXY.push(x, y);
      // a picked moon keeps its name whatever it collides with: it is the one thing you asked to read
      if (lit) clear = 1;
      mn.labK += (clear - mn.labK) * Math.min(1, dt * 7);      // fade in and out of a collision, never blink
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      // a moon round the back is still named, just fainter, so the list and the view agree
      el.style.opacity = String(Math.max(b.moonLab, lit ? 1 : 0) * mn.labK * (lit || mdist < dcam ? 1 : 0.4) * (scr.z < 1 ? 1 : 0) * (1 - Math.max(warp, tunnel)) * (1 - b.mix));
    }
  }

  function frame(now: number) {
    if (disposed) return;
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
    // A finger that is down but has not travelled is still aiming, not dragging, so it keeps the hover
    // — that press highlight is the only "what am I about to tap" a touch screen gets. The hover also
    // runs during a flight, so a planet still shows as reachable while the ship is moving.
    const aiming = active && (!dragging || !dragMoved);
    moonHot = aiming && !flight.active ? pickMoon() : null;
    // a moon under the pointer takes the hover: it is in front of the planet, so it is what you meant
    if (aiming && moonHot === null && !sunFocus) {
      const hit = pickAt();
      if (hit?.index !== undefined) rayHot = hit.index;
      else if (hit?.sun) sunHot = true;
    }
    hotHover = domHot >= 0 ? domHot : rayHot;
    hotIdx = focusIdx >= 0 ? focusIdx : hotHover;
    canvas.style.cursor = moonHot !== null || rayHot >= 0 || sunHot ? "pointer" : dragging ? "grabbing" : orbiting && active ? "grab" : "";

    sunMat.uniforms.uTime.value = t;
    corona.material.uniforms.uTime.value = t;
    uPulse.value = flareT;
    if (conMat) conMat.uniforms.uTime.value = t;
    nebula.material.uniforms.uTime.value = t;
    starMat.uniforms.uTime.value = t;
    flareT += (0 - flareT) * Math.min(1, dt * 1.6);
    const pulse = (1 + 0.12 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3)) * (1 + 3.5 * flareT);
    coronaA.material.opacity = 0.12 * uFade.value * pulse * uCoronaK.value * (sunHot ? 1.5 : 1);
    coronaB.material.opacity = 0.18 * uFade.value * pulse * uCoronaK.value;
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
      if (!(i === focusIdx && cutOpen)) b.spinT += dt * b.spinRate * (i === focusIdx ? 1.4 : 1);
      b.spin.rotation.y = b.spinT;
      b.planet.material.uniforms.uTime.value = t;
      // cutaway: ease toward target, orient the wedge to face the camera when it opens
      const c = b.cut;
      { const spd = c.target > 0 ? 1 / 1.4 : 1 / 0.9; c.tm = clamp01(c.tm + (c.target > 0 ? dt : -dt) * spd); const u = c.tm; c.amount = u * u * u * (u * (u * 6 - 15) + 10); }
      if (c.amount > 0.002 || c.target > 0) {
        if (!c.group.visible) { c.group.visible = true; }
        if (c.target > 0 && c.tm < 0.3) { tmp.subVectors(camPos, b.pos).setY(0).normalize(); c.group.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 4; }
        const q = c.group.quaternion; const cx = new THREE.Vector3(1, 0, 0).applyQuaternion(q), cz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        applyCut(b.planet.material.uniforms, c.amount, b.pos, cx, cz); applyCut(b.atmo.material.uniforms, c.amount, b.pos, cx, cz);
        for (const m of c.shells) { applyCut(m.material.uniforms, c.amount, b.pos, cx, cz); m.material.uniforms.uAlpha.value = Math.min(1, c.amount * 3); m.material.uniforms.uTime.value = t; }
        for (const f of c.faces) f.material.uniforms.uAlpha.value = Math.min(1, c.amount * 3);
        c.faceH.material.uniforms.uSpan.value = c.amount;
        c.faceB.rotation.y = -c.amount * Math.PI / 2;
        c.group.scale.setScalar(1);
      } else if (c.group.visible) { c.group.visible = false; b.planet.material.uniforms.uCut.value = 0; b.atmo.material.uniforms.uCut.value = 0; }
      b.planet.material.uniforms.uHot.value = b.hot;
      b.atmo.material.uniforms.uHot.value = b.hot; b.atmo.visible = !(b.cut.amount > 0.6);
      const ringCfg = b.cfg.ring;
      if (b.ring && ringCfg) {
        const sc = b.root.scale.x, u = b.planet.material.uniforms;
        b.ring.material.uniforms.uHot.value = b.hot; b.ring.material.uniforms.uPlanet.value.copy(b.pos); b.ring.material.uniforms.uPlanetR.value = b.size * sc;
        b.ring.getWorldQuaternion(ringQ); u.uRingN.value.set(0, 0, 1).applyQuaternion(ringQ);
        u.uPlanetC.value.copy(b.pos); u.uRingIn.value = b.size * ringCfg.inner * sc; u.uRingOut.value = b.size * ringCfg.outer * sc;
      }

      project(b.pos);
      const px = (b.size * (b.ring ? 1.9 : 1.15) * h) / (2 * Math.tan(fovRad()) * b.pos.distanceTo(camPos));
      const labX = scr.x, labY = scr.y + px;
      b.el.style.transform = `translate(${labX.toFixed(1)}px, ${labY.toFixed(1)}px) translate(-50%, 8px)`;
      const show = orbiting && active && scr.z < 1 ? 1 : 0;
      const dcam = b.pos.distanceTo(camPos);
      const depth = i === hotIdx ? 1 : 1 - 0.5 * clamp01((dcam - view.radius * 0.95) / (view.radius * 0.5));
      const labA = (1 - b.mix) * show * (1 - Math.max(warp, tunnel)) * depth;
      b.el.style.opacity = String(labA);
      b.el.classList.toggle("is-off", labA < 0.06);

      b.el.classList.toggle("is-hot", i === hotIdx);
      if (b.moons.length > 0) updateMoons(b, i, dt, labX, labY);
    }
    rings.forEach((rg, i) => {
      const src = bodies[i];
      rg.hot += ((src ? src.hot : 0) - rg.hot) * Math.min(1, dt * 6);
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
      const side = Math.sign(Math.hypot(camPos.x, camPos.z) - BELT_R);
      if (side !== beltSide && beltSide !== 0) emit("belt");
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
        emit(out ? "arrive" : "home");
        const cb = flight.onDone; flight.onDone = null; cb?.();
      }
    } else {
      warp += (0 - warp) * Math.min(1, dt * 5);
      tunnel += (0 - tunnel) * Math.min(1, dt * 12);
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
    if (blur.enabled) { blurU.uCenter.value.set(cx, cy); blurU.uStrength.value = 0.05 * tunnel * tunnel; }
    rgbU.uCenter.value.set(cx, cy);
    rgbU.uDim.value = 0.18 * tunnel;
    rgbU.uGlow.value = 0.35 * tunnel;
    rgbU.uAmount.value = tunnel * 0.006;
    rgbU.uVignette.value = tunnel * 0.5;
    rgbU.uFlash.value = 0;
    bloom.strength = 0.5 + 0.25 * tunnel + 0.9 * flareT;

    // asteroid belt proximity → debris rumble level
    const dBelt = Math.abs(Math.hypot(camPos.x, camPos.z) - BELT_R);
    const lvl = clamp01(1 - dBelt / 22) * clamp01(1 - Math.abs(camPos.y) / 30);
    if (Math.abs(lvl - beltLevel) > 0.02) { beltLevel = lvl; onBeltLevel?.(lvl); }

    composer.render();
  }
  raf = requestAnimationFrame(frame);

  return {
    setPaused(v) { paused = v; if (!v) last = performance.now(); },
    setActive(v) { active = v; },
    setScroll(k) { view.scroll = k; },
    setThrottle(k) { view.throttle = Math.min(1, Math.max(-0.6, k)); },
    heading(): Heading {
      return { theta: view.theta, phi: view.phi, roll: camera.rotation.z, speed: warp, flying: flight.active, flightT: flight.t, flightDur: flight.dur, hot: hotIdx, sunHot,
        auPerUnit: layout.auPerUnit, moons: moonHeading(),
        pos: { x: camPos.x, y: camPos.y, z: camPos.z }, bodies: bodies.map((b) => ({ id: b.p.id, x: b.pos.x, y: b.pos.y, z: b.pos.z, r: b.r, size: b.size })) };
    },
    project(v: Vec3): Vec3 { const q = new THREE.Vector3(v.x, v.y, v.z).project(camera); return { x: (q.x * 0.5 + 0.5) * w, y: (-q.y * 0.5 + 0.5) * h, z: q.z }; },
    setTilt(dx, dy) { tiltX = dx; tiltY = dy; },
    setHeading(theta) { view.theta = theta; view.vel = 0; },
    level() { view.phiOff = 0; },
    nudge(dTheta) { view.theta += dTheta; view.vel = 0; },
    flare() { flareT = 1; },
    cutaway(id, on) { const b = findBody(id); if (!b) return; b.cut.target = on ? 1 : 0; if (on) { tmp.subVectors(camPos, b.pos).setY(0).normalize(); b.cut.group.rotation.y = Math.atan2(tmp.x, tmp.z) - Math.PI / 4; } },
    cutawayOpen(id) { const b = findBody(id); return !!b && b.cut.target > 0; },
    layersOf(id) { const b = findBody(id); return b ? b.cut.layers : []; },
    highlightLayer(id, idx) { if (id == null) return; const b = findBody(id); if (!b) return; b.cut.shells.forEach((m, k) => { m.material.uniforms.uHi.value = k === idx ? 1 : 0; }); },
    layerAnchors(id): LayerAnchor[] {
      const b = findBody(id); if (!b || b.cut.amount < 0.05) return [];
      const q = b.cut.group.quaternion; const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(q); const az = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      // dots sit on the vertical face A (angle 0), a little above the floor, at each layer's outer edge so the
      // small inner layers still get distinct points; thin layers are clamped to a minimum spacing in world units
      const rows = b.cut.layers.map((L) => ({ name: L.name, pct: L.pct, r: (L.r0 + L.r1) / 2, color: L.color }));
      const Rp = b.size * b.root.scale.x;
      // place dots outer→inner at each layer's true outer edge, then enforce a minimum radial gap so the tiny
      // inner layers (0.2 %…) still get distinct, readable anchors; never below 8 % of the radius
      const gap = 0.045, rs: number[] = []; let prev = Infinity;
      for (const L of rows) { const r = Math.min(L.r, prev - gap); rs.push(r); prev = r; }
      const under = 0.08 - rs[rs.length - 1]; if (under > 0) for (let i = 0; i < rs.length; i++) rs[i] = Math.max(rs[i] + under * (i / (rs.length - 1)), 0.08 + gap * (rs.length - 1 - i));
      return rows.map((L, i) => { const rr = Math.min(rs[i], 0.985) * Rp;
        const el = 0.52, mid = Math.SQRT1_2; const wp = new THREE.Vector3().copy(b.pos).addScaledVector(ax, Math.cos(el) * rr * mid).addScaledVector(az, Math.cos(el) * rr * mid).addScaledVector(UP, Math.sin(el) * rr);
        const pr = wp.clone().project(camera); return { name: L.name, pct: L.pct, color: L.color, x: (pr.x * 0.5 + 0.5) * w, y: (-pr.y * 0.5 + 0.5) * h, z: pr.z, amount: b.cut.amount }; });
    },
    pick() { return active && focusIdx < 0 && !sunFocus && !flight.active ? pickAt() : null; },
    setHyper(v) { hyper = v ? 9 : 1; },
    flyTo, flyToSun, unfocus,
    next(onDone?: () => void) { if (focusIdx < 0) return; flyTo(bodies[(focusIdx + 1) % bodies.length].p.id, onDone); },
    prev(onDone?: () => void) { if (focusIdx < 0) return; flyTo(bodies[(focusIdx - 1 + bodies.length) % bodies.length].p.id, onDone); },
    focusedId() { return focusIdx >= 0 ? bodies[focusIdx].p.id : sunFocus ? "sun" : null; },
    isFlying() { return flight.active; },
    dispose() {
      disposed = true; cancelAnimationFrame(raf);
      ro.disconnect();
      stage.removeEventListener("pointermove", onStageMove); stage.removeEventListener("pointerleave", onStageLeave);
      canvas.removeEventListener("pointerdown", onCanvasDown); canvas.removeEventListener("click", onCanvasClick);
      window.removeEventListener("pointerup", onWindowUp);
      for (const b of bodies) { b.el.remove(); for (const ml of b.moonEls) ml.remove(); }
      canvas.style.cursor = ""; canvas.classList.remove("is-dragging");
      disposeTree(scene); disc.dispose(); streakTex.dispose();
      for (const pass of composer.passes) pass.dispose();
      composer.dispose(); renderer.dispose();
    },
  };
}
