// bun run db:seed — copies the static records in src/data/portfolio.ts into the tables, so the admin
// starts with the real content instead of an empty database. Safe to re-run: rows are matched by their
// natural key and updated in place, and nothing is deleted.

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { BODY_PRESETS, STAR_PRESETS } from "../data/catalog";
import { getDb } from "./client";
import * as t from "./schema";
import type { PlanetConfigJson } from "./schema";
import {
  DEFAULT_ORBITS,
  education as staticEducation,
  eggFacts as staticFacts,
  experience as staticExperience,
  featured,
  highlights,
  person,
  projects as staticProjects,
  skills as staticSkills,
  testimonials as staticTestimonials,
} from "@/data/portfolio";


async function main(): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");

  const existingProfile = await db.select({ id: t.profile.id }).from(t.profile).limit(1);
  const profileRow = {
    name: person.name, fullName: person.fullName, role: person.role, line: person.line,
    positioning: person.positioning, summary: person.summary, metaDescription: person.metaDescription,
    location: person.location, tz: person.tz, tzLabel: person.tzLabel, email: person.email,
    phone: person.phone, cv: person.cv, github: person.github, linkedin: person.linkedin,
    hashnode: person.hashnode, npmCard: person.npmCard, updatedAt: new Date(),
  };
  if (existingProfile[0]) await db.update(t.profile).set(profileRow).where(eq(t.profile.id, existingProfile[0].id));
  else await db.insert(t.profile).values(profileRow);
  console.log("profile ✓");

  const scene = await db.select({ id: t.sceneConfig.id }).from(t.sceneConfig).limit(1);
  if (!scene[0]) { await db.insert(t.sceneConfig).values({}); console.log("scene config ✓ (defaults)"); }

  for (const [i, p] of staticProjects.entries()) {
    const h = highlights[p.id];
    const planet: PlanetConfigJson = { ...p.planet, ring: p.planet.ring ?? null };
    const row = {
      slug: p.id, title: p.title, tagline: p.tagline, description: p.description,
      heading: h?.heading ?? "", bullets: [...(h?.bullets ?? [])], tech: [...(h?.tech ?? [])],
      stack: [...p.stack], extraLinks: (h?.extraLinks ?? []).map(([l, u]) => [l, u] as [string, string]),
      category: p.category, context: p.context, status: p.status ?? "", year: p.year, weight: p.weight,
      github: p.github, live: p.live ?? "", langs: p.langs.map(([n, v]) => [n, v] as [string, number]),
      planet, orbit: DEFAULT_ORBITS[i] ?? 17 + i * 12,
      sourcePrivate: p.sourcePrivate ?? false,
      featured: featured.includes(p.id), visible: true, sortOrder: i, updatedAt: new Date(),
    };
    const found = await db.select({ id: t.projects.id }).from(t.projects).where(eq(t.projects.slug, p.id)).limit(1);
    // the use-live switches and the moons are only seeded on insert: re-running this must not undo a
    // choice someone made in the dashboard about which values GitHub is allowed to overwrite, nor
    // throw away moons that were detected or edited by hand. Detection is a deliberate admin action
    // (POST /api/admin/projects/moons), so seeding starts a project with none.
    if (found[0]) await db.update(t.projects).set(row).where(eq(t.projects.id, found[0].id));
    else {
      await db.insert(t.projects).values({
        ...row, moons: [], moonsAuto: true, useLiveLangs: true, useLiveMeta: true, useLiveReadme: true,
      });
    }
  }
  console.log(`projects ✓ (${staticProjects.length})`);

  for (const [i, e] of staticExperience.entries()) {
    const row = {
      company: e.company, title: e.title, location: e.location, start: e.start, end: e.end,
      note: e.note, bullets: [...e.bullets], stack: [...e.stack], visible: true, sortOrder: i,
    };
    const found = await db.select({ id: t.experience.id }).from(t.experience).where(eq(t.experience.company, e.company)).limit(1);
    if (found[0]) await db.update(t.experience).set(row).where(eq(t.experience.id, found[0].id));
    else await db.insert(t.experience).values(row);
  }
  console.log(`experience ✓ (${staticExperience.length})`);

  for (const [i, g] of staticSkills.entries()) {
    const row = { group: g.group, items: [...g.items], sortOrder: i };
    const found = await db.select({ id: t.skillGroups.id }).from(t.skillGroups).where(eq(t.skillGroups.group, g.group)).limit(1);
    if (found[0]) await db.update(t.skillGroups).set(row).where(eq(t.skillGroups.id, found[0].id));
    else await db.insert(t.skillGroups).values(row);
  }
  console.log(`skills ✓ (${staticSkills.length})`);

  for (const [i, e] of staticEducation.entries()) {
    const row = { school: e.school, degree: e.degree, start: e.start, end: e.end, grade: e.grade, sortOrder: i };
    const found = await db.select({ id: t.education.id }).from(t.education).where(eq(t.education.school, e.school)).limit(1);
    if (found[0]) await db.update(t.education).set(row).where(eq(t.education.id, found[0].id));
    else await db.insert(t.education).values(row);
  }
  console.log(`education ✓ (${staticEducation.length})`);

  const haveTestimonials = await db.select({ id: t.testimonials.id }).from(t.testimonials).limit(1);
  // The sample quotes were removed from the static records when the site went live, so this list can
  // legitimately be empty now — and insert().values([]) throws rather than doing nothing.
  if (!haveTestimonials[0] && staticTestimonials.length > 0) {
    await db.insert(t.testimonials).values(
      staticTestimonials.map((x, i) => ({
        quote: x.quote, name: x.name, role: x.role, company: x.company, link: x.link ?? "",
        placeholder: x.placeholder ?? false, visible: true, sortOrder: i,
      })),
    );
    console.log(`testimonials ✓ (${staticTestimonials.length} samples)`);
  } else console.log(`testimonials — left alone (${haveTestimonials[0] ? "already has rows" : "no samples to seed"})`);

  const haveFacts = await db.select({ id: t.eggFacts.id }).from(t.eggFacts).limit(1);
  if (!haveFacts[0] && staticFacts.length > 0) {
    await db.insert(t.eggFacts).values(staticFacts.map((f, i) => ({ kind: f.kind, text: f.text, visible: true, sortOrder: i })));
    console.log(`secret facts ✓ (${staticFacts.length})`);
  } else console.log("secret facts — left alone (already has rows)");

  await seedCatalogue(db);

  console.log("\nseed complete.");
}

