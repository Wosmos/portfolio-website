// Auto-arrange: lays the whole system out from the real solar system instead of by hand.
//
// The arithmetic lives in src/lib/scale.ts, so this endpoint only decides what to persist. It always
// writes the mode, the span and the belt the arrangement produced; `apply: "all"` also walks the
// visible projects in order and gives each one the body it stands in for — Zcrypt becomes Mercury,
// Learnity becomes Venus, outward. Running it twice with the same body writes the same values, and
// switching back to `stylised` restores the sizes and orbits that shipped.

import { asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import type { PlanetConfigJson, RingConfigJson } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { build, isRecord, reject } from "@/lib/admin-crud";
import { DEFAULT_SCENE, revalidateContent } from "@/lib/content";
import { arrange, clampPlanetSize, isScaleMode, LIGHT_YEAR_AU, type ScaleMode } from "@/lib/scale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Apply = "scene" | "all";

export interface ArrangedBody {
  slug: string;
  /** The real body this project now stands in for. */
  name: string;
  orbit: number; size: number; tilt: number; spin: number;
  type: PlanetConfigJson["type"];
  ringed: boolean;
}
export interface ArrangeResult {
  mode: ScaleMode;
  /** "scene" wrote only the scene row; "all" also wrote every visible project. */
  apply: Apply;
  scene: { scaleMode: ScaleMode; spanAu: number; sunRadius: number; beltRadius: number; beltWidth: number };
  /** What one scene unit is worth in astronomical units, for the cockpit's readout. */
  auPerUnit: number;
  /** The sentence the admin shows next to the mode. */
  note: string;
  /** The bodies the arrangement produced — written when `apply` is "all", a preview otherwise. */
  bodies: readonly ArrangedBody[];
}

/** A ring for a body that has one but no stored configuration yet: Saturn's colours, roughly. */
const DEFAULT_RING: Omit<RingConfigJson, "tilt"> = { ca: 0xd9c9a6, cb: 0x8f7d5e, inner: 1.5, outer: 2.6 };

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

interface Input { mode: ScaleMode; spanAu: number | null; apply: Apply }

const readMode = (value: unknown, key: string): ScaleMode => {
  if (typeof value !== "string" || !isScaleMode(value)) reject(`${key} must be stylised, relative or real`);
  return value;
};
const readApply = (value: unknown, key: string): Apply => {
  if (value !== "scene" && value !== "all") reject(`${key} must be "scene" or "all"`);
  return value;
};

export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return json({ error: "The database is not configured" }, 503);

  let raw: unknown = null;
  try { raw = await request.json(); } catch { raw = null; }
  if (!isRecord(raw)) return json({ error: "Expected a JSON object" }, 400);

  const parsed = build(raw, (f): Input => ({
    mode: f.of("mode", undefined, readMode),
    spanAu: f.has("spanAu") ? f.num("spanAu", undefined, { min: 0.2, max: LIGHT_YEAR_AU }) : null,
    apply: f.of("apply", "scene" as Apply, readApply),
  }));
  if (!("values" in parsed)) return json({ error: parsed.error }, 400);
  const input = parsed.values;

  try {
    const [row] = await db.select().from(t.sceneConfig).limit(1);
    const rows = await db
      .select({ id: t.projects.id, slug: t.projects.slug, planet: t.projects.planet })
      .from(t.projects)
      .where(eq(t.projects.visible, true))
      .orderBy(asc(t.projects.sortOrder));

    // a stored radius the "real" mode computed is a fraction of a unit; carrying it into the other two
    // modes would shrink every planet with it, so leaving "real" starts from the default again
    const stored = row?.sunRadius ?? DEFAULT_SCENE.sunRadius;
    const wasReal = (row?.scaleMode ?? DEFAULT_SCENE.scaleMode) === "real";
    const sunRadius = input.mode === "real" || !wasReal ? stored : DEFAULT_SCENE.sunRadius;
    const spanAu = input.spanAu ?? row?.spanAu ?? DEFAULT_SCENE.spanAu;

    const plan = arrange(input.mode, { count: Math.max(1, rows.length), spanAu, sunRadius });
    const scene = {
      scaleMode: input.mode,
      spanAu,
      sunRadius: plan.sunRadius,
      beltRadius: plan.belt.radius,
      beltWidth: plan.belt.width,
    };
    const sceneRow = { ...scene, updatedAt: new Date() };
    if (row) await db.update(t.sceneConfig).set(sceneRow).where(eq(t.sceneConfig.id, row.id));
    else await db.insert(t.sceneConfig).values(sceneRow);

    const bodies: ArrangedBody[] = [];
    const writes: Promise<unknown>[] = [];
    for (const [i, project] of rows.entries()) {
      const body = plan.bodies[i];
      if (!body) continue;
      const size = clampPlanetSize(body.size, plan.sunRadius);
      bodies.push({
        slug: project.slug, name: body.name, orbit: body.orbit, size,
        tilt: body.tilt, spin: body.spin, type: body.type, ringed: body.ringed,
      });
      if (input.apply !== "all") continue;
      const planet: PlanetConfigJson = {
        ...project.planet, type: body.type, size, tilt: body.tilt, spin: body.spin,
        // a ring is never removed here: the arrangement only adds the ones the real body has
        ring: body.ringed ? (project.planet.ring ?? { ...DEFAULT_RING, tilt: body.tilt }) : (project.planet.ring ?? null),
      };
      writes.push(
        db.update(t.projects)
          .set({ orbit: body.orbit, planet, updatedAt: new Date() })
          .where(eq(t.projects.id, project.id)),
      );
    }
    await Promise.all(writes);
    revalidateContent();

    const result: ArrangeResult = {
      mode: input.mode, apply: input.apply, scene, auPerUnit: plan.auPerUnit, note: plan.note, bodies,
    };
    return json(result);
  } catch (e) {
    console.error("[admin] scene arrange", e instanceof Error ? e.message : e);
    return json({ error: "Request failed" }, 500);
  }
}
