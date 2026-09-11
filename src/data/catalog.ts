// The catalogue: real stars and real worlds, offered as presets for the scene and for a project's planet.
//
// Every figure here is a published measurement — stellar radii, temperatures and luminosities from the
// standard catalogues, solar-system radii and axes from the NASA planetary fact sheets, exoplanet radii
// and semi-major axes from the NASA Exoplanet Archive. Nothing is invented to fill a column: where a
// quantity has not been measured — which is most exoplanet axial tilts and rotation periods — it is
// `null`, the preset leaves that knob absent so the scene's own default supplies it, and the admin
// says "not measured" rather than showing a number nobody has.
//
// Radii of the red supergiants are the least certain numbers in the file by a wide margin; the
// published ranges are in each one's `note` so the uncertainty travels with the value.
//
// This is the source of truth. `src/db/seed.ts` copies it into `star_presets` and `body_presets`,
// after which the admin owns the rows and may edit them.

import type { PlanetConfigJson } from "@/db/schema";

// ── stars ─────────────────────────────────────────────

/** Spectral class, plus WD for a white dwarf — enough to pick a colour ramp and a surface character. */
export type StarClass = "M" | "K" | "G" | "F" | "A" | "B" | "WD";

export interface StarPreset {
  slug: string;
  name: string;
  /** What kind of object it is, in words a visitor would use. */
  kind: string;
  cls: StarClass;
  constellation: string;
  /** Radius in solar radii. The Sun is 1. */
  radiusSolar: number;
  /** Effective surface temperature, kelvin. */
  tempK: number;
  /** Bolometric luminosity in solar luminosities. */
  luminositySolar: number;
  /** Mass in solar masses. */
  massSolar: number;
  /** Distance from Earth, light years. */
  distanceLy: number;
  note: string;
  /** The shader's ramp and knobs — see SHADER_BY_CLASS. */
  colorCore: number; colorMid: number; colorEdge: number;
  intensity: number; granulation: number; limb: number; spots: number; spin: number; corona: number; flare: number;
}

/**
 * What each class looks like, and how it behaves.
 *
 * The ramp is the colour a body of that temperature actually radiates, warmed slightly at the core
 * and pushed to its edge colour at the limb. The knobs follow the physics: a red giant's convection
 * cells are enormous and its rotation is glacial, so granulation is high and spin near zero; an M
 * dwarf is a flare star, so flare and spots run hot; a white dwarf has no convection at all.
 */
const SHADER_BY_CLASS: Readonly<Record<StarClass, Omit<StarPreset, "slug" | "name" | "kind" | "cls" | "constellation" | "radiusSolar" | "tempK" | "luminositySolar" | "massSolar" | "distanceLy" | "note">>> = {
  M:  { colorCore: 0xffd9a8, colorMid: 0xff8b3d, colorEdge: 0xd93b0d, intensity: 0.7, granulation: 2.2, limb: 1.6, spots: 0.9, spin: 0.35, corona: 0.7, flare: 2.4 },
  K:  { colorCore: 0xffe6bd, colorMid: 0xffab5c, colorEdge: 0xff6a1e, intensity: 0.85, granulation: 1.5, limb: 1.3, spots: 0.6, spin: 0.7, corona: 0.9, flare: 1.4 },
  G:  { colorCore: 0xfff3c4, colorMid: 0xffb547, colorEdge: 0xff7a1a, intensity: 1, granulation: 1, limb: 1, spots: 0.25, spin: 1, corona: 1, flare: 1 },
  F:  { colorCore: 0xfffaf0, colorMid: 0xffe2b0, colorEdge: 0xffb066, intensity: 1.25, granulation: 0.8, limb: 0.9, spots: 0.12, spin: 1.5, corona: 1.1, flare: 0.8 },
  A:  { colorCore: 0xffffff, colorMid: 0xdfe9ff, colorEdge: 0x9fc3ff, intensity: 1.6, granulation: 0.4, limb: 0.7, spots: 0.04, spin: 2.2, corona: 1.3, flare: 0.5 },
  B:  { colorCore: 0xeef4ff, colorMid: 0xbcd4ff, colorEdge: 0x6f9dff, intensity: 2, granulation: 0.25, limb: 0.55, spots: 0, spin: 2.6, corona: 1.8, flare: 0.6 },
  WD: { colorCore: 0xffffff, colorMid: 0xd9e8ff, colorEdge: 0x8fb8ff, intensity: 0.5, granulation: 0, limb: 0.4, spots: 0, spin: 2.8, corona: 0.2, flare: 0.1 },
};

type StarFacts = [radiusSolar: number, tempK: number, luminositySolar: number, massSolar: number, distanceLy: number];

function star(
  slug: string, name: string, kind: string, cls: StarClass, constellation: string,
  [radiusSolar, tempK, luminositySolar, massSolar, distanceLy]: StarFacts, note: string,
  over: Partial<StarPreset> = {},
): StarPreset {
  return { slug, name, kind, cls, constellation, radiusSolar, tempK, luminositySolar, massSolar, distanceLy, note, ...SHADER_BY_CLASS[cls], ...over };
}