/**
 * The star and world catalogue. Upserted by slug rather than seed-if-empty, so a corrected figure in
 * catalog.ts reaches an existing database — but `visible` and `sortOrder` are only set on insert, so
 * a row the admin has hidden or reordered stays that way.
 */
async function seedCatalogue(db: NonNullable<ReturnType<typeof getDb>>): Promise<void> {
  // A bad figure should fail here, loudly, rather than in a 400 from a save months later.
  for (const b of BODY_PRESETS) checkLook(b.slug, b.planet);

  let stars = 0;
  for (const [i, x] of STAR_PRESETS.entries()) {
    const row = {
      slug: x.slug, name: x.name, kind: x.kind, cls: x.cls, constellation: x.constellation, note: x.note,
      radiusSolar: x.radiusSolar, tempK: x.tempK, luminositySolar: x.luminositySolar,
      massSolar: x.massSolar, distanceLy: x.distanceLy,
      colorCore: x.colorCore, colorMid: x.colorMid, colorEdge: x.colorEdge,
      intensity: x.intensity, granulation: x.granulation, limb: x.limb,
      spots: x.spots, spin: x.spin, corona: x.corona, flare: x.flare,
    };
    const had = await db.select({ id: t.starPresets.id }).from(t.starPresets).where(eq(t.starPresets.slug, x.slug));
    if (had[0]) await db.update(t.starPresets).set(row).where(eq(t.starPresets.id, had[0].id));
    else { await db.insert(t.starPresets).values({ ...row, visible: true, sortOrder: i }); stars++; }
  }
  console.log(`stars \u2713 (${STAR_PRESETS.length} in the catalogue, ${stars} new)`);

  let bodies = 0;
  for (const [i, x] of BODY_PRESETS.entries()) {
    const row = {
      slug: x.slug, name: x.name, kind: x.kind, system: x.system, parent: x.parent, note: x.note,
      radiusKm: x.radiusKm, semiMajorAu: x.semiMajorAu, tiltDeg: x.tiltDeg, dayHours: x.dayHours,
      ringed: x.ringed, planet: x.planet,
    };
    const had = await db.select({ id: t.bodyPresets.id }).from(t.bodyPresets).where(eq(t.bodyPresets.slug, x.slug));
    if (had[0]) await db.update(t.bodyPresets).set(row).where(eq(t.bodyPresets.id, had[0].id));
    else { await db.insert(t.bodyPresets).values({ ...row, visible: true, sortOrder: i }); bodies++; }
  }
  console.log(`worlds \u2713 (${BODY_PRESETS.length} in the catalogue, ${bodies} new)`);
}

/** The same windows /api/admin/projects enforces, checked at authoring time. */
const LOOK_RANGES: readonly (readonly [keyof PlanetConfigJson, number, number])[] = [
  ["ocean", 0, 1], ["cloud", 0, 1], ["crater", 0, 1], ["vein", 0, 1],
  ["atmo", 0, 1], ["atmoAlpha", 0, 1], ["bandSharp", 0, 1],
  ["glow", 0, 3], ["bands", 1, 60], ["spin", -20, 20], ["tilt", -360, 360], ["seed", 0, 10_000],
];
const PLANET_TYPES = ["gas", "rocky", "lava", "ice", "liquid", "muddy"];

function checkLook(slug: string, p: PlanetConfigJson): void {
  const fail = (why: string): never => { throw new Error(`catalog: ${slug} — ${why}`); };
  if (!PLANET_TYPES.includes(p.type)) fail(`type ${p.type} is not one of ${PLANET_TYPES.join(", ")}`);
  for (const key of ["c0", "c1", "c2", "c3", "rim"] as const) {
    const v = p[key];
    if (!Number.isInteger(v) || v < 0 || v > 0xffffff) fail(`${key} is not a colour`);
  }
  for (const [key, min, max] of LOOK_RANGES) {
    const v = p[key];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) fail(`${key} is ${String(v)}, outside ${min}\u2026${max}`);
  }
  if (p.ring) {
    for (const key of ["ca", "cb"] as const) {
      const v = p.ring[key];
      if (!Number.isInteger(v) || v < 0 || v > 0xffffff) fail(`ring.${key} is not a colour`);
    }
    if (!(p.ring.inner > 0) || !(p.ring.outer > p.ring.inner)) fail("ring radii must be 0 < inner < outer");
  }
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
