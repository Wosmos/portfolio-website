// The content the pages render. Reads the database first and falls back to the static records in
// src/data/portfolio.ts whenever a table is empty or the database is unreachable, so the site is never
// blank and the types the pages already use do not change.
//
// Testimonials are the one exception, deliberately: hiding every quote must remove the section from the
// site rather than resurrect the sample quotes, so that reader returns an empty list.
//
// Results are cached per request and revalidated on a tag, so an admin save can drop the cache
// immediately (see revalidateContent) instead of waiting for the hourly window.

import { revalidateTag, unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import type { MoonConfigJson } from "@/db/schema";
import { isScaleMode, type ScaleMode } from "@/lib/scale";
import {
  education as staticEducation,
  eggFacts as staticEggFacts,
  experience as staticExperience,
  DEFAULT_ORBITS,
  featured as staticFeatured,
  highlights as staticHighlights,
  person as staticPerson,
  projects as staticProjects,
  skills as staticSkills,
  testimonials as staticTestimonials,
  type Education,
  type EggFact,
  type Experience,
  type Highlight,
  type LangShare,
  type Person,
  type PlanetConfig,
  type Project,
  type SkillGroup,
  type Testimonial,
} from "@/data/portfolio";

const EGG_KINDS: readonly string[] = ["space", "me", "random"];
const isEggKind = (k: string): k is EggFact["kind"] => EGG_KINDS.includes(k);

export const CONTENT_TAG = "content";
/** Every cached reader, so one edit can drop one key instead of the whole site's content. */
export const CONTENT_KEYS = [
  "person", "projects", "experience", "skills", "education", "testimonials", "scene", "posts", "eggFacts",
] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

/** Call after any admin write so the public pages pick the change up on the next request. */
export function revalidateContent(): void { revalidateTag(CONTENT_TAG, "max"); }
/** Drop one reader's cache — cheaper than the whole tag when only one table changed. */
export function revalidateKey(key: ContentKey): void { revalidateTag(`content:${key}`, "max"); }

const cached = <T>(key: string, fn: () => Promise<T>): (() => Promise<T>) =>
  unstable_cache(fn, ["content", key], { tags: [CONTENT_TAG, `content:${key}`], revalidate: 3600 });

// Field names are the column names, camelCased, and the scene reads them straight off this object —
// see SceneSettings in src/lib/three/types.ts. Nothing translates between the two, so they must match.
export interface SceneConfig {
  sunRadius: number; sunColorCore: number; sunColorEdge: number; sunIntensity: number;
  orbitScale: number; beltRadius: number; beltDensity: number; starCount: number;
  nebulaA: number; nebulaB: number; bloom: number; fov: number;
  scaleMode: ScaleMode; spanAu: number;
  sunColorMid: number; sunGranulation: number; sunCorona: number; sunSpots: number;
  sunSpin: number; sunLimb: number; sunFlare: number;
  beltWidth: number; beltThickness: number; beltRockSize: number; beltColor: number; beltTilt: number;
  constellations: boolean; constellationGain: number;
}
export const DEFAULT_SCENE: SceneConfig = {
  sunRadius: 6, sunColorCore: 0xfff3c4, sunColorEdge: 0xff7a1a, sunIntensity: 1,
  orbitScale: 1, beltRadius: 65.5, beltDensity: 1400, starCount: 3600,
  nebulaA: 0x3b0764, nebulaB: 0x0b2f6e, bloom: 1, fov: 42,
  scaleMode: "stylised", spanAu: 30,
  sunColorMid: 0xffb547, sunGranulation: 1, sunCorona: 1, sunSpots: 0,
  sunSpin: 1, sunLimb: 1, sunFlare: 1,
  beltWidth: 9, beltThickness: 1.2, beltRockSize: 1, beltColor: 0x8b7d6b, beltTilt: 0,
  constellations: true, constellationGain: 1,
};
/** A project plus the fields only the database carries. */
export interface ContentProject extends Project {
  orbit: number; heading: string; bullets: readonly string[]; tech: readonly string[];
  extraLinks: readonly (readonly [string, string])[]; coverImage: string; featured: boolean;
  /** One per meaningful top-level folder in the repository. Empty is normal: detection is opt-in. */
  moons: readonly MoonConfigJson[];
  /** True while re-detection is allowed to replace the moons it produced itself. */
  moonsAuto: boolean;
  /** False means the dashboard's stored value wins over whatever GitHub reports. */
  useLiveLangs: boolean; useLiveMeta: boolean; useLiveReadme: boolean;
}
export interface Post {
  slug: string; title: string; excerpt: string; body: string; coverImage: string;
  tags: readonly string[]; readingMinutes: number; publishedAt: string | null;
}

// ── person ──
export const getPerson = cached("person", async (): Promise<Person> => {
  const db = getDb();
  if (!db) return staticPerson;
  try {
    const [row] = await db.select().from(t.profile).limit(1);
    if (!row) return staticPerson;
    return {
      name: row.name, fullName: row.fullName, role: row.role, line: row.line, positioning: row.positioning,
      summary: row.summary, metaDescription: row.metaDescription, location: row.location, tz: row.tz,
      tzLabel: row.tzLabel, email: row.email, phone: row.phone, cv: row.cv, github: row.github,
      linkedin: row.linkedin, hashnode: row.hashnode, npmCard: row.npmCard,
    };
  } catch (e) { console.error("[content] person", e); return staticPerson; }
});

// ── projects ──
function fallbackProjects(): ContentProject[] {
  return staticProjects.map((p, i) => {
    const h = staticHighlights[p.id];
    return {
      ...p, orbit: DEFAULT_ORBITS[i] ?? 17 + i * 12, heading: h?.heading ?? "", bullets: h?.bullets ?? [],
      tech: h?.tech ?? [], extraLinks: h?.extraLinks ?? [], coverImage: "", featured: staticFeatured.includes(p.id),
      // the static records carry no moons — only a repository tree can produce them
      moons: [], moonsAuto: true,
      useLiveLangs: true, useLiveMeta: true, useLiveReadme: true,
    };
  });
}
export const getProjects = cached("projects", async (): Promise<readonly ContentProject[]> => {
  const db = getDb();
  if (!db) return fallbackProjects();
  try {
    const rows = await db.select().from(t.projects).where(eq(t.projects.visible, true)).orderBy(asc(t.projects.sortOrder));
    if (!rows.length) return fallbackProjects();
    return rows.flatMap((r): ContentProject[] => {
      const planet: PlanetConfig = { ...r.planet, ring: r.planet.ring ?? undefined };
      return [{
        id: r.slug, title: r.title, tagline: r.tagline, description: r.description,
        stack: r.stack, category: r.category, context: r.context, status: r.status || undefined,
        year: r.year, weight: r.weight, github: r.github, live: r.live || null,
        langs: r.langs as readonly LangShare[], planet,
        orbit: r.orbit, heading: r.heading, bullets: r.bullets, tech: r.tech,
        extraLinks: r.extraLinks.map(([l, u]) => [l, u] as const), coverImage: r.coverImage, featured: r.featured,
        moons: r.moons, moonsAuto: r.moonsAuto,
        useLiveLangs: r.useLiveLangs, useLiveMeta: r.useLiveMeta, useLiveReadme: r.useLiveReadme,
      }];
    });
  } catch (e) { console.error("[content] projects", e); return fallbackProjects(); }
});
export async function getProject(slug: string): Promise<ContentProject | undefined> {
  return (await getProjects()).find((p) => p.id === slug);
}
export async function getFeatured(): Promise<readonly ContentProject[]> {
  const all = await getProjects();
  const picked = all.filter((p) => p.featured);
  return picked.length ? picked : all.slice(0, 4);
}
/** The highlight block a project page renders, assembled from the row's own columns. */
export function highlightOf(p: ContentProject): Highlight | undefined {
  if (!p.heading && !p.bullets.length) return undefined;
  return { heading: p.heading || p.tagline, tech: p.tech.length ? p.tech : p.stack, bullets: p.bullets, extraLinks: p.extraLinks };
}

// ── the rest ──
export const getExperience = cached("experience", async (): Promise<readonly Experience[]> => {
  const db = getDb();
  if (!db) return staticExperience;
  try {
    const rows = await db.select().from(t.experience).where(eq(t.experience.visible, true)).orderBy(asc(t.experience.sortOrder));
    if (!rows.length) return staticExperience;
    return rows.map((r) => ({ company: r.company, title: r.title, location: r.location, start: r.start, end: r.end, stack: r.stack, note: r.note, bullets: r.bullets }));
  } catch (e) { console.error("[content] experience", e); return staticExperience; }
});
export const getSkills = cached("skills", async (): Promise<readonly SkillGroup[]> => {
  const db = getDb();
  if (!db) return staticSkills;
  try {
    const rows = await db.select().from(t.skillGroups).orderBy(asc(t.skillGroups.sortOrder));
    return rows.length ? rows.map((r) => ({ group: r.group, items: r.items })) : staticSkills;
  } catch (e) { console.error("[content] skills", e); return staticSkills; }
});
export const getEducation = cached("education", async (): Promise<readonly Education[]> => {
  const db = getDb();
  if (!db) return staticEducation;
  try {
    const rows = await db.select().from(t.education).orderBy(asc(t.education.sortOrder));
    return rows.length ? rows.map((r) => ({ school: r.school, degree: r.degree, start: r.start, end: r.end, grade: r.grade })) : staticEducation;
  } catch (e) { console.error("[content] education", e); return staticEducation; }
});
export const getTestimonials = cached("testimonials", async (): Promise<readonly Testimonial[]> => {
  const db = getDb();
  if (!db) return staticTestimonials;
  try {
    const rows = await db.select().from(t.testimonials).where(eq(t.testimonials.visible, true)).orderBy(asc(t.testimonials.sortOrder));
    return rows.map((r) => ({ quote: r.quote, name: r.name, role: r.role, company: r.company, link: r.link || null, placeholder: r.placeholder }));
  } catch (e) { console.error("[content] testimonials", e); return staticTestimonials; }
});
export const getEggFacts = cached("eggFacts", async (): Promise<readonly EggFact[]> => {
  const db = getDb();
  if (!db) return staticEggFacts;
  try {
    const rows = await db.select().from(t.eggFacts).where(eq(t.eggFacts.visible, true)).orderBy(asc(t.eggFacts.sortOrder));
    const out = rows.map((r) => ({ kind: isEggKind(r.kind) ? r.kind : "random", text: r.text }));
    return out.length ? out : staticEggFacts;
  } catch (e) { console.error("[content] eggFacts", e); return staticEggFacts; }
});
export const getScene = cached("scene", async (): Promise<SceneConfig> => {
  const db = getDb();
  if (!db) return DEFAULT_SCENE;
  try {
    const [row] = await db.select().from(t.sceneConfig).limit(1);
    if (!row) return DEFAULT_SCENE;
    return {
      sunRadius: row.sunRadius, sunColorCore: row.sunColorCore, sunColorEdge: row.sunColorEdge,
      sunIntensity: row.sunIntensity, orbitScale: row.orbitScale, beltRadius: row.beltRadius,
      beltDensity: row.beltDensity, starCount: row.starCount, nebulaA: row.nebulaA, nebulaB: row.nebulaB,
      bloom: row.bloom, fov: row.fov,
      // the column is a varchar, so an unknown mode falls back rather than reaching the scene
      scaleMode: isScaleMode(row.scaleMode) ? row.scaleMode : DEFAULT_SCENE.scaleMode,
      spanAu: row.spanAu, sunColorMid: row.sunColorMid, sunGranulation: row.sunGranulation,
      sunCorona: row.sunCorona, sunSpots: row.sunSpots, sunSpin: row.sunSpin, sunLimb: row.sunLimb,
      sunFlare: row.sunFlare, beltWidth: row.beltWidth, beltThickness: row.beltThickness,
      beltRockSize: row.beltRockSize, beltColor: row.beltColor, beltTilt: row.beltTilt,
      constellations: row.constellations, constellationGain: row.constellationGain,
    };
  } catch (e) { console.error("[content] scene", e); return DEFAULT_SCENE; }
});
export const getPosts = cached("posts", async (): Promise<readonly Post[]> => {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(t.posts).where(eq(t.posts.published, true)).orderBy(asc(t.posts.publishedAt));
    return rows
      .map((r) => ({ slug: r.slug, title: r.title, excerpt: r.excerpt, body: r.body, coverImage: r.coverImage, tags: r.tags, readingMinutes: r.readingMinutes, publishedAt: r.publishedAt?.toISOString() ?? null }))
      .reverse();
  } catch (e) { console.error("[content] posts", e); return []; }
});
export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getPosts()).find((p) => p.slug === slug);
}
