// Live project data from GitHub, fetched on the server and cached for an hour (ISR). Everything here
// degrades to the static records in src/data/portfolio.ts, so a rate limit or a private repo never
// breaks a page. Set GITHUB_TOKEN in the environment to raise the limit and read private repos.

import { LANG_COLORS, projects, repoPath, repoSlug, type LangShare, type Project } from "@/data/portfolio";
import { escapeHtml } from "@/lib/text";

const API = "https://api.github.com";
const REVALIDATE = 3600;
const OWNER = "Wosmos";

export interface RepoMeta {
  stars: number; created: string; pushed: string; description: string | null; homepage: string | null;
  topics: readonly string[]; isPrivate: boolean;
}
export interface LastPush { repo: string; at: string; msg: string }
/** Per-project switches: false means the value stored in the dashboard wins over GitHub's. */
export interface LiveFlags { useLiveLangs?: boolean; useLiveMeta?: boolean; useLiveReadme?: boolean }
/** A project with whatever GitHub could add to it. The `*Live` flags say which half each value came from. */
export interface LiveProject extends Project {
  meta: RepoMeta | null; readme: string | null;
  langsLive: boolean; metaLive: boolean; readmeLive: boolean;
}

interface GhRepo { stargazers_count: number; created_at: string; pushed_at: string; description: string | null; homepage: string | null; topics?: string[]; private: boolean }
interface GhEvent { type: string; created_at: string; repo: { name: string }; payload?: { commits?: { message: string }[] } }

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const h: Record<string, string> = { accept, "user-agent": "wosmos-portfolio", "x-github-api-version": "2022-11-28" };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}
async function gh<T>(path: string, accept?: string): Promise<T | null> {
  try {
    const r = await fetch(`${API}${path}`, { headers: headers(accept), next: { revalidate: REVALIDATE } });
    if (!r.ok) return null;
    return (accept?.includes("raw") ? ((await r.text()) as unknown as T) : ((await r.json()) as T));
  } catch {
    return null;
  }
}

export async function getRepoMeta(p: Project): Promise<RepoMeta | null> {
  const j = await gh<GhRepo>(`/repos/${repoPath(p)}`);
  if (!j) return null;
  return { stars: j.stargazers_count, created: j.created_at, pushed: j.pushed_at, description: j.description, homepage: j.homepage, topics: j.topics ?? [], isPrivate: j.private };
}

/** Language split in percent, largest first — the same numbers the planet cutaway is built from. */
export async function getLanguages(p: Project): Promise<readonly LangShare[] | null> {
  const j = await gh<Record<string, number>>(`/repos/${repoPath(p)}/languages`);
  if (!j) return null;
  const entries = Object.entries(j);
  const total = entries.reduce((a, [, b]) => a + b, 0);
  if (!total) return null;
  const known = entries.filter(([n]) => n in LANG_COLORS);
  const other = entries.filter(([n]) => !(n in LANG_COLORS)).reduce((a, [, b]) => a + b, 0);
  const langs: LangShare[] = known.map(([n, b]) => [n, Math.round((b / total) * 1000) / 10] as const);
  if (other > 0) langs.push(["Other", Math.round((other / total) * 1000) / 10]);
  return langs.sort((a, b) => b[1] - a[1]);
}

export async function getReadmeHtml(p: Project, maxBlocks = 10): Promise<string | null> {
  const md = await gh<string>(`/repos/${repoPath(p)}/readme`, "application/vnd.github.raw+json");
  return md ? mdLite(md, maxBlocks) : null;
}

export async function getLastPush(): Promise<LastPush | null> {
  const events = await gh<GhEvent[]>("/users/Wosmos/events/public?per_page=30");
  const ev = events?.find((e) => e.type === "PushEvent");
  if (!ev) return null;
  const commits = ev.payload?.commits ?? [];
  return { repo: ev.repo.name.split("/")[1] ?? ev.repo.name, at: ev.created_at, msg: commits.at(-1)?.message.split("\n")[0] ?? "" };
}

/**
 * Layers GitHub over one project, honouring the three per-project switches. `meta` is fetched either
 * way because stars and push dates are facts the dashboard does not store — the switch decides whether
 * GitHub's description, homepage and topics are allowed to fill in what the row leaves empty.
 */
