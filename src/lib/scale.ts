// The real solar system, and three ways of squeezing it onto a screen.
//
// True scale is unusable: the sun is 109 Earths wide, and at a span where Neptune fits on screen a
// true-size Earth is a fifth of a pixel. So the arrangement comes in three modes and the admin picks
// one, rather than the code pretending there is a single right answer.
//
//   stylised  the hand-picked values that shipped — eight readable planets
//   relative  true size ratios between the planets, the sun compressed, distances eased
//   real      true to scale, both size and distance, normalised so the outer orbit fits the span
//
// Nothing here does I/O; it is arithmetic over the table below, so the admin, the scene and the tests
// all agree on what "real" means.

export type ScaleMode = "stylised" | "relative" | "real";
export const SCALE_MODES: readonly ScaleMode[] = ["stylised", "relative", "real"];
export const isScaleMode = (v: string): v is ScaleMode => (SCALE_MODES as readonly string[]).includes(v);

export const SUN_RADIUS_KM = 695_700;
export const AU_KM = 149_597_870.7;
/** A light year in astronomical units, for the span control's upper end. */
export const LIGHT_YEAR_AU = 63_241.1;

export interface RealPlanet {
  name: string;
  /** Equatorial radius, kilometres. */
  radiusKm: number;
  /** Semi-major axis, astronomical units. */
  semiMajorAu: number;
  /** Axial tilt, degrees. */
  tiltDeg: number;
  /** Sidereal rotation, hours; negative means it turns the other way (Venus, Uranus). */
  dayHours: number;
  /** The surface family the shader should use for a body like this. */
  type: "gas" | "rocky" | "lava" | "ice" | "liquid" | "muddy";
  /** Rings worth drawing. */
  ringed: boolean;
}

/** Mercury outward. Radii and axes from the JPL planetary fact sheet. */
export const REAL_PLANETS: readonly RealPlanet[] = [
  { name: "Mercury", radiusKm: 2_439.7, semiMajorAu: 0.387, tiltDeg: 0.03, dayHours: 1407.6, type: "rocky", ringed: false },
  { name: "Venus", radiusKm: 6_051.8, semiMajorAu: 0.723, tiltDeg: 177.4, dayHours: -5832.5, type: "lava", ringed: false },
  { name: "Earth", radiusKm: 6_371.0, semiMajorAu: 1.0, tiltDeg: 23.44, dayHours: 23.9, type: "liquid", ringed: false },
  { name: "Mars", radiusKm: 3_389.5, semiMajorAu: 1.524, tiltDeg: 25.19, dayHours: 24.6, type: "muddy", ringed: false },
  { name: "Jupiter", radiusKm: 69_911, semiMajorAu: 5.204, tiltDeg: 3.13, dayHours: 9.9, type: "gas", ringed: false },
  { name: "Saturn", radiusKm: 58_232, semiMajorAu: 9.583, tiltDeg: 26.73, dayHours: 10.7, type: "gas", ringed: true },
  { name: "Uranus", radiusKm: 25_362, semiMajorAu: 19.191, tiltDeg: 97.77, dayHours: -17.2, type: "ice", ringed: true },
  { name: "Neptune", radiusKm: 24_622, semiMajorAu: 30.07, tiltDeg: 28.32, dayHours: 16.1, type: "ice", ringed: false },
];

/** The asteroid belt, for the arrangement to place honestly. */
export const REAL_BELT = { innerAu: 2.2, outerAu: 3.2 } as const;

export interface Arrangement {
  /** Scene radius of the sun. */
  sunRadius: number;
  /** Per body, in the order the projects were given. */
  bodies: readonly {
    size: number; orbit: number; tilt: number; spin: number;
    type: RealPlanet["type"]; ringed: boolean; name: string;
  }[];
  /** Where the belt lands, in scene units. */
  belt: { radius: number; width: number };
  /** What one scene unit is worth, so telemetry can keep reading in au. */
  auPerUnit: number;
  /** Shown next to the mode in the admin, because "real" needs an explanation. */
  note: string;
}

