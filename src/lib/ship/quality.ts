// How much of the flight deck a device is asked to draw. One tier decides every knob at once — pixel
// ratio, the post chain, shader octaves, sphere segments, star and rock counts — so a weak laptop and
// a good one get one coherent picture each rather than a mixture of settings tuned on one machine.
//
// The tier is picked before the scene is built (some knobs are geometry) and can be nudged live
// afterwards for the knobs that do not need a rebuild: pixel ratio, bloom, the grade pass, idle rate.

import { lowPower } from "@/lib/device";

export type Tier = "low" | "mid" | "high";

export interface Quality {
  tier: Tier;
  /** Cap on the device pixel ratio the renderer is allowed. */
  dpr: number;
  /** Multisample count of the composer's render target. 0 turns MSAA off. */
  msaa: 0 | 2 | 4;
  /** The bloom pass, and its resolution relative to the frame. */
  bloom: boolean; bloomScale: number;
  /** The RGB-shift / vignette pass while not in a warp tunnel (the tunnel always gets it). */
  grade: boolean;
  /** fbm octaves in every noise shader. */
  octaves: 2 | 3 | 5;
  /** Drops the domain warp, crust relief and ocean swell from the planet shader. */
  lowShader: boolean;
  /** Segments of the shared unit sphere (planets, atmospheres, cutaway shells) and of a ring. */
  sphereSeg: 32 | 48 | 72; ringSeg: 96 | 160 | 320;
  /** Moons drawn per planet, at most. */
  moons: 0 | 3 | 6;
  /** Starfield size, whether it gets its warp-streak twin, and belt rock count. */
  stars: number; streaks: boolean; belt: number;
  /** Frame rate while nothing is flying, dragging or easing. */
  idleFps: 30 | 60;
}

export const TIERS: Readonly<Record<Tier, Quality>> = {
  low:  { tier: "low",  dpr: 1,    msaa: 0, bloom: false, bloomScale: 0.5, grade: false, octaves: 2, lowShader: true,  sphereSeg: 32, ringSeg: 96,  moons: 0, stars: 1200, streaks: false, belt: 400,  idleFps: 30 },
  mid:  { tier: "mid",  dpr: 1.25, msaa: 2, bloom: true,  bloomScale: 0.5, grade: false, octaves: 3, lowShader: false, sphereSeg: 48, ringSeg: 160, moons: 3, stars: 2500, streaks: true,  belt: 1000, idleFps: 30 },
  high: { tier: "high", dpr: 1.5,  msaa: 4, bloom: true,  bloomScale: 1,   grade: true,  octaves: 5, lowShader: false, sphereSeg: 72, ringSeg: 320, moons: 6, stars: 4200, streaks: true,  belt: 2200, idleFps: 60 },
};

export const TIER_ORDER: readonly Tier[] = ["low", "mid", "high"];
const isTier = (s: string | null): s is Tier => s === "low" || s === "mid" || s === "high";

/** The pilot's own choice, or `auto` to let the deck decide. */
export const QUALITY_KEY = "wsf-quality";
/** What the deck decided last visit, so the geometry knobs are right from the first frame next time. */
export const QUALITY_AUTO_KEY = "wsf-quality-auto";
/** A tier this machine was once stepped down from. The adaptive pass never climbs back into it. */
export const QUALITY_CEILING_KEY = "wsf-quality-ceiling";

export function readOverride(): Tier | "auto" {
  try { const v = localStorage.getItem(QUALITY_KEY); return isTier(v) ? v : "auto"; } catch { return "auto"; }
}
function readRemembered(): Tier | null {
  try { const v = localStorage.getItem(QUALITY_AUTO_KEY); return isTier(v) ? v : null; } catch { return null; }
}

/**
 * Software rasterisers and the integrated GPUs that struggle with sixty noise calls a pixel. The
 * renderer string is the unmasked one where the browser gives it; a masked "ANGLE (Intel...)" still
 * names the vendor, which is enough.
 */
const WEAK_GPU = /SwiftShader|llvmpipe|softpipe|Mesa.*Intel|Intel.*(HD|UHD|Iris)|ANGLE.*Intel/i;

/**
 * Where to start. Only `high` is earned: the deck measures the frame rate after boot and steps up when
 * a machine has clearly got the headroom (see the adaptive pass in deck.ts). Everything else is a guess
 * that errs low, because a slow first minute costs a visitor and a slightly softer picture does not.
 */
export function probeTier(gpu: string): Tier {
  if (lowPower()) return "low";
  if (WEAK_GPU.test(gpu)) return "low";
  const remembered = readRemembered();
  if (remembered) return remembered;
  if (matchMedia("(pointer: coarse)").matches) return "mid";
  return "mid";
}

/** The knobs that change without rebuilding the scene. */
export type LiveQuality = Pick<Quality, "dpr" | "bloom" | "bloomScale" | "grade" | "idleFps">;
export const liveOf = (q: Quality): LiveQuality => ({ dpr: q.dpr, bloom: q.bloom, bloomScale: q.bloomScale, grade: q.grade, idleFps: q.idleFps });