export async function getLiveProject(p: Project & LiveFlags, { readme = false } = {}): Promise<LiveProject> {
  const wantLangs = p.useLiveLangs !== false;
  const wantMeta = p.useLiveMeta !== false;
  const wantReadme = readme && p.useLiveReadme !== false;
  const [meta, langs, md] = await Promise.all([
    getRepoMeta(p),
    wantLangs ? getLanguages(p) : Promise.resolve(null),
    wantReadme ? getReadmeHtml(p) : Promise.resolve(null),
  ]);
  const fill = wantMeta && meta !== null ? meta : null;
  return {
    ...p,
    meta,
    readme: md,
    langs: langs ?? p.langs,
    langsLive: langs !== null,
    metaLive: fill !== null,
    readmeLive: md !== null,
    description: p.description || fill?.description || "",
    stack: p.stack.length ? p.stack : (fill?.topics ?? p.stack),
    live: (fill?.homepage ?? "") || p.live,
  };
}
/** The whole deck. Pass the database's projects to keep their switches; defaults to the static records. */
export async function getLiveProjects(list: readonly (Project & LiveFlags)[] = projects): Promise<readonly LiveProject[]> {
  return Promise.all(list.map((p) => getLiveProject(p)));
}

// ── the account's other repositories ────────────────────────────────────────
// Two readers over the same list. `listRepos` is what the admin's repo picker shows; `getRepoStars` is
// what the scene draws as background constellations. Both are cached for an hour and both degrade to an
// empty list, so neither the picker nor the sky can break a page.

export interface RepoSummary {
  name: string; fullName: string; description: string | null; homepage: string | null;
  topics: readonly string[]; stars: number; forks: number; language: string | null;
  pushed: string; created: string; isPrivate: boolean; archived: boolean; isFork: boolean; url: string;
}
/** The contract the scene draws from: one star per repository, sized by `commits`. */
export interface RepoStar { name: string; commits: number; stars: number; language: string; colour: number }

interface GhRepoFull extends GhRepo {
  name: string; full_name: string; forks_count: number; language: string | null;
  archived: boolean; fork: boolean; html_url: string; owner?: { login: string };
}
interface GhContributor { contributions: number }

/** 100 per page × 5 pages. Past that an account is not a portfolio any more. */
const MAX_PAGES = 5;
/** Commit counts cost one request each, so only the most recently pushed repositories get a star. */
const MAX_STARS = 24;
/** A language linguist has no colour for, or none at all. */
const NEUTRAL = 0x8b8b8b;

/** Every repository on the account, newest push first. With a token this includes the private ones. */
export async function listRepos(): Promise<readonly RepoSummary[]> {
  const mine = Boolean(process.env.GITHUB_TOKEN);
  const out: RepoSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    // /user/repos is the only endpoint that returns private repositories, and it needs the token
    const path = mine
      ? `/user/repos?per_page=100&affiliation=owner&sort=pushed&page=${page}`
      : `/users/${OWNER}/repos?per_page=100&sort=pushed&page=${page}`;
    const batch = await gh<GhRepoFull[]>(path);
    if (!batch || !Array.isArray(batch) || batch.length === 0) break;
    for (const r of batch) {
      if (r.owner && r.owner.login.toLowerCase() !== OWNER.toLowerCase()) continue;
      out.push({
        name: r.name, fullName: r.full_name, description: r.description, homepage: r.homepage,
        topics: r.topics ?? [], stars: r.stargazers_count, forks: r.forks_count, language: r.language,
        pushed: r.pushed_at, created: r.created_at, isPrivate: r.private, archived: r.archived,
        isFork: r.fork, url: r.html_url,
      });
    }
    if (batch.length < 100) break;
  }
  return out;
}

/**
 * Commits on the default branch, summed from `contributors?per_page=100&anon=1` — one request per
 * repository, which is the cheapest number GitHub will give without walking the commit list. It counts
 * every commit GitHub attributes to a contributor on the default branch, so it misses commits on other
 * branches and undercounts a repository with more than 100 contributors (none of these have).
 */
async function commitCount(fullName: string): Promise<number> {
  const list = await gh<GhContributor[]>(`/repos/${fullName}/contributors?per_page=100&anon=1`);
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, c) => sum + (Number.isFinite(c.contributions) ? c.contributions : 0), 0);
}

/** The repositories that are not one of the eight portfolio projects, as stars for the sky. */
export async function getRepoStars(): Promise<readonly RepoStar[]> {
  const taken = new Set(projects.map((p) => repoSlug(p).toLowerCase()));
  const repos = (await listRepos())
    // forks would draw someone else's history as mine
    .filter((r) => !r.isFork && !taken.has(r.name.toLowerCase()))
    .slice(0, MAX_STARS);
  const counts = await Promise.all(repos.map((r) => commitCount(r.fullName)));
  return repos.map((r, i) => {
    const language = r.language ?? "Other";
    return {
      name: r.name,
      commits: counts[i] ?? 0,
      stars: r.stars,
      language,
      colour: LANG_COLORS[language] ?? NEUTRAL,
    };
  });
}

