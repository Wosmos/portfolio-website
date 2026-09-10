// bun run db:seed — copies the static records in src/data/portfolio.ts into the tables, so the admin
// starts with the real content instead of an empty database. Safe to re-run: rows are matched by their
// natural key and updated in place, and nothing is deleted.

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
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
      featured: featured.includes(p.id), visible: true, sortOrder: i, updatedAt: new Date(),
    };
    const found = await db.select({ id: t.projects.id }).from(t.projects).where(eq(t.projects.slug, p.id)).limit(1);
    if (found[0]) await db.update(t.projects).set(row).where(eq(t.projects.id, found[0].id));
    else await db.insert(t.projects).values(row);
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
  if (!haveTestimonials[0]) {
    await db.insert(t.testimonials).values(
      staticTestimonials.map((x, i) => ({
        quote: x.quote, name: x.name, role: x.role, company: x.company, link: x.link ?? "",
        placeholder: x.placeholder ?? false, visible: true, sortOrder: i,
      })),
    );
    console.log(`testimonials ✓ (${staticTestimonials.length} samples)`);
  } else console.log("testimonials — left alone (already has rows)");

  const haveFacts = await db.select({ id: t.eggFacts.id }).from(t.eggFacts).limit(1);
  if (!haveFacts[0]) {
    await db.insert(t.eggFacts).values(staticFacts.map((f, i) => ({ kind: f.kind, text: f.text, visible: true, sortOrder: i })));
    console.log(`secret facts ✓ (${staticFacts.length})`);
  } else console.log("secret facts — left alone (already has rows)");

  console.log("\nseed complete.");
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
