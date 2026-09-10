// The repo picker's source: every repository on the account, plus which of them a project already
// points at, so the admin can link one instead of typing a URL. Read-only, admin-only, never cached by
// the browser — the GitHub list itself is cached for an hour inside src/lib/github.ts.

import { getDb, schema as t } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { listRepos, type RepoSummary } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface RepoPick extends RepoSummary {
  /** The slug of the project that already links to this repository, when one does. */
  linkedTo: string | null;
}
export interface ReposResponse {
  /** True when GITHUB_TOKEN is set: private repositories are included and the limit is 5000/hour. */
  authenticated: boolean;
  count: number;
  repos: readonly RepoPick[];
}

const NO_STORE = { "cache-control": "no-store" };
const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: NO_STORE });

/** "https://github.com/Wosmos/zcrypt" and "Wosmos/zcrypt.git" both key on "zcrypt". */
const repoKey = (url: string): string =>
  (url.replace(/\.git$/, "").split("/").filter(Boolean).pop() ?? "").toLowerCase();

export async function GET(): Promise<Response> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getDb();
  const linked = new Map<string, string>();
  if (db) {
    try {
      const rows = await db.select({ slug: t.projects.slug, github: t.projects.github }).from(t.projects);
      for (const r of rows) if (r.github) linked.set(repoKey(r.github), r.slug);
    } catch (e) {
      // the list is still useful without the "already linked" marks
      console.error("[admin] github repos", e instanceof Error ? e.message : e);
    }
  }

  const repos = await listRepos();
  const body: ReposResponse = {
    authenticated: Boolean(process.env.GITHUB_TOKEN),
    count: repos.length,
    repos: repos.map((r) => ({ ...r, linkedTo: linked.get(r.name.toLowerCase()) ?? null })),
  };
  return json(body);
}
