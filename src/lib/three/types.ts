// Shared contracts between the WebGL scene (scene.ts), the small planet views (planet-view.ts) and the
// flight-deck controller (deck.ts). Kept free of three.js types so UI code never imports three.

import type { Project } from "@/data/portfolio";

export interface Vec3 { x: number; y: number; z: number }
export interface HeadingBody { id: string; x: number; y: number; z: number; r: number; size: number }
export interface Heading {
  theta: number; phi: number; roll: number; pos: Vec3; flying: boolean; flightT: number; flightDur: number;
  speed: number; hot: number; sunHot: boolean; bodies: readonly HeadingBody[];
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
}
export interface SystemOptions {
  canvas: HTMLCanvasElement; labelsEl: HTMLElement; projects: readonly Project[]; scene?: SceneSettings;
  onSelect?: (p: Project) => void; onSunSelect?: () => void;
  onFlightEvent?: (name: FlightEventName, info: FlightEventInfo) => void; onBeltLevel?: (k: number) => void;
  reducedMotion?: boolean;
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
