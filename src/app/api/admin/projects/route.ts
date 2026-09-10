// Projects. The slug is a URL segment and must stay unique; `planet` and `orbit` are what the scene
// reads, so they are checked field by field rather than trusted as JSON.
//
// A write also reads the sun's radius, because nothing may orbit a star while being larger than it:
// the cap is `maxPlanetSize(sunRadius)`, a slightly-over size is clamped to it, and anything wildly
// over is rejected so a typo is reported rather than silently rewritten.

import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import type { LangShareJson, MoonConfigJson, PlanetConfigJson } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { near, FOLD, build, createCrud, isRecord, reject, type Parse } from "@/lib/admin-crud";
import { DEFAULT_SCENE } from "@/lib/content";
import { MAX_MOONS } from "@/lib/github";
import { clampPlanetSize, maxPlanetSize } from "@/lib/scale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANET_TYPES = ["gas", "rocky", "lava", "ice", "liquid", "muddy"] as const;
type PlanetType = (typeof PLANET_TYPES)[number];
const isPlanetType = (v: unknown): v is PlanetType => PLANET_TYPES.some((k) => k === v);

const positive = (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) reject(`${key} must be greater than 0`);
  return value;
};
/** Colours are stored the way the shaders want them: one 0xRRGGBB integer. */
const colour = (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 0xffffff) {
    reject(`${key} must be a whole colour between 0 and 16777215`);
  }
  return value;
};
const finite = (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) reject(`${key} must be a number`);
  return value;
};

const ranged = (min: number, max: number) => (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) reject(`${key} must be a number`);
  if (value < min || value > max) reject(`${key} must be between ${min} and ${max}`);
  return value;
};

/**
 * The optional shader knobs, with the range each one is useful over. Leaving one out is meaningful —
 * the scene then falls back to the look it had before the field existed — so a null clears it rather
 * than writing a zero.
 */
type Knob = "ocean" | "cloud" | "crater" | "vein" | "seed" | "spin" | "tilt" | "atmo" | "atmoAlpha" | "glow" | "bands" | "bandSharp";
const KNOBS: readonly (readonly [Knob, (value: unknown, key: string) => number])[] = [
  ["ocean", ranged(0, 1)],
  ["cloud", ranged(0, 1)],
  ["crater", ranged(0, 1)],
  ["vein", ranged(0, 1)],
  ["seed", ranged(0, 10_000)],
  // both are signed and unbounded in the real solar system: Venus and Uranus turn backwards, and
  // Venus's axis is tipped 177°, so /scene/arrange writes values a 0–20 / ±90 window would reject
  ["spin", ranged(-20, 20)],
  ["tilt", ranged(-360, 360)],
  ["atmo", ranged(0, 1)],
  ["atmoAlpha", ranged(0, 1)],
  ["glow", ranged(0, 3)],
  ["bands", ranged(1, 60)],
  ["bandSharp", ranged(0, 1)],
];

/** How far over the cap a caller may be before the size is treated as a mistake instead of a nudge. */
const SIZE_SLACK = 1.2;

const readPlanet = (sunRadius: number) => (value: unknown): PlanetConfigJson => {
  if (!isRecord(value)) reject("planet must be an object");
  if (!isPlanetType(value.type)) reject(`planet.type must be one of ${PLANET_TYPES.join(", ")}`);
  const cap = maxPlanetSize(sunRadius);
  const asked = positive(value.size, "planet.size");
  if (asked > cap * SIZE_SLACK) {
    reject(`planet.size must be at most ${cap.toFixed(2)} — a planet cannot be larger than the sun (radius ${sunRadius})`);
  }
  const planet: PlanetConfigJson = {
    type: value.type,
    size: clampPlanetSize(asked, sunRadius),
    c0: colour(value.c0, "planet.c0"),
    c1: colour(value.c1, "planet.c1"),
    c2: colour(value.c2, "planet.c2"),
    c3: colour(value.c3, "planet.c3"),
    rim: colour(value.rim, "planet.rim"),
  };
  for (const [key, read] of KNOBS) {
    const knob = value[key];
    if (knob !== undefined && knob !== null) planet[key] = read(knob, `planet.${key}`);
  }
  const ring = value.ring;
  if (ring !== undefined && ring !== null) {
    if (!isRecord(ring)) reject("planet.ring must be an object or null");
    planet.ring = {
      ca: colour(ring.ca, "planet.ring.ca"),
      cb: colour(ring.cb, "planet.ring.cb"),
      inner: positive(ring.inner, "planet.ring.inner"),
      outer: positive(ring.outer, "planet.ring.outer"),
      tilt: finite(ring.tilt, "planet.ring.tilt"),
    };
  }
  return planet;
};

