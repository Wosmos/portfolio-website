// Putting a real star at the centre.
//
// A star preset writes the sun's eleven shader fields and its radius at the **true ratio** to the Sun,
// which is what the owner asked for and is also why this endpoint is destructive: UY Scuti is 1,708
// solar radii, so applying it makes the star 1,708 times whatever one solar radius is worth here, and
// every orbit ends up inside it. `preview: true` returns exactly what a write would do — the impact
// sentence included — so the real numbers can be put in front of someone before they commit.
//
// "Whatever one solar radius is worth here" is `sunAnchor`, and it is the reason this does not fight
// the owner's own scale: a scene whose sun sits at 60 is the Sun at 60, so picking the Sun returns to
// 60 and picking Betelgeuse gives 764 × 60. The anchor is written once and never moves after that.
//
// What happens to the planets is the caller's choice, and the four options are in src/lib/catalog.ts:
// leave them, grow them with the star, grow their orbits too, or lay the whole system out again.

import { asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { build, isRecord, reject } from "@/lib/admin-crud";
import { DEFAULT_SCENE, revalidateContent } from "@/lib/content";
import { arrange, clampPlanetSize, isScaleMode, type ScaleMode } from "@/lib/scale";
import {
  isRescale, rescaleBody, rescaleNote, starImpact, sunFromStar,
  type Rescale, type SceneFrame, type StarImpact, type SunFields,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where the outermost orbit sits in scene units. The same figure `arrange()` defaults to. */
const OUTER_RADIUS = 110;
/** How far clear of the star's own surface the innermost orbit has to sit after a refit. */
const CLEARANCE = 1.6;

export interface StarApplyResult {
  star: { slug: string; name: string; radiusSolar: number };
  /** What one solar radius is worth in this scene. */
  anchor: number;
  /** True when nothing was written. */
  preview: boolean;
  rescale: Rescale;
  sun: SunFields;
  impact: StarImpact;
  /** One line describing what the chosen rescale does to the planets. */
  note: string;
  /** Every visible project, before and after. */
  bodies: readonly { slug: string; orbit: number; size: number; wasOrbit: number; wasSize: number }[];
}

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const readRescale = (value: unknown, key: string): Rescale => {
  if (typeof value !== "string" || !isRescale(value)) reject(`${key} must be none, planets, distances or refit`);
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

  const parsed = build(raw, (f) => ({
    slug: f.text("slug", undefined, 64),
    rescale: f.of("rescale", "none" as Rescale, readRescale),
    preview: f.bool("preview", false),
  }));
  if (!("values" in parsed)) return json({ error: parsed.error }, 400);
  const input = parsed.values;

  try {
    const [star] = await db.select().from(t.starPresets).where(eq(t.starPresets.slug, input.slug)).limit(1);
    if (!star) return json({ error: `No star called ${input.slug}` }, 404);

    const [scene] = await db.select().from(t.sceneConfig).limit(1);
    const projects = await db
      .select({ id: t.projects.id, slug: t.projects.slug, orbit: t.projects.orbit, planet: t.projects.planet })
      .from(t.projects)
      .where(eq(t.projects.visible, true))
      .orderBy(asc(t.projects.sortOrder));

    const mode: ScaleMode = isScaleMode(scene?.scaleMode ?? "") ? (scene?.scaleMode as ScaleMode) : DEFAULT_SCENE.scaleMode;
    const sunRadiusNow = scene?.sunRadius ?? DEFAULT_SCENE.sunRadius;
    // What one solar radius is worth here. A scene that has never had a star applied is the Sun by
    // definition, so its current radius *is* the anchor — which is how an owner who scaled their sun
    // to 60 gets 60 back when they pick the Sun, instead of being collapsed to the built-in 6.
    const anchor = scene?.sunAnchor && scene.sunAnchor > 0 && scene.sunStar ? scene.sunAnchor : sunRadiusNow;
    const frame: SceneFrame = {
      sunRadius: sunRadiusNow,
      anchor,
      spanAu: scene?.spanAu ?? DEFAULT_SCENE.spanAu,
      outerRadius: OUTER_RADIUS,
      mode,
    };
    const current = projects.map((p) => ({ orbit: p.orbit, size: p.planet.size }));
    const sun = sunFromStar(star, anchor);
    const impact = starImpact(star, frame, current);

    // `refit` is not a per-body transform: it lays the system out again from the real solar-system
    // table, which needs the whole list. Everything else is a ratio applied to each planet in turn.
    const plan = input.rescale === "refit"
      ? arrange(mode, { count: Math.max(1, projects.length), outerRadius: OUTER_RADIUS, spanAu: frame.spanAu, sunRadius: sun.sunRadius })
      : null;
    // `stylised` returns the hand-picked orbits whatever the star is, so on its own a refit around a
    // hypergiant leaves all eight orbits inside the photosphere — which is exactly the thing the
    // option exists to avoid. Push the whole arrangement out until the innermost one clears it.
    //
    // But only when the CHOSEN star actually makes that worse than it already was. `impact.swallowed`
    // is how many orbits sit inside the star that is there right now; a scene whose sun has been
    // resized well past the stylised layout's own scale (this owner's is 60, ten times the built-in 6)
    // can already have several orbits inside it before anyone touches the picker at all. This bug was
    // found the hard way: it once fired for the plain Sun itself, because 17 < 60 is true regardless
    // of which star that 60 came from, and it multiplied every orbit by 5.6x on what should have read
    // as a same-size, do-nothing pick. Comparing against how many were ALREADY swallowed — not
    // against a fixed multiple of the new radius — is what makes refit idempotent: picking the same
    // or a smaller star than what is already there never spreads anything further.
    const innermost = plan ? Math.min(...plan.bodies.map((b) => b.orbit)) : 0;
    const wouldSwallow = plan ? plan.bodies.filter((b) => b.orbit <= sun.sunRadius).length : 0;
    const spread = plan && innermost > 0 && wouldSwallow > impact.swallowed
      ? Math.max(1, (sun.sunRadius * CLEARANCE) / innermost)
      : 1;

    const bodies = projects.map((p, i) => {
      const fitted = plan?.bodies[i];
      const next = fitted
        // sizes follow the same factor: an arrangement pushed a thousand times further out with the
        // planets left at 1.9 units is correct and shows you nothing. Self-similar keeps it legible.
        ? { orbit: fitted.orbit * spread, size: clampPlanetSize(fitted.size * spread, sun.sunRadius) }
        : rescaleBody({ orbit: p.orbit, size: p.planet.size }, input.rescale, impact.ratio, sun.sunRadius);
      return { slug: p.slug, orbit: next.orbit, size: next.size, wasOrbit: p.orbit, wasSize: p.planet.size };
    });

    const result: StarApplyResult = {
      star: { slug: star.slug, name: star.name, radiusSolar: star.radiusSolar },
      anchor,
      preview: input.preview,
      rescale: input.rescale,
      sun,
      impact,
      note: rescaleNote(input.rescale, impact, projects.length),
      bodies,
    };
    if (input.preview) return json(result);

    const sceneRow = { ...sun, sunStar: star.slug, sunAnchor: anchor, updatedAt: new Date() };
    if (scene) await db.update(t.sceneConfig).set(sceneRow).where(eq(t.sceneConfig.id, scene.id));
    else await db.insert(t.sceneConfig).values(sceneRow);

    // `none` still writes: the size cap moved with the star, so a planet that is now over it is
    // clamped here rather than being quietly rejected the next time someone saves that project.
    await Promise.all(projects.map((p, i) => {
      const next = bodies[i];
      if (!next) return Promise.resolve();
      if (next.orbit === p.orbit && next.size === p.planet.size) return Promise.resolve();
      return db.update(t.projects)
        .set({ orbit: next.orbit, planet: { ...p.planet, size: next.size }, updatedAt: new Date() })
        .where(eq(t.projects.id, p.id));
    }));
    revalidateContent();

    return json(result);
  } catch (e) {
    console.error("[admin] scene star", e instanceof Error ? e.message : e);
    return json({ error: "Request failed" }, 500);
  }
}