/** Nearest first among the ordinary stars, then the giants, then the monsters. */
export const STAR_PRESETS: readonly StarPreset[] = [
  star("sol", "The Sun", "yellow dwarf", "G", "—", [1, 5772, 1, 1, 0.0000158],
    "The reference for every other row. One solar radius is 695,700 km."),
  star("proxima-centauri", "Proxima Centauri", "red dwarf", "M", "Centaurus", [0.1542, 3042, 0.0017, 0.122, 4.246],
    "The closest star to the Sun, and a flare star: it brightens by whole magnitudes in minutes."),
  star("alpha-centauri-a", "Alpha Centauri A", "yellow dwarf", "G", "Centaurus", [1.2234, 5790, 1.519, 1.079, 4.365],
    "The Sun's near twin, a little larger and a little brighter."),
  star("alpha-centauri-b", "Alpha Centauri B", "orange dwarf", "K", "Centaurus", [0.8632, 5260, 0.5002, 0.909, 4.365],
    "The cooler half of the pair, half the Sun's output."),
  star("barnards-star", "Barnard's Star", "red dwarf", "M", "Ophiuchus", [0.187, 3134, 0.0035, 0.144, 5.96],
    "The fastest proper motion of any star — it crosses a Moon's width of sky every 180 years."),
  star("wolf-359", "Wolf 359", "red dwarf", "M", "Leo", [0.16, 2800, 0.0014, 0.09, 7.86],
    "One of the faintest stars known, and among the smallest that still fuse hydrogen."),
  star("sirius-a", "Sirius A", "main sequence", "A", "Canis Major", [1.711, 9940, 25.4, 2.063, 8.6],
    "The brightest star in the night sky, twenty-five times the Sun's output."),
  star("sirius-b", "Sirius B", "white dwarf", "WD", "Canis Major", [0.0084, 25200, 0.056, 1.018, 8.6],
    "A star's dead core: the mass of the Sun packed into a body the size of Earth."),
  star("ross-128", "Ross 128", "red dwarf", "M", "Virgo", [0.1967, 3192, 0.00362, 0.168, 11.0],
    "Unusually quiet for an M dwarf, which is why its planet is interesting.", { flare: 0.9, spots: 0.4 }),
  star("61-cygni-a", "61 Cygni A", "orange dwarf", "K", "Cygnus", [0.665, 4526, 0.153, 0.7, 11.4],
    "The first star to have its distance measured, by Bessel in 1838."),
  star("tau-ceti", "Tau Ceti", "yellow dwarf", "G", "Cetus", [0.793, 5344, 0.52, 0.783, 11.9],
    "The nearest single star much like the Sun, and metal-poor with it."),
  star("teegardens-star", "Teegarden's Star", "red dwarf", "M", "Aries", [0.107, 2904, 0.00073, 0.097, 12.5],
    "Barely above the hydrogen-burning limit, and only found in 2003."),
  star("altair", "Altair", "main sequence", "A", "Aquila", [1.63, 7550, 10.6, 1.79, 16.73],
    "Spins once in nine hours, which flattens it: the equator is 20% wider than the poles.", { spin: 3 }),
  star("vega", "Vega", "main sequence", "A", "Lyra", [2.362, 9602, 40.12, 2.135, 25.04],
    "The zero point of the magnitude scale, and also a fast rotator seen nearly pole-on."),
  star("fomalhaut", "Fomalhaut", "main sequence", "A", "Piscis Austrinus", [1.842, 8590, 16.63, 1.92, 25.13],
    "Wrapped in a sharp-edged debris ring — the first such belt imaged in visible light."),
  star("trappist-1", "TRAPPIST-1", "ultracool dwarf", "M", "Aquarius", [0.1192, 2566, 0.000553, 0.0898, 40.7],
    "Barely larger than Jupiter, and carrying seven Earth-sized planets."),
  star("pollux", "Pollux", "orange giant", "K", "Gemini", [8.8, 4586, 43, 1.91, 33.78],
    "The nearest giant star to the Sun, and it has a planet."),
  star("capella-aa", "Capella Aa", "yellow giant", "G", "Auriga", [11.98, 4970, 78.7, 2.57, 42.9],
    "The brighter of two giants orbiting each other every 104 days.", { granulation: 1.4, spin: 0.6 }),
  star("arcturus", "Arcturus", "red giant", "K", "Boötes", [25.4, 4286, 170, 1.08, 36.7],
    "A halo star passing through: it is moving at 122 km/s relative to the Sun.", { granulation: 1.8, spin: 0.3 }),
  star("aldebaran", "Aldebaran", "red giant", "K", "Taurus", [44.13, 3900, 439, 1.16, 65.3],
    "The eye of the bull. Forty-four Suns across, but only slightly more massive than one.", { granulation: 2, spin: 0.2 }),
  star("polaris", "Polaris", "yellow supergiant", "F", "Ursa Minor", [37.5, 6015, 1260, 5.13, 447],
    "A Cepheid variable: it pulses, and that pulse is how the distance ladder was calibrated.", { granulation: 1.2, spin: 0.4 }),
  star("rigel", "Rigel", "blue supergiant", "B", "Orion", [78.9, 12100, 120000, 21, 860],
    "A hundred and twenty thousand Suns' worth of light, most of it ultraviolet."),
  star("eta-carinae-a", "Eta Carinae A", "luminous blue variable", "B", "Carina", [240, 9400, 5000000, 100, 7500],
    "Survived its own eruption in 1843, which briefly made it the second-brightest star in the sky.", { flare: 3, corona: 3, spots: 0.4 }),
  star("deneb", "Deneb", "blue-white supergiant", "A", "Cygnus", [203, 8525, 196000, 19, 2615],
    "One of the most luminous stars known by absolute magnitude, and its distance is still argued over.", { granulation: 0.6 }),
  star("antares", "Antares", "red supergiant", "M", "Scorpius", [680, 3660, 75900, 12, 550],
    "The rival of Mars. Radius estimates run from 680 to 850 solar radii.", { granulation: 2.6, spin: 0.08, spots: 1.1, flare: 1.2 }),
  star("betelgeuse", "Betelgeuse", "red supergiant", "M", "Orion", [764, 3600, 126000, 16.5, 548],
    "Published radii range from about 640 to 1,000 solar radii; it dimmed visibly in 2019 when it shed a cloud of dust.", { granulation: 2.8, spin: 0.06, spots: 1.3, flare: 1.2 }),
  star("r-doradus", "R Doradus", "red giant", "M", "Dorado", [298, 2710, 6500, 0.8, 178],
    "The largest apparent disc of any star but the Sun, and the first with convection cells resolved.", { granulation: 3, spin: 0.05, spots: 1 }),
  star("mu-cephei", "Mu Cephei", "red supergiant", "M", "Cepheus", [972, 3551, 269000, 19.2, 2840],
    "Herschel's Garnet Star — one of the reddest naked-eye stars there is.", { granulation: 2.8, spin: 0.05, spots: 1.2, flare: 1 }),
  star("vy-canis-majoris", "VY Canis Majoris", "red hypergiant", "M", "Canis Major", [1420, 3490, 270000, 17, 3820],
    "Around 1,420 solar radii. Light takes six hours to cross it.", { granulation: 3, spin: 0.04, spots: 1.4, flare: 1 }),
  star("uy-scuti", "UY Scuti", "red supergiant", "M", "Scutum", [1708, 3365, 340000, 9, 5100],
    "Long quoted as the largest known star at ~1,708 solar radii, though a revised distance puts it lower. Put at the Sun's place its surface would reach past Jupiter.", { granulation: 3, spin: 0.03, spots: 1.4, flare: 1 }),
  star("stephenson-2-18", "Stephenson 2-18", "red hypergiant", "M", "Scutum", [2150, 3200, 440000, 20, 19570],
    "The largest radius anyone has published for a star, ~2,150 solar radii — and the most disputed, because its membership of the cluster is uncertain.", { granulation: 3, spin: 0.03, spots: 1.5, flare: 1 }),
];

// ── worlds ────────────────────────────────────────────

export type BodyKind = "planet" | "dwarf" | "moon" | "exoplanet";

export interface BodyPreset {
  slug: string;
  name: string;
  kind: BodyKind;
  /** Which star it goes round, so the dropdown can group by system. */
  system: string;
  /** For a moon, the planet it orbits; empty otherwise. */
  parent: string;
  /** Equatorial radius, kilometres. */
  radiusKm: number;
  /** Distance from its star, astronomical units. A moon carries its planet's, which is where it sits. */
  semiMajorAu: number;
  /** Axial tilt in degrees, or null where it has not been measured. */
  tiltDeg: number | null;
  /** Sidereal rotation in hours, negative for retrograde, or null where unmeasured. */
  dayHours: number | null;
  ringed: boolean;
  note: string;
  /** How it looks. Size, tilt and spin are derived from the real figures above when it is applied. */
  planet: PlanetConfigJson;
}

