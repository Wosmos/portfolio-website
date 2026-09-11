// The star catalogue. Reference data, not content: seeded from src/data/catalog.ts and editable here
// so a figure can be corrected or a star added without a deploy. Nothing public reads it, hence
// `revalidate: false` — a write must not drop the cached pages.

import { schema as t } from "@/db/client";
import { FOLD, build, createCrud, reject, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLASSES = ["M", "K", "G", "F", "A", "B", "WD"] as const;
const cls = (value: unknown, key: string): string => {
  if (typeof value !== "string" || !(CLASSES as readonly string[]).includes(value)) {
    reject(`${key} must be one of ${CLASSES.join(", ")}`);
  }
  return value;
};

const parse: Parse<typeof t.starPresets> = (input, base) =>
  build(input, (f) => ({
    slug: f.slug("slug", base?.slug),
    name: f.text("name", base?.name, 120),
    kind: f.optText("kind", base?.kind ?? "", 60),
    cls: f.of("cls", base?.cls ?? "G", cls),
    constellation: f.optText("constellation", base?.constellation ?? "", 60),
    note: f.optText("note", base?.note ?? "", 400),
    // Stephenson 2-18 is ~2,150 solar radii and Sirius B is 0.0084, so the window is wide on purpose
    radiusSolar: f.num("radiusSolar", base?.radiusSolar, { min: 0.001, max: 5000 }),
    tempK: f.num("tempK", base?.tempK ?? 5772, { min: 500, max: 200_000 }),
    luminositySolar: f.num("luminositySolar", base?.luminositySolar ?? 1, { min: 0, max: 10_000_000 }),
    massSolar: f.num("massSolar", base?.massSolar ?? 1, { min: 0.01, max: 400 }),
    distanceLy: f.num("distanceLy", base?.distanceLy ?? 0, { min: 0, max: 1_000_000 }),
    colorCore: f.colour("colorCore", base?.colorCore ?? 0xfff3c4),
    colorMid: f.colour("colorMid", base?.colorMid ?? 0xffb547),
    colorEdge: f.colour("colorEdge", base?.colorEdge ?? 0xff7a1a),
    // the same windows /api/admin/scene enforces, so a preset can never write a value it would refuse
    intensity: f.num("intensity", base?.intensity ?? 1, { min: 0, max: 20 }),
    granulation: f.num("granulation", base?.granulation ?? 1, { min: 0, max: 3 }),
    limb: f.num("limb", base?.limb ?? 1, { min: 0, max: 3 }),
    spots: f.num("spots", base?.spots ?? 0, { min: 0, max: 3 }),
    spin: f.num("spin", base?.spin ?? 1, { min: 0, max: 3 }),
    corona: f.num("corona", base?.corona ?? 1, { min: 0, max: 3 }),
    flare: f.num("flare", base?.flare ?? 1, { min: 0, max: 3 }),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "star",
  table: t.starPresets,
  id: t.starPresets.id,
  order: t.starPresets.sortOrder,
  sort: t.starPresets.sortOrder,
  revalidate: false,
  keys: [
    { parts: [{ column: t.starPresets.slug, value: (row) => row.slug, compare: FOLD }],
      message: (e) => `${e.name} already uses the id ${e.slug}` },
    { parts: [{ column: t.starPresets.name, value: (row) => row.name, compare: FOLD }],
      message: (e) => `${e.name} is already in the catalogue` },
  ],
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