function readLangs(value: unknown): LangShareJson[] {
  if (!Array.isArray(value)) reject("langs must be a list of [name, percent] pairs");
  if (value.length > 24) reject("langs accepts at most 24 entries");
  return value.map((raw: unknown, i): LangShareJson => {
    if (!Array.isArray(raw) || raw.length !== 2) reject(`langs[${i}] must be [name, percent]`);
    const name: unknown = raw[0];
    const percent: unknown = raw[1];
    if (typeof name !== "string" || name.trim() === "") reject(`langs[${i}][0] must be a language name`);
    if (typeof percent !== "number" || !Number.isFinite(percent)) reject(`langs[${i}][1] must be a percentage`);
    return [name.trim().slice(0, 60), percent];
  });
}

const MOON_TYPES = ["gas", "rocky", "ice", "muddy", "liquid", "lava"] as const;
type MoonType = (typeof MOON_TYPES)[number];
const isMoonType = (v: unknown): v is MoonType => MOON_TYPES.some((k) => k === v);

/** A moon's own flags. Absent means the default, not an error — the editor sends partial moons. */
const flag = (fallback: boolean) => (value: unknown, key: string): boolean => {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") reject(`${key} must be true or false`);
  return value;
};
const label = (max: number, required: boolean) => (value: unknown, key: string): string => {
  if (value === undefined || value === null) {
    if (required) reject(`${key} is required`);
    return "";
  }
  if (typeof value !== "string") reject(`${key} must be text`);
  const trimmed = value.trim();
  if (required && trimmed === "") reject(`${key} cannot be empty`);
  if (trimmed.length > max) reject(`${key} is longer than ${max} characters`);
  return trimmed;
};

/**
 * Moons, one per meaningful top-level folder. `auto` defaults to false because a moon arriving through
 * this endpoint is a hand edit unless it says otherwise — src/app/api/admin/projects/moons writes the
 * detected ones itself, and only auto moons are ever replaced by a re-detection.
 */
function readMoons(value: unknown): MoonConfigJson[] {
  if (!Array.isArray(value)) reject("moons must be a list");
  if (value.length > MAX_MOONS) reject(`moons accepts at most ${MAX_MOONS} entries`);
  return value.map((raw: unknown, i): MoonConfigJson => {
    if (!isRecord(raw)) reject(`moons[${i}] must be an object`);
    const k = `moons[${i}]`;
    if (!isMoonType(raw.type)) reject(`${k}.type must be one of ${MOON_TYPES.join(", ")}`);
    return {
      name: label(40, true)(raw.name, `${k}.name`),
      path: label(200, false)(raw.path, `${k}.path`),
      size: ranged(0.02, 0.5)(raw.size, `${k}.size`),
      orbit: ranged(1.2, 8)(raw.orbit, `${k}.orbit`),
      speed: ranged(0, 20)(raw.speed, `${k}.speed`),
      tilt: ranged(-90, 90)(raw.tilt, `${k}.tilt`),
      phase: ranged(0, 360)(raw.phase, `${k}.phase`),
      colour: colour(raw.colour, `${k}.colour`),
      type: raw.type,
      auto: flag(false)(raw.auto, `${k}.auto`),
      visible: flag(true)(raw.visible, `${k}.visible`),
    };
  });
}

function readLinks(value: unknown): [label: string, url: string][] {
  if (!Array.isArray(value)) reject("extraLinks must be a list of [label, url] pairs");
  if (value.length > 12) reject("extraLinks accepts at most 12 entries");
  return value.map((raw: unknown, i): [string, string] => {
    if (!Array.isArray(raw) || raw.length !== 2) reject(`extraLinks[${i}] must be [label, url]`);
    const label: unknown = raw[0];
    const url: unknown = raw[1];
    if (typeof label !== "string" || label.trim() === "") reject(`extraLinks[${i}][0] must be a label`);
    if (typeof url !== "string" || url.trim() === "") reject(`extraLinks[${i}][1] must be a url`);
    return [label.trim().slice(0, 80), url.trim().slice(0, 400)];
  });
}

function readImages(value: unknown): { url: string; caption?: string }[] {
  if (!Array.isArray(value)) reject("images must be a list");
  if (value.length > 24) reject("images accepts at most 24 entries");
  return value.map((raw: unknown, i): { url: string; caption?: string } => {
    if (!isRecord(raw)) reject(`images[${i}] must be an object`);
    const url = raw.url;
    const caption = raw.caption;
    if (typeof url !== "string" || url.trim() === "") reject(`images[${i}].url is required`);
    const shot: { url: string; caption?: string } = { url: url.trim().slice(0, 500) };
    if (typeof caption === "string" && caption.trim() !== "") shot.caption = caption.trim().slice(0, 240);
    return shot;
  });
}

