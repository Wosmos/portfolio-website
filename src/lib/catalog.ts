// Turning a catalogue row into scene values.
//
// Nothing here does I/O. It is the arithmetic that maps a real body onto the scene, so the admin's
// preview, the API that writes the row and the warning shown before a destructive apply all agree on
// exactly what a preset will do.
//
// Two honesty notes, because both are compromises and both are visible to the owner:
//
//   · A body's scene size is a *compression* of its real radius, not a ratio of it, unless the scene
//     is in `real` mode. Linear would put Jupiter at 2.6 and Phobos at 0.0004 — a body nobody can
//     see is not a preset, it is a bug. The compression is monotonic, so a bigger world is always a
//     bigger planet, and `real` mode still gives the true figure for anyone who wants it.
//   · A star's scene radius is its true ratio to the Sun. That is what the owner asked for and it is
//     correct — it is also why applying UY Scuti needs a warning, which `starImpact` computes.

import { AU_KM, clampPlanetSize, maxPlanetSize, type ScaleMode } from "@/lib/scale";
import type { PlanetConfigJson } from "@/db/schema";

/** The scene radius that means one solar radius. The scene's own default sun, and the anchor for
 *  every star in the catalogue: a star of 1,708 solar radii lands at 1,708 times this. */
export const SUN_SCENE_RADIUS = 6;
/** Jupiter is the reference for the size compression, and it lands on `relative` mode's own cap. */
const JUPITER_KM = 69_911;
const BIGGEST_SIZE = 2.6;
/** Below 1 this pulls small bodies up out of invisibility; 0.45 keeps Earth a little under Jupiter. */
const SIZE_COMPRESSION = 0.45;
const MIN_SIZE = 0.05;

export interface SceneFrame {
  /** The scene radius of the star everything is measured against. */
  sunRadius: number;
  /** What one solar radius is worth here. The owner's scale, not the built-in default. */
  anchor: number;
  /** What the outermost orbit represents, astronomical units. */
  spanAu: number;
  /** The scene radius the outermost orbit sits at. */
  outerRadius: number;
  mode: ScaleMode;
}

export const DEFAULT_FRAME: SceneFrame = { sunRadius: SUN_SCENE_RADIUS, anchor: SUN_SCENE_RADIUS, spanAu: 30, outerRadius: 110, mode: "stylised" };

/** What a catalogue body needs to carry for the maths below. */
export interface BodyFacts {
  radiusKm: number;
  semiMajorAu: number;
  tiltDeg: number | null;
  dayHours: number | null;
  ringed: boolean;
  planet: PlanetConfigJson;
}

/**
 * The scene size for a real radius.
 *
 * In `real` mode there is one measure for everything, so the answer is the true ratio and a moon
 * genuinely is a speck. Otherwise the radius is compressed against Jupiter, which keeps Phobos
 * visible without ever letting it out-grow Mars.
 */
export function sizeFromRadius(radiusKm: number, frame: SceneFrame): number {
  if (frame.mode === "real") {
    const kmPerUnit = (frame.spanAu * AU_KM) / Math.max(1, frame.outerRadius);
    return Math.max(0.004, radiusKm / kmPerUnit);
  }
  const raw = BIGGEST_SIZE * Math.pow(Math.max(1, radiusKm) / JUPITER_KM, SIZE_COMPRESSION);
  return clampPlanetSize(Math.max(MIN_SIZE, raw), frame.sunRadius);
}

/** Where a real semi-major axis lands, kept clear of the star's own surface. */
export function orbitFromAu(semiMajorAu: number, frame: SceneFrame): number {
  const span = Math.max(1e-6, frame.spanAu);
  const raw = (semiMajorAu / span) * frame.outerRadius;
  // a hot Jupiter at 0.02 au would otherwise land inside the photosphere
  return Math.max(frame.sunRadius * 1.6, raw);
}

/** Turns per scene minute from a sidereal day; the sign carries a retrograde rotation. */
export function spinFromHours(hours: number): number {
  const turns = Math.min(6, Math.max(0.02, 24 / Math.abs(hours)));
  return hours < 0 ? -turns : turns;
}

export interface AppliedBody { planet: PlanetConfigJson; orbit: number }

/**
 * Everything a body preset writes: its look, its size, its tilt, its spin, its ring and its orbit.
 *
 * An unmeasured tilt or day is left absent rather than filled with a zero — absent means the scene's
 * own per-index default applies, which is the difference between "we do not know" and "it is upright".
 */
export function applyBody(body: BodyFacts, frame: SceneFrame): AppliedBody {
  const planet: PlanetConfigJson = { ...body.planet, size: sizeFromRadius(body.radiusKm, frame) };
  if (body.tiltDeg !== null) planet.tilt = body.tiltDeg;
  else delete planet.tilt;
  if (body.dayHours !== null) planet.spin = spinFromHours(body.dayHours);
  else delete planet.spin;
  if (!body.ringed) planet.ring = null;
  return { planet, orbit: orbitFromAu(body.semiMajorAu, frame) };
}

// ── stars ─────────────────────────────────────────────

/** What a catalogue star needs to carry. */
export interface StarFacts {
  name: string;
  radiusSolar: number;
  colorCore: number; colorMid: number; colorEdge: number;
  intensity: number; granulation: number; limb: number; spots: number; spin: number; corona: number; flare: number;
}

