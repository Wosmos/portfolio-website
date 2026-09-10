// Shared contracts between the WebGL scene (scene.ts), the small planet views (planet-view.ts) and the
// flight-deck controller (deck.ts). Kept free of three.js types so UI code never imports three.

import type { PlanetConfig, PlanetType, Project } from "@/data/portfolio";
import type { RepoStar } from "@/lib/github";
import type { ScaleMode } from "@/lib/scale";

/**
 * The planet parameters the admin gained after `PlanetConfig` was written. Every one is optional and a
 * missing one reproduces exactly the look the scene had before the field existed — see
 * `planetDefaults` in scene.ts, which is where those fallbacks live because the shader is what reads
 * them. Stored on the row as jsonb, so a `PlanetConfig` from the database carries them at runtime even
 * though its own type predates them.
 */
export interface PlanetExtras {
  /** Surface noise seed — changes the terrain without touching anything else. */
  seed?: number;
  /** Rotation, in turns per minute. */
  spin?: number;
  /** Axial tilt, in degrees. */
  tilt?: number;
  /** Atmosphere shell thickness as a fraction of the radius, and its opacity. */
  atmo?: number; atmoAlpha?: number;
  /** Multiplies the emissive channel, and lifts the night side once it goes above 1. */
  glow?: number;
  /** Band count (gas and ice), and how hard the band edges are. */
  bands?: number; bandSharp?: number;
}
/** A moon's surface family. The gas branch of the planet shader has no small-body equivalent. */
/** Moons carry the same six surfaces as planets — a captured gas body is a real thing. */
export type MoonType = PlanetType;

/**
 * One moon — a repository's nested child folder (zcrypt's backend, frontend, mobile, core). Mirrors
 * `MoonConfigJson` on the row; the scene is the only reader, so the units are the scene's: `size` and
 * `orbit` are multiples of the planet's radius, `speed` is turns per minute, angles are degrees.
 */
export interface MoonConfig {
  name: string; path: string; size: number; orbit: number; speed: number;
  tilt: number; phase: number; colour: number; type: MoonType; auto: boolean; visible: boolean;
}
/**
 * Moons arrived as their own column, after both `PlanetConfig` and `Project` were written, and the
 * admin may hang them off either shape. Optional on both, so a record from before the column still
 * satisfies these types and draws a planet with no moons at all.
 */
export interface WithMoons { moons?: readonly MoonConfig[] }
export type PlanetFull = PlanetConfig & PlanetExtras & WithMoons;
export type ProjectFull = Omit<Project, "planet"> & WithMoons & { planet: PlanetFull };

/** How many moons a body will draw. Shadow slots and labels both cost per moon, so the row is trimmed. */
export const MOON_MAX = 6;
/**
 * The moons a row asks to draw: the visible ones, in the order given, capped. Lives here rather than
 * in scene.ts because the server pages render the legend from the same list and must not pull three.js
 * into their bundle to agree with the shader about which moons exist.
 */
export function visibleMoons(moons: readonly MoonConfig[] | undefined): readonly MoonConfig[] {
  if (!moons || moons.length === 0) return [];
  const on = moons.filter((m) => m.visible);
  return on.length > MOON_MAX ? on.slice(0, MOON_MAX) : on;
}
/**
 * Where a moon points. A moon is a folder in the repository, so clicking one on the reading site opens
 * that folder; `HEAD` rather than a branch name because the default branch is not stored anywhere. A
 * moon added by hand has no folder, and falls back to the repository itself.
 */
export function moonUrl(github: string, m: MoonConfig): string {
  const base = github.replace(/\/+$/, "");
  return m.path ? `${base}/tree/HEAD/${m.path.replace(/^\/+/, "")}` : base;
}

export interface Vec3 { x: number; y: number; z: number }
export interface HeadingBody { id: string; x: number; y: number; z: number; r: number; size: number }
/** One moon of the focused planet, ready for the deck to list: name, screen position, screen radius. */
export interface HeadingMoon {
  id: string; name: string; path: string;
  /** Screen pixels, and the projected depth — above 1 the moon is behind the camera. */
  x: number; y: number; z: number;
  /** On-screen radius in pixels, and the world distance to the camera. */
  px: number; dist: number;
  /** True while the moon is on the near side of its planet. */
  front: boolean;
  /** The pointer is over this moon, and the pointer has clicked it — the deck's two lit states. */
  hot: boolean; focused: boolean;
}
export interface Heading {
  theta: number; phi: number; roll: number; pos: Vec3; flying: boolean; flightT: number; flightDur: number;
  speed: number; hot: number; sunHot: boolean; bodies: readonly HeadingBody[];
  /** Astronomical units per scene unit, so a distance readout stays honest at any span. */
  auPerUnit: number;
  /** The focused planet's moons. Empty whenever nothing is focused, or the planet has none. */
  moons: readonly HeadingMoon[];
}
export interface LayerAnchor { name: string; pct: number; color: number; x: number; y: number; z: number; amount: number }
export interface Layer { name: string; pct: number; r0: number; r1: number; color: number }
export type FlightEventName = "launch" | "launchBack" | "belt" | "arrive" | "home";
export interface FlightEventInfo { dur: number; dist: number }
export interface Pick { sun?: boolean; index?: number }