const parse = (sunRadius: number): Parse<typeof t.projects> => (input, base) =>
  build(input, (f) => ({
    slug: f.slug("slug", base?.slug),
    title: f.text("title", base?.title, 160),
    tagline: f.text("tagline", base?.tagline, 240),
    description: f.text("description", base?.description, 6000),
    heading: f.optText("heading", base?.heading ?? "", 240),
    bullets: f.list("bullets", base?.bullets ?? [], { count: 24, length: 600 }),
    tech: f.list("tech", base?.tech ?? [], { count: 40, length: 60 }),
    stack: f.list("stack", base?.stack ?? [], { count: 40, length: 60 }),
    extraLinks: f.of("extraLinks", base?.extraLinks ?? [], readLinks),
    category: f.text("category", base?.category, 60),
    context: f.text("context", base?.context, 60),
    status: f.optText("status", base?.status ?? "", 60),
    // a project cannot have shipped after next year; a typo like 2062 is what this catches
    year: f.nullInt("year", base?.year ?? null, { min: 1970, max: new Date().getFullYear() + 1 }),
    weight: f.num("weight", base?.weight ?? 0.5, { min: 0, max: 1 }),
    github: f.of("github", base?.github ?? "", (v, k) => {
      if (typeof v !== "string") reject(`${k} must be text`);
      const url = v.trim();
      if (url === "") return "";
      if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(url)) reject(`${k} must be a https://github.com/owner/repo url`);
      return url.replace(/\/$/, "");
    }),
    live: f.of("live", base?.live ?? "", (v, k) => {
      if (typeof v !== "string") reject(`${k} must be text`);
      const url = v.trim();
      if (url === "") return "";
      if (!/^https?:\/\/\S+$/.test(url) || url.length > 400) reject(`${k} must be an http or https url`);
      return url;
    }),
    langs: f.of("langs", base?.langs ?? [], readLangs),
    planet: f.of("planet", base?.planet, readPlanet(sunRadius)),
    orbit: f.of("orbit", base?.orbit, positive),
    moons: f.of("moons", base?.moons ?? [], readMoons),
    moonsAuto: f.bool("moonsAuto", base?.moonsAuto ?? true),
    sourcePrivate: f.bool("sourcePrivate", base?.sourcePrivate ?? false),
    useLiveLangs: f.bool("useLiveLangs", base?.useLiveLangs ?? true),
    useLiveMeta: f.bool("useLiveMeta", base?.useLiveMeta ?? true),
    useLiveReadme: f.bool("useLiveReadme", base?.useLiveReadme ?? true),
    coverImage: f.optText("coverImage", base?.coverImage ?? "", 500),
    images: f.of("images", base?.images ?? [], readImages),
    featured: f.bool("featured", base?.featured ?? false),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
    updatedAt: new Date(),
  }));

const crud = (sunRadius: number) =>
  createCrud({
    name: "project",
    table: t.projects,
    id: t.projects.id,
    order: t.projects.sortOrder,
    sort: t.projects.sortOrder,
    keys: [
      {
        parts: [{ column: t.projects.slug, value: (row) => row.slug, compare: FOLD }],
        message: (existing) => `the slug ${existing.slug} is already taken by ${existing.title}`,
      },
      {
        parts: [{ column: t.projects.github, value: (row) => row.github, compare: FOLD }],
        message: (existing) => `${existing.title} already points at that repository`,
      },
      {
        parts: [{ column: t.projects.title, value: (row) => row.title, compare: FOLD }],
        message: (existing) => `${existing.slug} is already called that`,
      },
      {
        // two planets on one orbit is a scene bug, not a content decision — but only among the
        // projects the scene actually draws, so a hidden one may sit anywhere
        parts: [{ column: t.projects.orbit, value: (row) => row.orbit, compare: near(0.5) }],
        when: (row) => row.visible !== false,
        among: eq(t.projects.visible, true),
        message: (existing) => `${existing.title} already orbits at ${existing.orbit} — move one of them`,
      },
    ],
    parse: parse(sunRadius),
  });

/** The size cap is relative to the star, so a write costs one extra read of the single scene row. */
async function sunRadius(): Promise<number> {
  const db = getDb();
  if (!db) return DEFAULT_SCENE.sunRadius;
  try {
    const [row] = await db.select({ r: t.sceneConfig.sunRadius }).from(t.sceneConfig).limit(1);
    return row?.r ?? DEFAULT_SCENE.sunRadius;
  } catch {
    // the write itself will fail with a proper message; don't turn a dead database into a 500 here
    return DEFAULT_SCENE.sunRadius;
  }
}
/** Reading and deleting never touch `planet`, so they need no radius. */
const plain = crud(DEFAULT_SCENE.sunRadius);
/** Guarded here as well, so an anonymous POST cannot spend a query on the scene row. */
const writing = async (run: (h: ReturnType<typeof crud>) => Promise<Response>): Promise<Response> => {
  const denied = await requireAdmin();
  if (denied) return denied;
  return run(crud(await sunRadius()));
};

export const GET = plain.GET;
export const POST = (request: Request): Promise<Response> => writing((h) => h.POST(request));
export const PUT = (request: Request): Promise<Response> => writing((h) => h.PUT(request));
export const DELETE = plain.DELETE;
