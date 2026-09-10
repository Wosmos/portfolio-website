// Live project data from GitHub, fetched on the server and cached for an hour (ISR). Everything here
// degrades to the static records in src/data/portfolio.ts, so a rate limit or a private repo never
// breaks a page. Set GITHUB_TOKEN in the environment to raise the limit and read private repos.

import { LANG_COLORS, projects, repoPath, type LangShare, type Project } from "@/data/portfolio";
import { escapeHtml } from "@/lib/text";

const API = "https://api.github.com";
const REVALIDATE = 3600;

export interface RepoMeta {
  stars: number; created: string; pushed: string; description: string | null; homepage: string | null;
  topics: readonly string[]; isPrivate: boolean;
}
export interface LastPush { repo: string; at: string; msg: string }
/** A project with whatever GitHub could add to it. `live` is true when the fetch succeeded. */
export interface LiveProject extends Project { meta: RepoMeta | null; readme: string | null; langsLive: boolean }

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

export async function getLiveProject(p: Project, { readme = false } = {}): Promise<LiveProject> {
  const [meta, langs, md] = await Promise.all([getRepoMeta(p), getLanguages(p), readme ? getReadmeHtml(p) : Promise.resolve(null)]);
  return { ...p, meta, readme: md, langs: langs ?? p.langs, langsLive: langs !== null, live: meta?.homepage || p.live };
}
export async function getLiveProjects(): Promise<readonly LiveProject[]> {
  return Promise.all(projects.map((p) => getLiveProject(p)));
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