/** Earth and Jupiter radii, so an exoplanet's published figure can be written as it is published. */
export const EARTH_KM = 6371;
export const JUPITER_KM = 69_911;
export const earths = (r: number): number => Math.round(r * EARTH_KM);
export const jupiters = (r: number): number => Math.round(r * JUPITER_KM);

type Look = Omit<PlanetConfigJson, "size"> & { size?: number };
/** Appearance only — `size` is a placeholder the apply step replaces with the real radius ratio. */
const look = (l: Look): PlanetConfigJson => ({ size: 1, ...l });

function body(
  slug: string, name: string, kind: BodyKind, system: string, parent: string,
  radiusKm: number, semiMajorAu: number, tiltDeg: number | null, dayHours: number | null,
  planet: PlanetConfigJson, note: string, ringed = false,
): BodyPreset {
  return { slug, name, kind, system, parent, radiusKm, semiMajorAu, tiltDeg, dayHours, ringed, note, planet };
}

const SOL = "The Sun";

export const BODY_PRESETS: readonly BodyPreset[] = [
  // ── the planets ──
  body("mercury", "Mercury", "planet", SOL, "", 2439.7, 0.387, 0.03, 1407.6,
    look({ type: "rocky", c0: 0x3a3a3a, c1: 0x6b6b6b, c2: 0x8e8b85, c3: 0xcfcac0, rim: 0x9a9a9a, crater: 0.95, ocean: 0, cloud: 0, atmo: 0.02, atmoAlpha: 0.05 }),
    "No air to speak of, and 4.5 billion years of impacts kept exactly where they landed."),
  body("venus", "Venus", "planet", SOL, "", 6051.8, 0.723, 177.4, -5832.5,
    look({ type: "lava", c0: 0x6b4a1f, c1: 0xc9a15a, c2: 0xe8d3a1, c3: 0xff9a3c, rim: 0xffd08a, vein: 0.35, cloud: 1, atmo: 0.3, atmoAlpha: 0.75, glow: 0.6 }),
    "Turns backwards, once every 243 days, under an unbroken sulphuric-acid overcast at 92 atmospheres."),
  body("earth", "Earth", "planet", SOL, "", 6371, 1, 23.44, 23.9,
    look({ type: "liquid", c0: 0x0a2a5c, c1: 0x1666a8, c2: 0x2f7d3a, c3: 0xf4f7ff, rim: 0x7fc8ff, ocean: 0.71, cloud: 0.67, crater: 0.1, atmo: 0.16, atmoAlpha: 0.34, vein: 0.22 }),
    "Seventy-one per cent water, and the only surface known to carry its own night-side lights."),
  body("mars", "Mars", "planet", SOL, "", 3389.5, 1.524, 25.19, 24.6,
    look({ type: "muddy", c0: 0x5a2410, c1: 0x9c4a22, c2: 0xc8793f, c3: 0xe6c9a0, rim: 0xe09a5c, ocean: 0.12, cloud: 0.12, crater: 0.45, vein: 0.55, atmo: 0.07, atmoAlpha: 0.16 }),
    "Iron oxide over the whole surface, dry river channels beneath it, and carbon-dioxide frost at both poles."),
  body("jupiter", "Jupiter", "planet", SOL, "", 69911, 5.204, 3.13, 9.9,
    look({ type: "gas", c0: 0x5c3a20, c1: 0xa8794a, c2: 0xd9b98c, c3: 0xf0e3cf, rim: 0xd9a86a, bands: 22, bandSharp: 0.55, cloud: 0.35, atmo: 0.13, atmoAlpha: 0.26 }),
    "A storm wider than Earth that has been running for at least three hundred years."),
  body("saturn", "Saturn", "planet", SOL, "", 58232, 9.583, 26.73, 10.7,
    look({ type: "gas", c0: 0x8a6b33, c1: 0xc9a86a, c2: 0xe3cfa4, c3: 0xf7eddb, rim: 0xe0c48f, bands: 16, bandSharp: 0.3, cloud: 0.22, atmo: 0.14, atmoAlpha: 0.24,
      ring: { ca: 0xd9c9a6, cb: 0x8f7d5e, inner: 1.24, outer: 2.27, tilt: 0 } }),
    "The rings are 280,000 km across and, in places, ten metres thick.", true),
  body("uranus", "Uranus", "planet", SOL, "", 25362, 19.191, 97.77, -17.2,
    look({ type: "ice", c0: 0x1b6f8f, c1: 0x4fc3d9, c2: 0xa8e6ef, c3: 0xe8fbff, rim: 0x86dff0, bands: 8, bandSharp: 0.14, cloud: 0.16, atmo: 0.17, atmoAlpha: 0.3,
      ring: { ca: 0x5a5f68, cb: 0x2e3238, inner: 1.64, outer: 2.0, tilt: 0 } }),
    "Tipped 98°, so it rolls along its orbit and each pole gets 42 years of daylight.", true),
  body("neptune", "Neptune", "planet", SOL, "", 24622, 30.07, 28.32, 16.1,
    look({ type: "ice", c0: 0x10307a, c1: 0x2d5fd4, c2: 0x6f9bff, c3: 0xdfe9ff, rim: 0x7fa8ff, bands: 9, bandSharp: 0.24, cloud: 0.24, atmo: 0.17, atmoAlpha: 0.32 }),
    "The fastest winds in the solar system: 2,100 km/h, on a world that gets 1/900th of Earth's sunlight."),

  // ── dwarf planets ──
  body("ceres", "Ceres", "dwarf", SOL, "", 469.7, 2.77, 4, 9.07,
    look({ type: "rocky", c0: 0x2e2b28, c1: 0x56514a, c2: 0x7d766c, c3: 0xd8d2c6, rim: 0x8f8a80, crater: 0.85, ocean: 0.05, cloud: 0, atmo: 0.02, atmoAlpha: 0.05 }),
    "The largest body in the asteroid belt, with bright salt deposits at the bottom of Occator crater."),
  body("pluto", "Pluto", "dwarf", SOL, "", 1188.3, 39.48, 122.53, -153.3,
    look({ type: "ice", c0: 0x4a2f21, c1: 0x9a6a4a, c2: 0xd9c2a4, c3: 0xf4ece0, rim: 0xc9a98c, crater: 0.4, cloud: 0.08, bands: 5, bandSharp: 0.1, atmo: 0.06, atmoAlpha: 0.14 }),
    "A nitrogen-ice heart the size of Texas, and a thin atmosphere that freezes out as it moves away from the Sun."),
  body("eris", "Eris", "dwarf", SOL, "", 1163, 67.86, 78, 25.9,
    look({ type: "ice", c0: 0x8f96a3, c1: 0xc4cbd6, c2: 0xe8edf5, c3: 0xffffff, rim: 0xcfe0f0, crater: 0.3, atmo: 0.03, atmoAlpha: 0.08 }),
    "The discovery that cost Pluto its planethood: very nearly the same size, and more massive."),
  body("haumea", "Haumea", "dwarf", SOL, "", 816, 43.13, 126, 3.9,
    look({ type: "ice", c0: 0x9aa0a8, c1: 0xd2d8e0, c2: 0xeef2f8, c3: 0xffffff, rim: 0xd6e4f0, crater: 0.24, atmo: 0.02, atmoAlpha: 0.06,
      ring: { ca: 0x8a93a0, cb: 0x4a5058, inner: 1.6, outer: 1.8, tilt: 0 } }),
    "Spins once every four hours, which has stretched it into an egg twice as long as it is wide. It has a ring.", true),
  body("makemake", "Makemake", "dwarf", SOL, "", 715, 45.43, null, 22.8,
    look({ type: "ice", c0: 0x6b3a2a, c1: 0xa9694a, c2: 0xd8b394, c3: 0xf2e6d8, rim: 0xc99a78, crater: 0.28, atmo: 0.02, atmoAlpha: 0.06 }),
    "Reddened by methane ice under ultraviolet light. Its axial tilt has not been measured."),

  // ── moons ──
  body("luna", "The Moon", "moon", SOL, "Earth", 1737.4, 1, 6.68, 655.7,
    look({ type: "rocky", c0: 0x26262a, c1: 0x5a5a5e, c2: 0x8e8e92, c3: 0xd6d6da, rim: 0x9a9aa0, crater: 1, ocean: 0, cloud: 0, atmo: 0.01, atmoAlpha: 0.03 }),
    "Tidally locked, so the same face has looked at us for four billion years."),
  body("phobos", "Phobos", "moon", SOL, "Mars", 11.267, 1.524, null, 7.66,
    look({ type: "rocky", c0: 0x201c18, c1: 0x463f36, c2: 0x6e6558, c3: 0xa89b88, rim: 0x7a7062, crater: 1, atmo: 0, atmoAlpha: 0 }),
    "Orbits faster than Mars turns, so it rises in the west. It is spiralling in and will break up."),
  body("deimos", "Deimos", "moon", SOL, "Mars", 6.2, 1.524, null, 30.3,
    look({ type: "rocky", c0: 0x231f1a, c1: 0x4c453b, c2: 0x776c5d, c3: 0xb0a28d, rim: 0x82776a, crater: 0.9, atmo: 0, atmoAlpha: 0 }),
    "Smoother than Phobos: its craters are half-buried in its own dust."),
  body("io", "Io", "moon", SOL, "Jupiter", 1821.6, 5.204, 0, 42.5,
    look({ type: "lava", c0: 0x4a3b0a, c1: 0xb59a1e, c2: 0xf0d75a, c3: 0xff6a1e, rim: 0xffb03c, vein: 0.85, crater: 0.05, cloud: 0, glow: 1.6, atmo: 0.04, atmoAlpha: 0.1 }),
    "The most volcanically active body known — four hundred volcanoes, kept molten by Jupiter kneading it."),
  body("europa", "Europa", "moon", SOL, "Jupiter", 1560.8, 5.204, 0.1, 85.2,
    look({ type: "ice", c0: 0x8a6a4a, c1: 0xd9c2a4, c2: 0xeef2f8, c3: 0xffffff, rim: 0xcfe4f5, crater: 0.12, vein: 0.6, bands: 3, bandSharp: 0.08, atmo: 0.03, atmoAlpha: 0.09 }),
    "The smoothest solid surface in the solar system, cracked all over, with twice Earth's water underneath."),
  body("ganymede", "Ganymede", "moon", SOL, "Jupiter", 2634.1, 5.204, 0.33, 171.7,
    look({ type: "ice", c0: 0x4a4238, c1: 0x8a8276, c2: 0xc2c8cf, c3: 0xeef3f8, rim: 0xb6c6d4, crater: 0.55, bands: 6, bandSharp: 0.18, atmo: 0.03, atmoAlpha: 0.08 }),
    "The largest moon there is — bigger than Mercury — and the only one with a magnetic field of its own."),
  body("callisto", "Callisto", "moon", SOL, "Jupiter", 2410.3, 5.204, 0, 400.5,
    look({ type: "rocky", c0: 0x22201d, c1: 0x4e4740, c2: 0x7d7469, c3: 0xc0b6a6, rim: 0x8a8175, crater: 1, ocean: 0, atmo: 0.02, atmoAlpha: 0.05 }),
    "The most cratered surface known: nothing has resurfaced it in four billion years."),
  body("titan", "Titan", "moon", SOL, "Saturn", 2574.7, 9.583, 0.3, 382.7,
    look({ type: "muddy", c0: 0x4a2e08, c1: 0x9c6a18, c2: 0xd9a83c, c3: 0xf5dc9a, rim: 0xffb84a, cloud: 0.9, ocean: 0.2, vein: 0.4, crater: 0.08, atmo: 0.28, atmoAlpha: 0.68 }),
    "The only moon with a real atmosphere, and the only other place with liquid on the surface — methane, not water."),
  body("enceladus", "Enceladus", "moon", SOL, "Saturn", 252.1, 9.583, 0, 32.9,
    look({ type: "ice", c0: 0xc8d4e0, c1: 0xe6eef6, c2: 0xf7fbff, c3: 0xffffff, rim: 0xdff0ff, crater: 0.25, vein: 0.45, atmo: 0.04, atmoAlpha: 0.12 }),
    "Whiter than fresh snow, and venting water from cracks at its south pole straight into Saturn's E ring."),
  body("mimas", "Mimas", "moon", SOL, "Saturn", 198.2, 9.583, 0, 22.6,
    look({ type: "ice", c0: 0x7a7f86, c1: 0xb4bcc6, c2: 0xdde4ec, c3: 0xf6fafd, rim: 0xc6d6e4, crater: 0.95, atmo: 0.01, atmoAlpha: 0.04 }),
    "Herschel crater is a third of its diameter — any bigger and the impact would have shattered it."),
  body("tethys", "Tethys", "moon", SOL, "Saturn", 531.1, 9.583, 0, 45.3,
    look({ type: "ice", c0: 0x868c94, c1: 0xbfc7d0, c2: 0xe2e9f0, c3: 0xfafcff, rim: 0xcfdde9, crater: 0.8, vein: 0.3, atmo: 0.01, atmoAlpha: 0.04 }),
    "Ithaca Chasma runs three quarters of the way round it."),
  body("dione", "Dione", "moon", SOL, "Saturn", 561.4, 9.583, 0, 65.7,
    look({ type: "ice", c0: 0x6e747c, c1: 0xa9b2bc, c2: 0xd8e0e9, c3: 0xf4f8fc, rim: 0xc2d2e0, crater: 0.7, vein: 0.35, atmo: 0.01, atmoAlpha: 0.04 }),
    "Bright ice cliffs on the trailing side, mapped as wispy streaks long before anyone knew what they were."),
  body("rhea", "Rhea", "moon", SOL, "Saturn", 763.8, 9.583, 0, 108.4,
    look({ type: "ice", c0: 0x757b83, c1: 0xafb8c2, c2: 0xdbe2ea, c3: 0xf6f9fd, rim: 0xc7d5e2, crater: 0.85, atmo: 0.01, atmoAlpha: 0.04 }),
    "Two thirds water ice, one third rock, and craters everywhere."),
  body("iapetus", "Iapetus", "moon", SOL, "Saturn", 734.5, 9.583, 0, 1903.9,
    look({ type: "ice", c0: 0x1a1512, c1: 0x6b5f52, c2: 0xd8dee6, c3: 0xf8fbff, rim: 0xb0c0d0, crater: 0.8, bands: 2, bandSharp: 0.7, atmo: 0.01, atmoAlpha: 0.04 }),
    "One hemisphere as dark as coal, the other as bright as snow, and a 13 km ridge along the equator."),
  body("miranda", "Miranda", "moon", SOL, "Uranus", 235.8, 19.191, 0, 33.9,
    look({ type: "ice", c0: 0x5c646e, c1: 0x99a4b0, c2: 0xcdd8e4, c3: 0xeff5fb, rim: 0xb8cade, crater: 0.6, vein: 0.7, atmo: 0.01, atmoAlpha: 0.03 }),
    "Looks assembled from mismatched parts, with a cliff twenty kilometres high."),
  body("ariel", "Ariel", "moon", SOL, "Uranus", 578.9, 19.191, 0, 60.5,
    look({ type: "ice", c0: 0x6b737d, c1: 0xa6b1bd, c2: 0xd6dfe9, c3: 0xf3f8fc, rim: 0xc0d2e2, crater: 0.5, vein: 0.5, atmo: 0.01, atmoAlpha: 0.03 }),
    "The brightest of Uranus's moons, and the most recently resurfaced."),
  body("umbriel", "Umbriel", "moon", SOL, "Uranus", 584.7, 19.191, 0, 99.5,
    look({ type: "rocky", c0: 0x1e1e22, c1: 0x3e3e44, c2: 0x62626a, c3: 0x9a9aa4, rim: 0x6e6e78, crater: 0.9, ocean: 0, atmo: 0.01, atmoAlpha: 0.03 }),
    "The darkest of the five, with one inexplicably bright ring of frost on its floor."),
  body("titania", "Titania", "moon", SOL, "Uranus", 788.4, 19.191, 0, 209.5,
    look({ type: "ice", c0: 0x4e4a48, c1: 0x8c8682, c2: 0xc4c2c4, c3: 0xeceff4, rim: 0xb4bfcc, crater: 0.65, vein: 0.4, atmo: 0.01, atmoAlpha: 0.04 }),
    "The largest Uranian moon, scarred by a canyon system 1,500 km long."),
  body("oberon", "Oberon", "moon", SOL, "Uranus", 761.4, 19.191, 0, 323.1,
    look({ type: "rocky", c0: 0x2a2422, c1: 0x584e48, c2: 0x8a7d72, c3: 0xc4b7a8, rim: 0x907f74, crater: 0.95, ocean: 0, atmo: 0.01, atmoAlpha: 0.03 }),
    "Craters with dark floors, as though something erupted into them after the impacts."),
  body("triton", "Triton", "moon", SOL, "Neptune", 1353.4, 30.07, 0, -141,
    look({ type: "ice", c0: 0x8a6a70, c1: 0xd0b6bc, c2: 0xedf0f6, c3: 0xffffff, rim: 0xd8e6f5, crater: 0.2, vein: 0.5, cloud: 0.1, atmo: 0.05, atmoAlpha: 0.14 }),
    "Orbits backwards, which means Neptune captured it. Nitrogen geysers still erupt at 38 K."),
  body("charon", "Charon", "moon", SOL, "Pluto", 606, 39.48, 0, 153.3,
    look({ type: "ice", c0: 0x4a4038, c1: 0x877c72, c2: 0xc0b9b2, c3: 0xe9e7e6, rim: 0xb2b6bd, crater: 0.55, vein: 0.3, atmo: 0.01, atmoAlpha: 0.03 }),
    "Half Pluto's diameter — they orbit a point in the space between them, so neither goes round the other."),

  // ── exoplanets ──
  // Radii are as published, converted here from Earth or Jupiter radii. Axial tilt is unmeasured for
  // every one of them, and rotation is known only where tidal locking makes it equal to the orbit —
  // so both are null and the scene's own defaults apply.
  body("51-pegasi-b", "51 Pegasi b", "exoplanet", "51 Pegasi", "", jupiters(1.9), 0.0527, null, null,
    look({ type: "gas", c0: 0x3a1206, c1: 0x9c3a10, c2: 0xe07a28, c3: 0xffd08a, rim: 0xff9a4a, bands: 14, bandSharp: 0.4, cloud: 0.4, glow: 0.5, atmo: 0.2, atmoAlpha: 0.4 }),
    "The first planet found around a Sun-like star, in 1995, and the one that invented the phrase hot Jupiter."),
  body("hd-209458-b", "HD 209458 b", "exoplanet", "HD 209458", "", jupiters(1.38), 0.04747, null, null,
    look({ type: "gas", c0: 0x2a1a3a, c1: 0x6b3a7a, c2: 0xc06aa8, c3: 0xffc2e0, rim: 0xff8ac8, bands: 12, bandSharp: 0.3, cloud: 0.5, glow: 0.5, atmo: 0.26, atmoAlpha: 0.5 }),
    "Nicknamed Osiris. The first exoplanet caught transiting, and the first with an atmosphere detected — it is boiling away."),
  body("hd-189733-b", "HD 189733 b", "exoplanet", "HD 189733", "", jupiters(1.138), 0.03142, null, null,
    look({ type: "gas", c0: 0x04143a, c1: 0x0f3a8a, c2: 0x2f6fd4, c3: 0x9fc8ff, rim: 0x5fa8ff, bands: 13, bandSharp: 0.34, cloud: 0.55, glow: 0.4, atmo: 0.24, atmoAlpha: 0.5 }),
    "Deep cobalt blue, from silicate clouds. It rains molten glass sideways at 7,000 km/h."),
  body("wasp-12b", "WASP-12b", "exoplanet", "WASP-12", "", jupiters(1.9), 0.0234, null, null,
    look({ type: "lava", c0: 0x050508, c1: 0x120d10, c2: 0x241418, c3: 0xff4a12, rim: 0xff7a2a, vein: 0.7, glow: 1.8, cloud: 0, atmo: 0.22, atmoAlpha: 0.4 }),
    "Reflects less than 6% of the light that hits it — darker than fresh asphalt — and its star is pulling it apart."),
  body("wasp-121b", "WASP-121b", "exoplanet", "WASP-121", "", jupiters(1.865), 0.02544, null, null,
    look({ type: "lava", c0: 0x2a0604, c1: 0x8a1a08, c2: 0xe04a10, c3: 0xffc65a, rim: 0xff8a3a, vein: 0.8, glow: 2.1, cloud: 0.1, atmo: 0.3, atmoAlpha: 0.55 }),
    "Hot enough at 2,500 K to boil iron; it is stretched into a rugby ball by tides and has a glowing tail."),
  body("wasp-76b", "WASP-76b", "exoplanet", "WASP-76", "", jupiters(1.83), 0.033, null, null,
    look({ type: "lava", c0: 0x1a0a0c, c1: 0x5a2418, c2: 0xb85a2a, c3: 0xffd08a, rim: 0xffa04a, vein: 0.6, glow: 1.5, cloud: 0.15, atmo: 0.26, atmoAlpha: 0.5 }),
    "Iron evaporates on the day side, blows to the night side, and falls as rain."),
  body("wasp-17b", "WASP-17b", "exoplanet", "WASP-17", "", jupiters(1.87), 0.0515, null, null,
    look({ type: "gas", c0: 0x2a1c3a, c1: 0x6a4a8a, c2: 0xb08ad0, c3: 0xe8d6ff, rim: 0xc0a0ff, bands: 11, bandSharp: 0.26, cloud: 0.45, glow: 0.4, atmo: 0.3, atmoAlpha: 0.5 }),
    "Twice Jupiter's width at half its mass, and it orbits backwards relative to its star's spin."),
  body("wasp-39b", "WASP-39b", "exoplanet", "WASP-39", "", jupiters(1.27), 0.0486, null, null,
    look({ type: "gas", c0: 0x3a2410, c1: 0x8a5a24, c2: 0xd09a4a, c3: 0xffe0a8, rim: 0xffb85a, bands: 12, bandSharp: 0.28, cloud: 0.5, glow: 0.35, atmo: 0.24, atmoAlpha: 0.45 }),
    "The first exoplanet where JWST found carbon dioxide, and then sulphur dioxide made by starlight."),
  body("kelt-9b", "KELT-9b", "exoplanet", "KELT-9", "", jupiters(1.891), 0.03462, null, null,
    look({ type: "lava", c0: 0x2a0418, c1: 0x8a0a3a, c2: 0xe83a6a, c3: 0xffd0e8, rim: 0xff6aa8, vein: 0.9, glow: 2.6, cloud: 0, atmo: 0.32, atmoAlpha: 0.6 }),
    "The hottest planet known: 4,600 K on the day side, hotter than most stars, and its molecules are torn apart."),
  body("hat-p-7b", "HAT-P-7b", "exoplanet", "HAT-P-7", "", jupiters(1.431), 0.0379, null, null,
    look({ type: "lava", c0: 0x18101c, c1: 0x4a2a3a, c2: 0x9a5a6a, c3: 0xffc8a8, rim: 0xff9a7a, vein: 0.5, glow: 1.3, cloud: 0.2, atmo: 0.22, atmoAlpha: 0.42 }),
    "Its weather changes: corundum clouds — the mineral of rubies — blow across the terminator."),
  body("kepler-7b", "Kepler-7b", "exoplanet", "Kepler-7", "", jupiters(1.614), 0.06246, null, null,
    look({ type: "gas", c0: 0x4a4a5a, c1: 0x9a9ab0, c2: 0xd8d8e8, c3: 0xffffff, rim: 0xcfd8f0, bands: 10, bandSharp: 0.2, cloud: 0.95, glow: 0.3, atmo: 0.26, atmoAlpha: 0.5 }),
    "The first exoplanet to have its clouds mapped — bright on one side of the disc, clear on the other."),
  body("hd-80606-b", "HD 80606 b", "exoplanet", "HD 80606", "", jupiters(0.921), 0.4564, null, null,
    look({ type: "gas", c0: 0x2a1808, c1: 0x7a4418, c2: 0xc88a3a, c3: 0xffd8a0, rim: 0xffa858, bands: 13, bandSharp: 0.36, cloud: 0.4, glow: 0.6, atmo: 0.2, atmoAlpha: 0.4 }),
    "The most eccentric orbit known for a large planet: it swings from Earth's distance to closer than Mercury in days, and heats by 700 K in six hours."),
  body("55-cancri-e", "55 Cancri e", "exoplanet", "55 Cancri", "", earths(1.875), 0.01544, null, null,
    look({ type: "lava", c0: 0x0a0608, c1: 0x2e1418, c2: 0x6a2a24, c3: 0xff6a1a, rim: 0xffa04a, vein: 0.85, glow: 1.9, crater: 0.1, cloud: 0, atmo: 0.1, atmoAlpha: 0.24 }),
    "A super-Earth so close to its star that the day side is an ocean of lava, and its year is eighteen hours."),
  body("corot-7b", "CoRoT-7b", "exoplanet", "CoRoT-7", "", earths(1.585), 0.017, null, null,
    look({ type: "lava", c0: 0x0a0608, c1: 0x2e1a16, c2: 0x6a3224, c3: 0xff6a1a, rim: 0xffa04a, vein: 0.8, glow: 1.7, cloud: 0, atmo: 0.1, atmoAlpha: 0.24 }),
    "One of the first rocky exoplanets found. Its day side is molten and it may be the stripped core of a gas giant."),
  body("kepler-10b", "Kepler-10b", "exoplanet", "Kepler-10", "", earths(1.47), 0.01684, null, null,
    look({ type: "lava", c0: 0x0a0608, c1: 0x2e1a16, c2: 0x6a3224, c3: 0xff6a1a, rim: 0xffa04a, vein: 0.8, glow: 1.7, cloud: 0, atmo: 0.1, atmoAlpha: 0.24 }),
    "Kepler's first rocky confirmation: a lava world going round its star in twenty hours."),
  body("kepler-16b", "Kepler-16b", "exoplanet", "Kepler-16", "", jupiters(0.7538), 0.7048, null, null,
    look({ type: "ice", c0: 0x14487f, c1: 0x3f9fc4, c2: 0x9fdcea, c3: 0xeafaff, rim: 0x86d6ee, cloud: 0.2, bands: 8, bandSharp: 0.18, atmo: 0.15, atmoAlpha: 0.3 }),
    "Circumbinary — it orbits two stars, so it genuinely has two sunsets."),
  body("kepler-22b", "Kepler-22b", "exoplanet", "Kepler-22", "", earths(2.4), 0.849, null, null,
    look({ type: "liquid", c0: 0x06203f, c1: 0x0f5f9c, c2: 0x3fb0cf, c3: 0xeafcff, rim: 0x9fe0ff, ocean: 0.85, cloud: 0.6, atmo: 0.16, atmoAlpha: 0.32 }),
    "The first planet found in the habitable zone of a Sun-like star. Whether it is rock or water is still unknown."),
  body("kepler-186f", "Kepler-186f", "exoplanet", "Kepler-186", "", earths(1.17), 0.432, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "The first Earth-sized planet in another star's habitable zone. Its red-dwarf sun would look orange from the ground."),
  body("kepler-442b", "Kepler-442b", "exoplanet", "Kepler-442", "", earths(1.34), 0.409, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "Scores higher than almost any other world on the habitability indices, though nothing is known of its air."),
  body("kepler-452b", "Kepler-452b", "exoplanet", "Kepler-452", "", earths(1.63), 1.046, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "Called Earth's cousin: a 385-day year around a star much like the Sun, but 1.5 billion years older."),
  body("kepler-62f", "Kepler-62f", "exoplanet", "Kepler-62", "", earths(1.41), 0.718, null, null,
    look({ type: "ice", c0: 0x14487f, c1: 0x3f9fc4, c2: 0x9fdcea, c3: 0xeafaff, rim: 0x86d6ee, cloud: 0.2, bands: 8, bandSharp: 0.18, atmo: 0.15, atmoAlpha: 0.3 }),
    "Far enough out that it would need a thick carbon-dioxide atmosphere to stay unfrozen."),
  body("kepler-438b", "Kepler-438b", "exoplanet", "Kepler-438", "", earths(1.12), 0.166, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "Earth-sized and temperate, but its star flares hard enough to have stripped any atmosphere."),
  body("kepler-296e", "Kepler-296e", "exoplanet", "Kepler-296", "", earths(1.53), 0.1693, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "In the habitable zone of the smaller of two stars that orbit each other closely."),
  body("kepler-1649c", "Kepler-1649c", "exoplanet", "Kepler-1649", "", earths(1.06), 0.0649, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "Found by re-reading data an algorithm had thrown out. The closest match to Earth in size and light that Kepler found."),
  body("proxima-centauri-b", "Proxima Centauri b", "exoplanet", "Proxima Centauri", "", earths(1.07), 0.04857, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "The nearest exoplanet there is — 4.2 light years — in its star's habitable zone, but under regular X-ray flares."),
  body("trappist-1b", "TRAPPIST-1b", "exoplanet", "TRAPPIST-1", "", earths(1.116), 0.01154, null, null,
    look({ type: "lava", c0: 0x0a0608, c1: 0x2e1a16, c2: 0x6a3224, c3: 0xff6a1a, rim: 0xffa04a, vein: 0.8, glow: 1.7, cloud: 0, atmo: 0.1, atmoAlpha: 0.24 }),
    "The innermost of seven. JWST found it has no atmosphere worth the name, and a dayside of 500 K."),
  body("trappist-1c", "TRAPPIST-1c", "exoplanet", "TRAPPIST-1", "", earths(1.097), 0.0158, null, null,
    look({ type: "rocky", c0: 0x2e2a26, c1: 0x5e564c, c2: 0x8e8377, c3: 0xc9bda9, rim: 0x9a8f80, crater: 0.7, ocean: 0, cloud: 0.05, atmo: 0.05, atmoAlpha: 0.12 }),
    "Venus-sized and Venus-placed, but with far less carbon dioxide than Venus has."),
  body("trappist-1d", "TRAPPIST-1d", "exoplanet", "TRAPPIST-1", "", earths(0.788), 0.02227, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "The smallest of the seven, just inside the warm edge of the habitable zone."),
  body("trappist-1e", "TRAPPIST-1e", "exoplanet", "TRAPPIST-1", "", earths(0.92), 0.02925, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "The most Earth-like of the seven by density and light received, and the best candidate for liquid water."),
  body("trappist-1f", "TRAPPIST-1f", "exoplanet", "TRAPPIST-1", "", earths(1.045), 0.03849, null, null,
    look({ type: "liquid", c0: 0x06203f, c1: 0x0f5f9c, c2: 0x3fb0cf, c3: 0xeafcff, rim: 0x9fe0ff, ocean: 0.85, cloud: 0.6, atmo: 0.16, atmoAlpha: 0.32 }),
    "Low density for its size, which suggests a great deal of water — possibly a deep global ocean."),
  body("trappist-1g", "TRAPPIST-1g", "exoplanet", "TRAPPIST-1", "", earths(1.129), 0.04683, null, null,
    look({ type: "ice", c0: 0x14487f, c1: 0x3f9fc4, c2: 0x9fdcea, c3: 0xeafaff, rim: 0x86d6ee, cloud: 0.2, bands: 8, bandSharp: 0.18, atmo: 0.15, atmoAlpha: 0.3 }),
    "The largest of the seven, and cold enough that any water is probably ice."),
  body("trappist-1h", "TRAPPIST-1h", "exoplanet", "TRAPPIST-1", "", earths(0.755), 0.06189, null, null,
    look({ type: "ice", c0: 0x14487f, c1: 0x3f9fc4, c2: 0x9fdcea, c3: 0xeafaff, rim: 0x86d6ee, cloud: 0.2, bands: 8, bandSharp: 0.18, atmo: 0.15, atmoAlpha: 0.3 }),
    "The outermost, receiving about as much light as Ceres does from the Sun."),
  body("gj-1214-b", "GJ 1214 b", "exoplanet", "GJ 1214", "", earths(2.742), 0.0149, null, null,
    look({ type: "gas", c0: 0x1a3a4a, c1: 0x3a7a8a, c2: 0x7ab6c0, c3: 0xd8f0f4, rim: 0x8fd4e0, bands: 9, bandSharp: 0.2, cloud: 0.85, atmo: 0.24, atmoAlpha: 0.45 }),
    "The archetypal mini-Neptune. Its atmosphere is so hazy that for a decade nobody could see through it."),
  body("gj-436-b", "GJ 436 b", "exoplanet", "GJ 436", "", earths(4.191), 0.0287, null, null,
    look({ type: "gas", c0: 0x1a3a4a, c1: 0x3a7a8a, c2: 0x7ab6c0, c3: 0xd8f0f4, rim: 0x8fd4e0, bands: 9, bandSharp: 0.2, cloud: 0.85, atmo: 0.24, atmoAlpha: 0.45 }),
    "Trails a comet-like cloud of hydrogen fifty times the size of its star."),
  body("k2-18b", "K2-18b", "exoplanet", "K2-18", "", earths(2.61), 0.1591, null, null,
    look({ type: "gas", c0: 0x1a3a4a, c1: 0x3a7a8a, c2: 0x7ab6c0, c3: 0xd8f0f4, rim: 0x8fd4e0, bands: 9, bandSharp: 0.2, cloud: 0.85, atmo: 0.24, atmoAlpha: 0.45 }),
    "Water vapour was detected in its atmosphere in 2019; what lies beneath the cloud deck is still argued over."),
  body("toi-700-d", "TOI-700 d", "exoplanet", "TOI-700", "", earths(1.073), 0.1633, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "The first Earth-sized habitable-zone planet TESS found."),
  body("toi-715-b", "TOI-715 b", "exoplanet", "TOI-715", "", earths(1.55), 0.083, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "A super-Earth in the conservative habitable zone of a red dwarf, found in 2023."),
  body("lhs-475-b", "LHS 475 b", "exoplanet", "LHS 475", "", earths(0.99), 0.0204, null, null,
    look({ type: "rocky", c0: 0x2e2a26, c1: 0x5e564c, c2: 0x8e8377, c3: 0xc9bda9, rim: 0x9a8f80, crater: 0.7, ocean: 0, cloud: 0.05, atmo: 0.05, atmoAlpha: 0.12 }),
    "The first exoplanet JWST confirmed on its own — almost exactly Earth's size."),
  body("toi-849-b", "TOI-849 b", "exoplanet", "TOI-849", "", earths(3.44), 0.01598, null, null,
    look({ type: "rocky", c0: 0x2e2a26, c1: 0x5e564c, c2: 0x8e8377, c3: 0xc9bda9, rim: 0x9a8f80, crater: 0.7, ocean: 0, cloud: 0.05, atmo: 0.05, atmoAlpha: 0.12 }),
    "The exposed core of a gas giant: all the mass, none of the envelope."),
  body("lp-890-9-c", "LP 890-9 c", "exoplanet", "LP 890-9", "", earths(1.367), 0.03984, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "The second-most-promising temperate terrestrial planet for atmospheric study after TRAPPIST-1e."),
  body("gliese-581c", "Gliese 581 c", "exoplanet", "Gliese 581", "", earths(1.5), 0.0721, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "One of the first super-Earths announced as potentially habitable, in 2007. It is probably far too hot."),
  body("gliese-667-cc", "Gliese 667 Cc", "exoplanet", "Gliese 667 C", "", earths(1.5), 0.1251, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "Receives about 90% of the light Earth does, from a red dwarf in a triple system."),
  body("gj-357-d", "GJ 357 d", "exoplanet", "GJ 357", "", earths(1.8), 0.204, null, null,
    look({ type: "ice", c0: 0x14487f, c1: 0x3f9fc4, c2: 0x9fdcea, c3: 0xeafaff, rim: 0x86d6ee, cloud: 0.2, bands: 8, bandSharp: 0.18, atmo: 0.15, atmoAlpha: 0.3 }),
    "A super-Earth at the outer edge of its star's habitable zone, thirty-one light years away."),
  body("teegarden-b", "Teegarden b", "exoplanet", "Teegarden's Star", "", earths(1.02), 0.0252, null, null,
    look({ type: "liquid", c0: 0x0a2a4c, c1: 0x1a6a8c, c2: 0x3f8a5a, c3: 0xeef4ff, rim: 0x8fd0ff, ocean: 0.6, cloud: 0.55, crater: 0.15, atmo: 0.15, atmoAlpha: 0.3 }),
    "One of the highest Earth-similarity scores on record, round one of the quietest small stars known."),
  body("ross-128-b", "Ross 128 b", "exoplanet", "Ross 128", "", earths(1.1), 0.0496, null, null,
    look({ type: "muddy", c0: 0x3a2010, c1: 0x7a4522, c2: 0xb3773f, c3: 0xdfc49c, rim: 0xd09a60, ocean: 0.1, cloud: 0.2, crater: 0.4, vein: 0.4, atmo: 0.08, atmoAlpha: 0.18 }),
    "Temperate, and round an unusually calm red dwarf — which makes it a better bet than Proxima b."),
  body("yz-ceti-b", "YZ Ceti b", "exoplanet", "YZ Ceti", "", earths(0.75), 0.01557, null, null,
    look({ type: "rocky", c0: 0x2e2a26, c1: 0x5e564c, c2: 0x8e8377, c3: 0xc9bda9, rim: 0x9a8f80, crater: 0.7, ocean: 0, cloud: 0.05, atmo: 0.05, atmoAlpha: 0.12 }),
    "Smaller than Earth, and the system where a planet's own magnetic field may first have been detected by radio."),
  body("hd-40307-g", "HD 40307 g", "exoplanet", "HD 40307", "", earths(2.0), 0.6, null, null,
    look({ type: "liquid", c0: 0x06203f, c1: 0x0f5f9c, c2: 0x3fb0cf, c3: 0xeafcff, rim: 0x9fe0ff, ocean: 0.85, cloud: 0.6, atmo: 0.16, atmoAlpha: 0.32 }),
    "Far enough from its star to be outside tidal locking, which is rare for a habitable-zone super-Earth."),
  body("wasp-96b", "WASP-96 b", "exoplanet", "WASP-96", "", jupiters(1.2), 0.0453, null, null,
    look({ type: "gas", c0: 0x3a2a18, c1: 0x8a6a3a, c2: 0xc8a468, c3: 0xf2e2c4, rim: 0xdcae70, bands: 14, bandSharp: 0.34, cloud: 0.35, atmo: 0.18, atmoAlpha: 0.34 }),
    "JWST's first published exoplanet spectrum, with an unmistakable water signature."),
  body("psr-b1620-26-b", "PSR B1620-26 b", "exoplanet", "PSR B1620-26", "", jupiters(1.0), 23.0, null, null,
    look({ type: "gas", c0: 0x3a2a18, c1: 0x8a6a3a, c2: 0xc8a468, c3: 0xf2e2c4, rim: 0xdcae70, bands: 14, bandSharp: 0.34, cloud: 0.35, atmo: 0.18, atmoAlpha: 0.34 }),
    "Methuselah: about 12.7 billion years old, orbiting a pulsar and a white dwarf in a globular cluster."),
  body("hr-8799-e", "HR 8799 e", "exoplanet", "HR 8799", "", jupiters(1.2), 16.4, null, null,
    look({ type: "gas", c0: 0x3a2a18, c1: 0x8a6a3a, c2: 0xc8a468, c3: 0xf2e2c4, rim: 0xdcae70, bands: 14, bandSharp: 0.34, cloud: 0.35, atmo: 0.18, atmoAlpha: 0.34 }),
    "One of four planets in the first multi-planet system ever imaged directly."),
  body("beta-pictoris-b", "Beta Pictoris b", "exoplanet", "Beta Pictoris", "", jupiters(1.46), 10.26, null, null,
    look({ type: "gas", c0: 0x3a2a18, c1: 0x8a6a3a, c2: 0xc8a468, c3: 0xf2e2c4, rim: 0xdcae70, bands: 14, bandSharp: 0.34, cloud: 0.35, atmo: 0.18, atmoAlpha: 0.34 }),
    "Young, still glowing from its own formation, and embedded in the debris disc it formed from."),
  body("hd-106906-b", "HD 106906 b", "exoplanet", "HD 106906", "", jupiters(1.1), 738.0, null, null,
    look({ type: "gas", c0: 0x3a2a18, c1: 0x8a6a3a, c2: 0xc8a468, c3: 0xf2e2c4, rim: 0xdcae70, bands: 14, bandSharp: 0.34, cloud: 0.35, atmo: 0.18, atmoAlpha: 0.34 }),
    "Orbits 738 au out — so far that nobody agrees how it got there."),
  body("2m1207b", "2M1207 b", "exoplanet", "2M1207", "", jupiters(1.5), 46.0, null, null,
    look({ type: "gas", c0: 0x3a2a18, c1: 0x8a6a3a, c2: 0xc8a468, c3: 0xf2e2c4, rim: 0xdcae70, bands: 14, bandSharp: 0.34, cloud: 0.35, atmo: 0.18, atmoAlpha: 0.34 }),
    "The first exoplanet ever imaged, in 2004, going round a brown dwarf."),
];
