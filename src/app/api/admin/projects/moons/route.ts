// Apply moon detection: read a repository's top-level folders and write them onto the project row as
// moons. One project by slug, or every visible project that still has `moonsAuto` set.
//
// The rule that matters is that a hand edit is never destroyed. A stored moon with `auto: false` is
// kept exactly as it is, and it also claims its `path`, so a detected folder that already has a
// hand-edited moon does not come back as a second one. Only `auto: true` moons are replaced by fresh
// detection. `replace: true` is the explicit escape hatch that throws the hand edits away.
//
// Detection that comes back empty writes nothing: a rate limit or a missing token must not wipe a
// planet's moons.

import { and, asc, eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import type { MoonConfigJson } from "@/db/schema";
import { bad, build, ok, readBody } from "@/lib/admin-crud";
import { requireAdmin } from "@/lib/auth";
import { revalidateContent } from "@/lib/content";
import { getRepoFolders, MAX_MOONS, moonsFor, type MoonSource } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MoonSync {
  slug: string;
  repo: string;
  /** The folders detection kept, before the cap. */
  folders: readonly string[];
  /** Moon names, by what happened to them. `kept` includes both hand edits and re-detected folders. */
  added: readonly string[];
  kept: readonly string[];
  removed: readonly string[];
  /** The row's moons after the write — or as they still are, when nothing was written. */
  moons: readonly MoonConfigJson[];
  written: boolean;
  /** Why the project was left alone, when it was. */
  note: string;
}
export interface MoonsResponse {
  /** True when the hand edits were deliberately thrown away. */
  replaced: boolean;
  scanned: number;
  written: number;
  projects: readonly MoonSync[];
}

const key = (m: MoonConfigJson): string => m.path || m.name;

/** Hand edits first, so the cap can never drop one in favour of a detected folder. */
function merge(stored: readonly MoonConfigJson[], fresh: readonly MoonConfigJson[], replace: boolean): MoonConfigJson[] {
  if (replace) return fresh.slice(0, MAX_MOONS);
  const hand = stored.filter((m) => !m.auto);
  const claimed = new Set(hand.map(key));
  return [...hand, ...fresh.filter((m) => !claimed.has(key(m)))].slice(0, MAX_MOONS);
}

interface Row extends MoonSource { rowId: number; moons: MoonConfigJson[] }

export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  if (!db) return bad("The database is not configured", 503);

  const body = await readBody(request);
  if (!body) return bad("Invalid JSON body", 400);
  const parsed = build(body, (f) => ({
    slug: f.has("slug") ? f.slug("slug", undefined) : null,
    all: f.bool("all", false),
    replace: f.bool("replace", false),
  }));
  if (!("values" in parsed)) return bad(parsed.error, 400);
  const { slug, all, replace } = parsed.values;
  if (!slug && !all) return bad("Pass a slug, or all: true", 400);

  try {
    const columns = { rowId: t.projects.id, id: t.projects.slug, github: t.projects.github, moons: t.projects.moons };
    // a named slug is detected whatever its moonsAuto says; a sweep only touches the ones that opted in
    const rows: Row[] = slug
      ? await db.select(columns).from(t.projects).where(eq(t.projects.slug, slug)).limit(1)
      : await db
          .select(columns)
          .from(t.projects)
          .where(and(eq(t.projects.visible, true), eq(t.projects.moonsAuto, true)))
          .orderBy(asc(t.projects.sortOrder));
    if (slug && rows.length === 0) return bad("No such project", 404);

    const detected = await Promise.all(rows.map((r) => (r.github ? getRepoFolders(r) : Promise.resolve([]))));

    const out: MoonSync[] = [];
    let written = 0;
    for (const [i, row] of rows.entries()) {
      const folders = detected[i] ?? [];
      const repo = row.github.replace("https://github.com/", "");
      const stored = row.moons;
      const note = !row.github
        ? "No repository URL."
        : folders.length === 0
          ? "No folders detected — nothing written, so the stored moons stand."
          : "";
      // a failed or empty detection leaves the row exactly as it is, diff included
      const next = note ? stored : merge(stored, moonsFor(row, folders), replace);
      const before = new Set(stored.map(key));
      const after = new Set(next.map(key));
      const changed = JSON.stringify(stored) !== JSON.stringify(next);
      if (changed) {
        await db.update(t.projects).set({ moons: next, updatedAt: new Date() }).where(eq(t.projects.id, row.rowId));
        written++;
      }
      out.push({
        slug: row.id,
        repo,
        folders: folders.map((f) => f.name),
        added: next.filter((m) => !before.has(key(m))).map((m) => m.name),
        kept: next.filter((m) => before.has(key(m))).map((m) => m.name),
        removed: stored.filter((m) => !after.has(key(m))).map((m) => m.name),
        moons: next,
        written: changed,
        note,
      });
    }
    if (written > 0) revalidateContent();
    const answer: MoonsResponse = { replaced: replace, scanned: rows.length, written, projects: out };
    return ok(answer);
  } catch (e) {
    console.error("[admin] project moons", e instanceof Error ? e.message : e);
    return bad("Request failed", 500);
  }
}
