// Trade routes: which planets share technology. Pure — takes the projects, returns the pairs — so the
// deck can list what is shared in words and the scene can draw the same pairs as arcs.

import type { ProjectFull } from "@/lib/three/types";

export interface Route {
  a: string; b: string;
  /** Display names of what the two share, most specific first. */
  shared: readonly string[];
  weight: number;
}

// spellings that are the same thing; keys and values are already normalised
const ALIAS: Readonly<Record<string, string>> = {
  next: "nextjs", postgresql: "postgres", websocket: "websockets", ws: "websockets", golang: "go",
  node: "nodejs", ts: "typescript", tailwind: "tailwindcss", reactnativ: "reactnative",
};

/** "Next.js 15" · "Go (stdlib)" · "PostgreSQL" → nextjs · go · postgres. */
export function normalizeTech(name: string): string {
  const s = name.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+v?\d+(\.\d+)*\s*$/, "").replace(/[^a-z0-9]/g, "");
  return ALIAS[s] ?? s;
}

/** Everything a project is built with, normalised → as first written: tech and stack, plus any language over `minLangPct`. */
export function techOf(p: ProjectFull, minLangPct = 10): Map<string, string> {
  const out = new Map<string, string>();
  const add = (raw: string): void => { const k = normalizeTech(raw); if (k && !out.has(k)) out.set(k, raw.replace(/\s*\(.*?\)/g, "").trim()); };
  for (const t of p.tech ?? []) add(t);
  for (const s of p.stack) add(s);
  for (const [lang, pct] of p.langs) if (pct >= minLangPct) add(lang);
  return out;
}

/**
 * Every pair sharing at least `min` things, once the things nearly everything shares are set aside:
 * seven of eight projects here are TypeScript and six are Next.js, so a link on either alone would
 * join the whole system into one fan and say nothing. `ubiquity` is the share of projects above which
 * a technology stops counting; what is left is specific enough that one shared item is a real link.
 * Sorted heaviest first.
 */
export function computeRoutes(projects: readonly ProjectFull[], { min = 1, ubiquity = 0.7 } = {}): Route[] {
  const techs = projects.map((p) => techOf(p));
  const count = new Map<string, number>();
  for (const t of techs) for (const k of t.keys()) count.set(k, (count.get(k) ?? 0) + 1);
  const common = new Set([...count].filter(([, n]) => n / projects.length > ubiquity).map(([k]) => k));
  const routes: Route[] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const shared: { k: string; name: string; n: number }[] = [];
      for (const [k, name] of techs[i]) if (!common.has(k) && techs[j].has(k)) shared.push({ k, name, n: count.get(k) ?? 0 });
      if (shared.length < min) continue;
      shared.sort((x, y) => x.n - y.n);   // rarest first: it is the more telling thing to have in common
      routes.push({ a: projects[i].id, b: projects[j].id, shared: shared.map((s) => s.name), weight: shared.length });
    }
  }
  return routes.sort((x, y) => y.weight - x.weight);
}

export const routesFor = (routes: readonly Route[], id: string): Route[] => routes.filter((r) => r.a === id || r.b === id);
