// Shared contracts between the WebGL scene (scene.ts), the small planet views (planet-view.ts) and the
// flight-deck controller (deck.ts). Kept free of three.js types so UI code never imports three.

import type { PlanetConfig, Project } from "@/data/portfolio";
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
export type PlanetFull = PlanetConfig & PlanetExtras;

export interface Vec3 { x: number; y: number; z: number }
export interface HeadingBody { id: string; x: number; y: number; z: number; r: number; size: number }
export interface Heading {
  theta: number; phi: number; roll: number; pos: Vec3; flying: boolean; flightT: number; flightDur: number;
  speed: number; hot: number; sunHot: boolean; bodies: readonly HeadingBody[];
  /** Astronomical units per scene unit, so a distance readout stays honest at any span. */
  auPerUnit: number;
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
  canvas: HTMLCanvasElement; labelsEl: HTMLElement; projects: readonly Project[]; scene?: SceneSettings;
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
  canvas: HTMLCanvasElement; project: Project; index?: number; interactive?: boolean; cutaway?: boolean; fit?: number;
  onCut?: (on: boolean) => void; onHover?: (on: boolean) => void;
}
export interface PlanetViewApi {
  readonly cutOpen: boolean; readonly layers: readonly Layer[];
  setCut(on: boolean): void; toggleCut(): void; setHot(v: boolean): void; highlightLayer(k: number): void; dispose(): void;
}
export interface PlanetStripOptions {
  canvas: HTMLCanvasElement; projects: readonly Project[];
  onPick?: (p: Project, i: number) => void; onHover?: (p: Project | null, i: number) => void;
}
export interface PlanetStripApi { setHot(i: number): void; readonly count: number; dispose(): void }