/** How the planets follow a star that has just changed size. */
export type Rescale = "none" | "planets" | "distances" | "refit";

export const RESCALES: readonly Rescale[] = ["none", "planets", "distances", "refit"];
export const isRescale = (v: string): v is Rescale => (RESCALES as readonly string[]).includes(v);

/** The scene fields a star preset writes. Deliberately the exact column names on `scene_config`. */
export interface SunFields {
  sunRadius: number;
  sunColorCore: number; sunColorMid: number; sunColorEdge: number;
  sunIntensity: number; sunGranulation: number; sunLimb: number;
  sunSpots: number; sunSpin: number; sunCorona: number; sunFlare: number;
}

export function sunFromStar(s: StarFacts, anchor = SUN_SCENE_RADIUS): SunFields {
  return {
    sunRadius: Math.max(0.02, anchor) * s.radiusSolar,
    sunColorCore: s.colorCore, sunColorMid: s.colorMid, sunColorEdge: s.colorEdge,
    // the scene's own sliders stop at 3 and brightness at 20; a preset may not drive them past that
    sunIntensity: clamp(s.intensity, 0, 20),
    sunGranulation: clamp(s.granulation, 0, 3), sunLimb: clamp(s.limb, 0, 3),
    sunSpots: clamp(s.spots, 0, 3), sunSpin: clamp(s.spin, 0, 3),
    sunCorona: clamp(s.corona, 0, 3), sunFlare: clamp(s.flare, 0, 3),
  };
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

export interface OrbitingBody { orbit: number; size: number }

export interface StarImpact {
  /** The star's scene radius once applied. */
  sunRadius: number;
  /** How much bigger, or smaller, than the star that is there now. */
  ratio: number;
  /** Orbits that would end up inside the star's own surface. */
  swallowed: number;
  /** Planets already at the size cap, which therefore cannot grow with it. */
  capped: number;
  /** The cap itself, after the change. */
  maxSize: number;
  /** One sentence, with the real figures in it, for the confirm dialog. */
  warning: string;
}

/**
 * What applying this star would actually do, worked out from the real numbers rather than described
 * in the abstract — the owner asked for true relative size *with a warning*, and a warning that does
 * not name the consequence is decoration.
 */
export function starImpact(s: StarFacts, frame: SceneFrame, bodies: readonly OrbitingBody[]): StarImpact {
  const sunRadius = Math.max(0.02, frame.anchor) * s.radiusSolar;
  const ratio = sunRadius / Math.max(1e-6, frame.sunRadius);
  const swallowed = bodies.filter((b) => b.orbit <= sunRadius).length;
  const maxSize = maxPlanetSize(sunRadius);
  const capped = bodies.filter((b) => b.size >= maxSize).length;
  const times = ratio >= 10 ? Math.round(ratio) : Number(ratio.toFixed(2));
  const head = `${s.name} is ${fmt(s.radiusSolar)}× the Sun, so the star becomes ${fmt(sunRadius)} scene units — ${times}× the one there now.`;
  const tail = swallowed === 0
    ? "Every orbit stays outside it."
    : swallowed === bodies.length
      ? `All ${bodies.length} orbits end up inside it.`
      : `${swallowed} of ${bodies.length} orbits end up inside it.`;
  return { sunRadius, ratio, swallowed, capped, maxSize, warning: `${head} ${tail}` };
}

const fmt = (v: number): string =>
  v >= 1000 ? Math.round(v).toLocaleString("en-GB") : v >= 10 ? String(Math.round(v)) : String(Number(v.toFixed(2)));

export interface Rescaled { orbit: number; size: number }

/**
 * How each planet follows the star.
 *
 * `none` leaves them where they are, `planets` keeps their proportion to the star, `distances` keeps
 * the whole system's shape around it, and `refit` is the caller's job — it re-runs `arrange()`, which
 * needs the project list rather than a per-body transform.
 */
export function rescaleBody(b: Rescaled, how: Rescale, ratio: number, sunRadius: number): Rescaled {
  if (how === "none" || how === "refit") return { orbit: b.orbit, size: clampPlanetSize(b.size, sunRadius) };
  const size = clampPlanetSize(b.size * ratio, sunRadius);
  return { orbit: how === "distances" ? b.orbit * ratio : b.orbit, size };
}

/** What each option will do, in one line, so the admin can label the radio rather than guess. */
export function rescaleNote(how: Rescale, impact: StarImpact, count: number): string {
  switch (how) {
    case "none":
      return impact.swallowed === 0
        ? "Only the star changes."
        : `Only the star changes — ${impact.swallowed} of ${count} planets end up inside it.`;
    case "planets":
      return `Every planet grows ${impact.ratio >= 1 ? "" : "shrinks "}with the star, capped at ${impact.maxSize.toFixed(2)}. They keep their proportion to it but stay where they are.`;
    case "distances":
      return "Sizes and orbits both follow the star, so the system keeps its shape around it.";
    case "refit":
      return impact.swallowed === 0
        ? "The whole system is laid out again from the real solar-system data."
        : "The whole system is laid out again and pushed out clear of the star, so every planet stays visible.";
  }
}