export interface ArrangeOptions {
  /** How many bodies to place; more than eight repeats the outer planets outward. */
  count: number;
  /** Scene radius the outermost orbit should sit at. */
  outerRadius?: number;
  /** What the outermost orbit represents. 30 au is Neptune; 63241 is a light year. */
  spanAu?: number;
  /** The sun's scene radius in the stylised and relative modes. */
  sunRadius?: number;
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
/** Turns per minute from a sidereal day, so the shader's spin can be set from the real number. */
const spinFromDay = (hours: number): number => clamp(24 / Math.abs(hours), 0.02, 6) * Math.sign(hours);

/** The values that shipped, kept so switching back to `stylised` restores exactly what was there. */
export const STYLISED_SIZES: readonly number[] = [1.9, 1.55, 1.2, 1.35, 1.05, 1.5, 0.95, 1.15];
export const STYLISED_ORBITS: readonly number[] = [17, 25, 34, 45, 58, 73, 90, 110];

function planetAt(i: number): RealPlanet {
  const last = REAL_PLANETS[REAL_PLANETS.length - 1];
  const hit = REAL_PLANETS[i];
  if (hit) return hit;
  if (!last) throw new Error("REAL_PLANETS is empty");
  // beyond Neptune, keep stepping outward on the same spacing rather than inventing bodies
  const over = i - REAL_PLANETS.length + 1;
  return { ...last, name: `${last.name} +${over}`, semiMajorAu: last.semiMajorAu * (1 + over * 0.62) };
}

/**
 * Lays out `count` bodies. The three modes differ only in how radius and distance are compressed;
 * every mode reports `auPerUnit` so the cockpit's distance readout stays honest.
 */
export function arrange(mode: ScaleMode, opts: ArrangeOptions): Arrangement {
  const count = Math.max(1, Math.min(24, Math.round(opts.count)));
  const outer = opts.outerRadius ?? 110;
  const spanAu = clamp(opts.spanAu ?? 30, 0.2, LIGHT_YEAR_AU);
  const sunStyled = opts.sunRadius ?? 6;
  const picks = Array.from({ length: count }, (_, i) => planetAt(i));
  const maxAu = Math.max(...picks.map((p) => p.semiMajorAu));
  const auPerUnit = spanAu / outer;

  if (mode === "real") {
    // one scale for everything: kilometres per scene unit, taken from the outermost orbit
    const kmPerUnit = (maxAu * AU_KM) / outer;
    const bodies = picks.map((p) => ({
      size: Math.max(0.004, p.radiusKm / kmPerUnit),
      orbit: (p.semiMajorAu * AU_KM) / kmPerUnit,
      tilt: p.tiltDeg,
      spin: spinFromDay(p.dayHours),
      type: p.type,
      ringed: p.ringed,
      name: p.name,
    }));
    const sunRadius = Math.max(0.02, SUN_RADIUS_KM / kmPerUnit);
    return {
      sunRadius,
      bodies,
      belt: { radius: ((REAL_BELT.innerAu + REAL_BELT.outerAu) / 2 / maxAu) * outer, width: ((REAL_BELT.outerAu - REAL_BELT.innerAu) / maxAu) * outer },
      auPerUnit: maxAu / outer,
      note: "true to scale — the planets will be specks and the sun a dot. Correct, barely visible.",
    };
  }

  if (mode === "relative") {
    // planets keep their ratios to each other; the sun is compressed so it does not swallow the frame
    const biggest = Math.max(...picks.map((p) => p.radiusKm));
    const bodies = picks.map((p) => ({
      size: clamp((p.radiusKm / biggest) * 2.6, 0.42, 2.6),
      // square root spacing: the inner planets separate, Neptune still fits
      orbit: 14 + (Math.sqrt(p.semiMajorAu / maxAu) * (outer - 14)),
      tilt: p.tiltDeg,
      spin: spinFromDay(p.dayHours),
      type: p.type,
      ringed: p.ringed,
      name: p.name,
    }));
    const beltMid = Math.sqrt(((REAL_BELT.innerAu + REAL_BELT.outerAu) / 2) / maxAu) * (outer - 14) + 14;
    return {
      sunRadius: sunStyled,
      bodies,
      belt: { radius: beltMid, width: Math.max(4, (Math.sqrt(REAL_BELT.outerAu / maxAu) - Math.sqrt(REAL_BELT.innerAu / maxAu)) * (outer - 14)) },
      auPerUnit,
      note: "true size ratios between the planets, distances eased so the whole system fits.",
    };
  }

  const bodies = picks.map((p, i) => ({
    size: STYLISED_SIZES[i % STYLISED_SIZES.length] ?? 1.2,
    orbit: STYLISED_ORBITS[i] ?? (STYLISED_ORBITS[STYLISED_ORBITS.length - 1] ?? 110) + (i - STYLISED_ORBITS.length + 1) * 18,
    tilt: p.tiltDeg,
    spin: spinFromDay(p.dayHours),
    type: p.type,
    ringed: p.ringed,
    name: p.name,
  }));
  return {
    sunRadius: sunStyled,
    bodies,
    belt: { radius: 65.5, width: 9 },
    auPerUnit,
    note: "hand-picked sizes and orbits — the readable version.",
  };
}

/** The rule the admin and the API both enforce: nothing may be as large as the star it orbits. */
export const MAX_PLANET_FRACTION = 0.72;
export function maxPlanetSize(sunRadius: number): number {
  return Math.max(0.05, sunRadius * MAX_PLANET_FRACTION);
}
export function clampPlanetSize(size: number, sunRadius: number): number {
  return Math.min(size, maxPlanetSize(sunRadius));
}
