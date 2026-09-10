// Projects. The slug is a URL segment and must stay unique; `planet` and `orbit` are what the scene
// reads, so they are checked field by field rather than trusted as JSON.

import { schema as t } from "@/db/client";
import type { LangShareJson, PlanetConfigJson } from "@/db/schema";
import { build, createCrud, isRecord, reject, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANET_TYPES = ["gas", "rocky", "lava", "ice"] as const;
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

const TINTS = ["ocean", "cloud", "crater", "vein"] as const;

function readPlanet(value: unknown): PlanetConfigJson {
  if (!isRecord(value)) reject("planet must be an object");
  if (!isPlanetType(value.type)) reject("planet.type must be one of gas, rocky, lava, ice");
  const planet: PlanetConfigJson = {
    type: value.type,
    size: positive(value.size, "planet.size"),
    c0: colour(value.c0, "planet.c0"),
    c1: colour(value.c1, "planet.c1"),
    c2: colour(value.c2, "planet.c2"),
    c3: colour(value.c3, "planet.c3"),
    rim: colour(value.rim, "planet.rim"),
  };
  for (const key of TINTS) {
    const tint = value[key];
    if (tint !== undefined && tint !== null) planet[key] = colour(tint, `planet.${key}`);
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
}

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

const parse: Parse<typeof t.projects> = (input, base) =>
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
    year: f.nullInt("year", base?.year ?? null, { min: 1970, max: 2200 }),
    weight: f.num("weight", base?.weight ?? 0.5, { min: 0, max: 1 }),
    github: f.optText("github", base?.github ?? "", 400),
    live: f.optText("live", base?.live ?? "", 400),
    langs: f.of("langs", base?.langs ?? [], readLangs),
    planet: f.of("planet", base?.planet, readPlanet),
    orbit: f.of("orbit", base?.orbit, positive),
    coverImage: f.optText("coverImage", base?.coverImage ?? "", 500),
    images: f.of("images", base?.images ?? [], readImages),
    featured: f.bool("featured", base?.featured ?? false),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
    updatedAt: new Date(),
  }));

const handlers = createCrud({
  name: "project",
  table: t.projects,
  id: t.projects.id,
  order: t.projects.sortOrder,
  sort: t.projects.sortOrder,
  unique: { column: t.projects.slug, label: "slug", value: (row) => row.slug },
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
