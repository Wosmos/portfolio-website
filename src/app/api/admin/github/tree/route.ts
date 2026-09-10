// Moon preview: the repository's top-level folders and the moons they would produce, so the admin can
// look before applying. Read-only — nothing here writes — and never cached by the browser; the tree
// itself is cached for an hour inside src/lib/github.ts.

import { eq } from "drizzle-orm";
import { getDb, schema as t } from "@/db/client";
import type { MoonConfigJson } from "@/db/schema";
import { projectById } from "@/data/portfolio";
import { requireAdmin } from "@/lib/auth";
import { getRepoTree, isMoonNoise, moonsFor, type MoonSource, type RepoFolder } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface TreeResponse {
  slug: string;
  /** "Wosmos/zcrypt", or "" when the project has no repository URL. */
  repo: string;
  /** True when GITHUB_TOKEN is set — private repositories only have a readable tree with one. */
  authenticated: boolean;
  /** The directories a moon may be made from, biggest first as the cap sees them. */
  folders: readonly RepoFolder[];
  /** Top-level directories detection threw away: build output, dependencies, docs, tests. */
  skipped: readonly string[];
  /** What applying detection would write for the auto moons. */
  moons: readonly MoonConfigJson[];
  /** What the row carries now, so the admin can diff before applying. */
  stored: readonly MoonConfigJson[];
  moonsAuto: boolean;
  /** Empty unless there is something to say — no repository, or an unreadable tree. */
  note: string;
}

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

interface Found extends MoonSource { moons: readonly MoonConfigJson[]; moonsAuto: boolean }

/** The row first, the static record as the fallback, so the preview works on an empty database. */
async function findProject(slug: string): Promise<Found | null> {
  const db = getDb();
  if (db) {
    try {
      const [row] = await db
        .select({ slug: t.projects.slug, github: t.projects.github, moons: t.projects.moons, moonsAuto: t.projects.moonsAuto })
        .from(t.projects)
        .where(eq(t.projects.slug, slug))
        .limit(1);
      if (row) return { id: row.slug, github: row.github, moons: row.moons, moonsAuto: row.moonsAuto };
    } catch (e) {
      console.error("[admin] github tree", e instanceof Error ? e.message : e);
    }
  }
  const p = projectById(slug);
  return p ? { id: p.id, github: p.github, moons: [], moonsAuto: true } : null;
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const slug = (new URL(request.url).searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,64}$/.test(slug)) return json({ error: "A slug is required" }, 400);

  const project = await findProject(slug);
  if (!project) return json({ error: "No such project" }, 404);

  const base: Omit<TreeResponse, "folders" | "skipped" | "moons" | "note"> = {
    slug,
    repo: project.github.replace("https://github.com/", ""),
    authenticated: Boolean(process.env.GITHUB_TOKEN),
    stored: project.moons,
    moonsAuto: project.moonsAuto,
  };
  if (!project.github) {
    return json({ ...base, folders: [], skipped: [], moons: [], note: "This project has no repository URL." });
  }

  const tree = await getRepoTree(project);
  const folders = tree.filter((f) => !isMoonNoise(f.name));
  const moons = moonsFor(project, folders);
  const note = tree.length === 0
    ? "The tree came back empty — a private repository without GITHUB_TOKEN, a rate limit, or a repository with no folders."
    : folders.length === 0
      ? "Every top-level folder was skipped as build output, dependencies, docs or tests."
      : "";
  return json({
    ...base,
    folders: [...folders].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name)),
    skipped: tree.filter((f) => isMoonNoise(f.name)).map((f) => f.name).sort(),
    moons,
    note,
  } satisfies TreeResponse);
}
