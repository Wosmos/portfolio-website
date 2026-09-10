// The client islands (SkillsMatrix, PlanetStrip, PlanetCanvases) cannot read the database, so the
// server pages hand them the shape they render instead. These narrow a database row down to it.

import type { LangShare } from "@/data/portfolio";
import type { ContentProject } from "@/lib/content";
import type { ProjectFull } from "@/lib/three/types";

/** Exactly the fields the three.js views use, moons included — keeps the database-only prose off the wire. */
export function toProject(p: ContentProject): ProjectFull {
  return {
    id: p.id, title: p.title, year: p.year, weight: p.weight, tagline: p.tagline, description: p.description,
    stack: p.stack, context: p.context, category: p.category, status: p.status,
    github: p.github, live: p.live, langs: p.langs, planet: p.planet, moons: p.moons,
  };
}
export const toProjects = (ps: readonly ContentProject[]): ProjectFull[] => ps.map(toProject);

/** What SkillsMatrix matches a skill against, plus what its readout links to. */
export interface MatrixProject { id: string; title: string; tagline: string; stack: readonly string[]; langs: readonly LangShare[] }
export const toMatrixProjects = (ps: readonly MatrixProject[]): MatrixProject[] =>
  ps.map((p) => ({ id: p.id, title: p.title, tagline: p.tagline, stack: p.stack, langs: p.langs }));
