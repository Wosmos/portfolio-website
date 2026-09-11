// The world catalogue: planets, dwarf planets, moons and exoplanets. Reference data like the stars —
// seeded from src/data/catalog.ts, editable here, and read by nothing public, so a write leaves the
// content cache alone.
//
// The appearance JSON is validated against the same windows /api/admin/projects enforces, because
// that is where it ends up: a preset that would be refused on save is not a preset.

import { schema as t } from "@/db/client";
import type { PlanetConfigJson, RingConfigJson } from "@/db/schema";
import { FOLD, build, createCrud, isRecord, reject, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["planet", "dwarf", "moon", "exoplanet"] as const;
const TYPES = ["gas", "rocky", "lava", "ice", "liquid", "muddy"] as const;
type Knob = "ocean" | "cloud" | "crater" | "vein" | "seed" | "spin" | "tilt" | "atmo" | "atmoAlpha" | "glow" | "bands" | "bandSharp";
const KNOBS: readonly (readonly [Knob, number, number])[] = [
  ["ocean", 0, 1], ["cloud", 0, 1], ["crater", 0, 1], ["vein", 0, 1], ["seed", 0, 10_000],
  ["spin", -20, 20], ["tilt", -360, 360], ["atmo", 0, 1], ["atmoAlpha", 0, 1],
  ["glow", 0, 3], ["bands", 1, 60], ["bandSharp", 0, 1],
];

const kind = (value: unknown, key: string): string => {
  if (typeof value !== "string" || !(KINDS as readonly string[]).includes(value)) reject(`${key} must be one of ${KINDS.join(", ")}`);
  return value;
};
const colour = (v: unknown, key: string): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 0xffffff) reject(`${key} must be a colour between 0 and 16777215`);
  return v;
};
const ranged = (v: unknown, key: string, min: number, max: number): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) reject(`${key} must be between ${min} and ${max}`);
  return v;
};
/** Null where a quantity has not been measured — which is every exoplanet tilt in the catalogue. */
const nullable = (v: unknown, key: string, min: number, max: number): number | null =>
  v === null || v === undefined || v === "" ? null : ranged(v, key, min, max);

function look(value: unknown, key: string): PlanetConfigJson {
  if (!isRecord(value)) reject(`${key} must be an object`);
  const type = value.type;
  if (typeof type !== "string" || !(TYPES as readonly string[]).includes(type)) reject(`${key}.type must be one of ${TYPES.join(", ")}`);
  const out: PlanetConfigJson = {
    type: type as PlanetConfigJson["type"],
    size: typeof value.size === "number" && value.size > 0 ? value.size : 1,
    c0: colour(value.c0, `${key}.c0`), c1: colour(value.c1, `${key}.c1`),
    c2: colour(value.c2, `${key}.c2`), c3: colour(value.c3, `${key}.c3`),
    rim: colour(value.rim, `${key}.rim`),
  };
  for (const [k, min, max] of KNOBS) {
    const v = value[k];
    if (v !== undefined && v !== null) out[k] = ranged(v, `${key}.${k}`, min, max);
  }
  const ring = value.ring;
  if (isRecord(ring)) {
    const inner = ranged(ring.inner, `${key}.ring.inner`, 0.01, 20);
    const outer = ranged(ring.outer, `${key}.ring.outer`, 0.02, 40);
    if (outer <= inner) reject(`${key}.ring.outer must be larger than ${key}.ring.inner`);
    const r: RingConfigJson = { ca: colour(ring.ca, `${key}.ring.ca`), cb: colour(ring.cb, `${key}.ring.cb`), inner, outer, tilt: ranged(ring.tilt ?? 0, `${key}.ring.tilt`, -3.2, 3.2) };
    out.ring = r;
  } else out.ring = null;
  return out;
}

const parse: Parse<typeof t.bodyPresets> = (input, base) =>
  build(input, (f) => ({
    slug: f.slug("slug", base?.slug),
    name: f.text("name", base?.name, 120),
    kind: f.of("kind", base?.kind ?? "planet", kind),
    system: f.optText("system", base?.system ?? "", 80),
    parent: f.optText("parent", base?.parent ?? "", 80),
    note: f.optText("note", base?.note ?? "", 400),
    // Phobos is 11 km; a directly imaged giant is over 100,000
    radiusKm: f.num("radiusKm", base?.radiusKm, { min: 0.5, max: 500_000 }),
    // HD 106906 b sits 738 au out, so the window has to reach past the Kuiper belt
    semiMajorAu: f.num("semiMajorAu", base?.semiMajorAu, { min: 0.0001, max: 100_000 }),
    tiltDeg: f.of("tiltDeg", base?.tiltDeg ?? null, (v, k) => nullable(v, k, -360, 360)),
    dayHours: f.of("dayHours", base?.dayHours ?? null, (v, k) => nullable(v, k, -100_000, 100_000)),
    ringed: f.bool("ringed", base?.ringed ?? false),
    planet: f.of("planet", base?.planet, look),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "world",
  table: t.bodyPresets,
  id: t.bodyPresets.id,
  order: t.bodyPresets.sortOrder,
  sort: t.bodyPresets.sortOrder,
  revalidate: false,
  keys: [
    { parts: [{ column: t.bodyPresets.slug, value: (row) => row.slug, compare: FOLD }],
      message: (e) => `${e.name} already uses the id ${e.slug}` },
    { parts: [{ column: t.bodyPresets.name, value: (row) => row.name, compare: FOLD }],
      message: (e) => `${e.name} is already in the catalogue` },
  ],
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
