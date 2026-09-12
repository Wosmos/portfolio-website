// The one scene_config row: the sun, orbit spacing, the belt, the star field and the camera.

import { schema as t } from "@/db/client";
import { build, createSingleton, reject, type Parse } from "@/lib/admin-crud";
import { isScaleMode, LIGHT_YEAR_AU } from "@/lib/scale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const positive = (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) reject(`${key} must be greater than 0`);
  return value;
};
/** stylised · relative · real — the arrangement the scene lays itself out with. */
const mode = (value: unknown, key: string): string => {
  if (typeof value !== "string" || !isScaleMode(value)) reject(`${key} must be stylised, relative or real`);
  return value;
};

const parse: Parse<typeof t.sceneConfig> = (input, base) =>
  build(input, (f) => {
    const sunRadius = f.of("sunRadius", base?.sunRadius ?? 6, positive);
    return {
    sunRadius,
    // A hand save is a deliberate override — the picker's "currently applied" only means something
    // while the sun's own numbers are still exactly what that preset produced, so this is the one
    // place that ever clears it. sunAnchor is reset to the value just saved, so the next star picked
    // scales against the sun as it stands now, not against whatever anchor an old preset left behind.
    sunStar: "",
    sunAnchor: sunRadius,
    sunColorCore: f.colour("sunColorCore", base?.sunColorCore ?? 0xfff3c4),
    sunColorEdge: f.colour("sunColorEdge", base?.sunColorEdge ?? 0xff7a1a),
    sunIntensity: f.num("sunIntensity", base?.sunIntensity ?? 1, { min: 0, max: 20 }),
    orbitScale: f.of("orbitScale", base?.orbitScale ?? 1, positive),
    beltRadius: f.of("beltRadius", base?.beltRadius ?? 65.5, positive),
    beltDensity: f.int("beltDensity", base?.beltDensity ?? 1400, { min: 0, max: 200_000 }),
    starCount: f.int("starCount", base?.starCount ?? 3600, { min: 0, max: 200_000 }),
    nebulaA: f.colour("nebulaA", base?.nebulaA ?? 0x3b0764),
    nebulaB: f.colour("nebulaB", base?.nebulaB ?? 0x0b2f6e),
    bloom: f.num("bloom", base?.bloom ?? 1, { min: 0, max: 10 }),
    fov: f.num("fov", base?.fov ?? 42, { min: 10, max: 120 }),
    // the arrangement: /api/admin/scene/arrange writes these two from the real solar system, and this
    // endpoint lets them be set by hand — a span of 30 au is Neptune, 63241.1 is a light year
    scaleMode: f.of("scaleMode", base?.scaleMode ?? "stylised", mode),
    spanAu: f.num("spanAu", base?.spanAu ?? 30, { min: 0.2, max: LIGHT_YEAR_AU }),
    sunColorMid: f.colour("sunColorMid", base?.sunColorMid ?? 0xffb547),
    sunGranulation: f.num("sunGranulation", base?.sunGranulation ?? 1, { min: 0, max: 3 }),
    sunCorona: f.num("sunCorona", base?.sunCorona ?? 1, { min: 0, max: 3 }),
    sunSpots: f.num("sunSpots", base?.sunSpots ?? 0, { min: 0, max: 3 }),
    sunSpin: f.num("sunSpin", base?.sunSpin ?? 1, { min: 0, max: 3 }),
    sunLimb: f.num("sunLimb", base?.sunLimb ?? 1, { min: 0, max: 3 }),
    sunFlare: f.num("sunFlare", base?.sunFlare ?? 1, { min: 0, max: 3 }),
    beltWidth: f.num("beltWidth", base?.beltWidth ?? 9, { min: 0, max: 60 }),
    beltThickness: f.num("beltThickness", base?.beltThickness ?? 1.2, { min: 0, max: 10 }),
    beltRockSize: f.num("beltRockSize", base?.beltRockSize ?? 1, { min: 0.2, max: 4 }),
    beltColor: f.colour("beltColor", base?.beltColor ?? 0x8b7d6b),
    beltTilt: f.num("beltTilt", base?.beltTilt ?? 0, { min: -45, max: 45 }),
    constellations: f.bool("constellations", base?.constellations ?? true),
    constellationGain: f.num("constellationGain", base?.constellationGain ?? 1, { min: 0, max: 3 }),
    updatedAt: new Date(),
    };
  });

const handlers = createSingleton({ name: "scene", table: t.sceneConfig, parse });
export const GET = handlers.GET;
export const PUT = handlers.PUT;