// ── markdown-lite ──
// Headings, paragraphs, bullet lists, inline code / bold / links. Drops images, badges, html, tables,
// code fences, "table of contents" sections, anchor-only list items, link-only nav lines and headings
// that end up with nothing under them. Output is escaped before any markup is added.
type Block = { k: "p" | "ul" | "h"; h: string };
export function mdLite(md: string, maxBlocks = 10): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [], list: string[] = [], fence = false, skipSection = false;
  const inline = (t: string): string =>
    escapeHtml(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const linkOnly = (t: string): boolean => /^(\s*\[[^\]]+\]\([^)]*\)\s*([·|•-]\s*)?)+$/.test(t);
  const flush = (): void => {
    if (para.length) { const t = para.join(" ").trim(); if (t && !linkOnly(t)) blocks.push({ k: "p", h: `<p>${inline(t)}</p>` }); para = []; }
    if (list.length) { blocks.push({ k: "ul", h: `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>` }); list = []; }
  };
  for (const raw of lines) {
    if (/^\s*```/.test(raw)) { fence = !fence; flush(); continue; }
    if (fence) continue;
    const l = raw.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/<[^>]+>/g, "").trim();
    if (!l) { flush(); continue; }
    const h = /^(#{1,6})\s+(.*)/.exec(l);
    if (h) {
      flush();
      const title = (h[2] ?? "").replace(/[#*_`]+$/, "").trim();
      skipSection = /contents|^toc$|badges?/i.test(title);
      if ((h[1] ?? "").length > 1 && !skipSection) blocks.push({ k: "h", h: `<h3>${inline(title)}</h3>` });
      continue;
    }
    if (skipSection) continue;
    if (/^\|/.test(l) || /^[-=]{3,}$/.test(l) || /^\[!\[/.test(l) || /shields\.io|badge/i.test(l)) continue;
    const li = /^[-*+]\s+(.*)|^\d+[.)]\s+(.*)/.exec(l);
    if (li) {
      const item = li[1] ?? li[2] ?? "";
      if (/^\[[^\]]+\]\(#/.test(item)) continue;
      if (para.length) flush();
      list.push(item);
      continue;
    }
    if (list.length) flush();
    para.push(l);
  }
  flush();
  const kept = blocks.filter((b, i) => !(b.k === "h" && (i + 1 >= blocks.length || blocks[i + 1]?.k === "h")));
  return kept.slice(0, maxBlocks).map((b) => b.h).join("");
}

// ── contribution calendar ────────────────────────────────────────────────────
// GitHub's REST API has no contributions endpoint and the GraphQL one needs a token, so this reads
// the same public fragment the profile page uses. Parsed defensively: anything unexpected returns
// null and the caller simply omits the heatmap.
export interface ContribDay { date: string; level: number; count: number }
export interface Contributions { days: readonly ContribDay[]; total: number; from: string; to: string }

const CELL = /data-date="(\d{4}-\d{2}-\d{2})"\s+id="(contribution-day-component-[\d-]+)"\s+data-level="([0-4])"/g;
const TIP = /<tool-tip[^>]*\bfor="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)<\/tool-tip>/g;

export async function getContributions(user = "Wosmos"): Promise<Contributions | null> {
  try {
    const r = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
      headers: { "x-requested-with": "XMLHttpRequest", "user-agent": "wosmos-portfolio", accept: "text/html" },
      next: { revalidate: REVALIDATE },
    });
    if (!r.ok) return null;
    const html = await r.text();
    const counts = new Map<string, number>();
    for (const m of html.matchAll(TIP)) {
      const n = /^\s*(\d+)\s+contribution/.exec(m[2]);
      counts.set(m[1], n ? Number(n[1]) : 0);
    }
    const days: ContribDay[] = [];
    for (const m of html.matchAll(CELL)) days.push({ date: m[1], level: Number(m[3]), count: counts.get(m[2]) ?? 0 });
    if (days.length < 90) return null;              // markup changed — drop it rather than show a broken grid
    days.sort((a, b) => a.date.localeCompare(b.date));
    const first = days[0], last = days[days.length - 1];
    if (!first || !last) return null;
    return { days, total: days.reduce((s, d) => s + d.count, 0), from: first.date, to: last.date };
  } catch { return null; }
}
