// The one scene_config row: the sun, orbit spacing, the belt, the star field and the camera.

import { schema as t } from "@/db/client";
import { build, createSingleton, reject, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const positive = (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) reject(`${key} must be greater than 0`);
  return value;
};

const parse: Parse<typeof t.sceneConfig> = (input, base) =>
  build(input, (f) => ({
    sunRadius: f.of("sunRadius", base?.sunRadius ?? 6, positive),
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
    updatedAt: new Date(),
  }));

const handlers = createSingleton({ name: "scene", table: t.sceneConfig, parse });
export const GET = handlers.GET;
export const PUT = handlers.PUT;