/** The values the admin can edit; every field is optional and falls back to the built-in default. */
export interface SceneSettings {
  sunRadius?: number; sunColorCore?: number; sunColorEdge?: number; sunIntensity?: number;
  orbitScale?: number; beltRadius?: number; beltDensity?: number; starCount?: number;
  nebulaA?: number; nebulaB?: number; bloom?: number; fov?: number;
  /** Distance from the sun per project, in the order `projects` is given. */
  orbits?: readonly number[];
  /**
   * How the system is laid out. `stylised` uses the stored sizes and orbits — the look that shipped.
   * `relative` and `real` take sizes, orbits, tilts, spins and the belt from src/lib/scale.ts instead,
   * which is why the per-project values stop having an effect in those two modes.
   */
  scaleMode?: ScaleMode;
  /** What the outermost orbit represents, in astronomical units: 30 is Neptune, 63241 a light year. */
  spanAu?: number;
  /** Sun: the middle stop of the core→mid→edge ramp. */
  sunColorMid?: number;
  /** Sun: granulation cell contrast, limb darkening, sunspot coverage, rotation rate. */
  sunGranulation?: number; sunLimb?: number; sunSpots?: number; sunSpin?: number;
  /** Sun: corona brightness and how far prominences reach. */
  sunCorona?: number; sunFlare?: number;
  /** Belt: radial width and vertical spread in scene units, rock scale, tint, and tilt in degrees. */
  beltWidth?: number; beltThickness?: number; beltRockSize?: number; beltColor?: number; beltTilt?: number;
  /** Draw the other repositories as background constellations, and how bright commit counts make them. */
  constellations?: boolean; constellationGain?: number;
}
export interface SystemOptions {
  canvas: HTMLCanvasElement; labelsEl: HTMLElement; projects: readonly ProjectFull[]; scene?: SceneSettings;
  onSelect?: (p: Project) => void; onSunSelect?: () => void;
  onFlightEvent?: (name: FlightEventName, info: FlightEventInfo) => void; onBeltLevel?: (k: number) => void;
  reducedMotion?: boolean;
  /** The repositories that are not projects, drawn as the constellation layer. */
  repoStars?: readonly RepoStar[];
}
/** The flight-deck scene. Same surface the prototype's ship.js used. */
export interface SystemApi {
  setPaused(v: boolean): void; setActive(v: boolean): void; setScroll(v: number): void; setThrottle(v: number): void;
  setHyper(v: boolean): void; setHeading(theta: number): void; nudge(dTheta: number): void; level(): void;
  setTilt(dx: number, dy: number): void; flare(): void; pick(): Pick | null; heading(): Heading;
  project(v: Vec3): Vec3; flyTo(id: string, done?: () => void): void; flyToSun(done?: () => void): void;
  unfocus(done?: () => void): void; next(): void; prev(): void; focusedId(): string | null; isFlying(): boolean;
  cutaway(id: string, on: boolean): void; cutawayOpen(id: string): boolean; layersOf(id: string): readonly Layer[];
  layerAnchors(id: string): readonly LayerAnchor[]; highlightLayer(id: string | null | undefined, k: number): void;
  dispose(): void;
}
export interface PlanetViewOptions {
  canvas: HTMLCanvasElement; project: ProjectFull; index?: number; interactive?: boolean; cutaway?: boolean; fit?: number;
  onCut?: (on: boolean) => void; onHover?: (on: boolean) => void;
  /** The pointer moved onto a moon, or off every moon (`null`, index −1). */
  onMoonHover?: (m: MoonConfig | null, k: number) => void;
  /** A tap or click landed on a moon. Nothing happens without a handler, so the admin preview is inert. */
  onMoonPick?: (m: MoonConfig, k: number) => void;
}
export interface PlanetViewApi {
  readonly cutOpen: boolean; readonly layers: readonly Layer[];
  /** The moons this body actually drew, in the order the legend must list them. */
  readonly moons: readonly MoonConfig[];
  setCut(on: boolean): void; toggleCut(): void; setHot(v: boolean): void; highlightLayer(k: number): void;
  /** Light one moon from outside the canvas — the legend row's half of the two-way link. −1 clears. */
  highlightMoon(k: number): void;
  dispose(): void;
}
/**
 * What `mountPlanets` takes. One handler serves every canvas on the page, so the per-moon callbacks
 * say which project fired where the single-view ones do not have to.
 */
export type MountOptions = Omit<PlanetViewOptions, "canvas" | "project" | "index" | "onMoonHover" | "onMoonPick"> & {
  onMoonHover?: (p: ProjectFull, m: MoonConfig | null, k: number) => void;
  onMoonPick?: (p: ProjectFull, m: MoonConfig, k: number) => void;
};
export interface PlanetStripOptions {
  canvas: HTMLCanvasElement; projects: readonly ProjectFull[];
  onPick?: (p: Project, i: number) => void; onHover?: (p: Project | null, i: number) => void;
}
export interface PlanetStripApi { setHot(i: number): void; readonly count: number; dispose(): void }
