// The client islands (SkillsMatrix) cannot read the database, so the server pages hand them the shape
// they render instead. These narrow a database row down to it.

import type { LangShare } from "@/data/portfolio";

/** What SkillsMatrix matches a skill against, plus what its readout links to. */
export interface MatrixProject { id: string; title: string; tagline: string; stack: readonly string[]; langs: readonly LangShare[] }
export const toMatrixProjects = (ps: readonly MatrixProject[]): MatrixProject[] =>
  ps.map((p) => ({ id: p.id, title: p.title, tagline: p.tagline, stack: p.stack, langs: p.langs }));
