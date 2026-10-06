import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repoSlug, SITE_URL, type Highlight } from "@/data/portfolio";
import { getPerson, getProject, getProjects, highlightOf, type ContentProject } from "@/lib/content";
import { getLiveProject } from "@/lib/github";
import { clampDescription } from "@/lib/seo";
import { projectShot } from "@/lib/shots";
import { ago, hostOf, pad2 } from "@/lib/text";
import Composition, { langsOf } from "@/components/read/Composition";
import { Chips } from "@/components/read/ProjectCard";
import FlyLink from "@/components/read/FlyLink";
import ProjectShot from "@/components/read/ProjectShot";

// No window: the page is rebuilt when a save or the publish button says so, not on a timer.
export const revalidate = false;
// no `dynamicParams = false`: a project added in the admin has to render before the next build,
// and an unknown slug still 404s below.

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await getProjects()).map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return { title: "Project not found", robots: { index: false } };
  const title = `${p.title} · ${p.tagline}`;
  const description = clampDescription(p.description);
  return {
    title: p.title,
    description,
    alternates: { canonical: `/read/projects/${p.id}` },
    openGraph: { url: `/read/projects/${p.id}`, title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The hero's image column: half the 1160px page beside the text, the full width once the hero stacks at 960px. */
const SHOT_SIZES = "(max-width: 960px) calc(100vw - 32px), (max-width: 1256px) 50vw, 600px";

function links(p: ContentProject, h: Highlight | undefined): (readonly [string, string])[] {
  return [
    // a private repository's url 404s for a visitor, so it is not offered as a link at all
    ...(p.sourcePrivate ? [] : [["source on github", p.github] as const]),
    ...(p.live ? [["open live", p.live] as const] : []),
    ...(h?.extraLinks ?? []).map(([n, u]) => [n.toLowerCase(), u] as const),
  ];
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [projects, person] = await Promise.all([getProjects(), getPerson()]);
  const base = projects.find((q) => q.id === slug);
  if (!base) notFound();

  const p = await getLiveProject(base, { readme: true });
  const i = projects.findIndex((q) => q.id === base.id);
  const h = highlightOf(base);
  const prev = projects[(i - 1 + projects.length) % projects.length] ?? base;
  const next = projects[(i + 1) % projects.length] ?? base;
  const top = langsOf(p.langs)[0];
  const shot = projectShot(base);
  const created = p.meta ? new Date(p.meta.created).getFullYear() : p.year;
  // the row can switch the live readme off, in which case there is nothing missing to explain
  const missingReason = !base.useLiveReadme
    ? "readme switched off for this project"
    : p.meta === null ? "repo is private or github is unreachable" : "no readme on github";

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/read` },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE_URL}/read/projects` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${SITE_URL}/read/projects/${p.id}` },
    ],
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: p.title,
    description: p.description,
    codeRepository: p.github,
    url: `${SITE_URL}/read/projects/${p.id}`,
    programmingLanguage: p.langs.map((l) => l[0]),
    author: { "@type": "Person", name: person.fullName, url: SITE_URL },
    ...(p.live ? { sameAs: p.live } : {}),
  };

  return (
    <article className="pj" style={{ marginTop: 0 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Link className="back" href="/read/projects">← all projects</Link>

      <div className="pj__hero">
        <div className="pj__text">
          <p className="k">project {pad2(i + 1)} of {pad2(projects.length)} · {p.category} · {p.context}</p>
          <h1 style={{ marginTop: 12 }}><span className="name">{p.title}</span></h1>
          <p className="pj__tag">{h?.heading ?? p.tagline}</p>
          <div className="pj__meta">
            <span className={p.live ? "on" : undefined}>{p.live ? `● live · ${hostOf(p.live)}` : p.status ?? "source only"}</span>
            {created && <span>since {created}</span>}
            {p.meta && <span>pushed {ago(p.meta.pushed)}</span>}
            {p.meta && p.meta.stars > 0 && <span>★ {p.meta.stars}</span>}
          </div>
          <p className="pj__desc">{p.description}</p>
          <div className="pj__actions">
            {links(base, h).map(([label, url], k) => (
              <a key={url} className={`sf sf--btn${k === 0 ? "" : " sf--ghost"}`} href={url} target="_blank" rel="noopener"><span className="sf__in">{label} ↗</span></a>
            ))}
            <FlyLink className="sf sf--btn is-mg" to={p.id}><span className="sf__in">fly there ↗</span></FlyLink>
          </div>
        </div>
        <figure className="pj__shot">
          {/* the page's largest image, so it is fetched first; a live site makes it a link there */}
          <ProjectShot project={p} src={shot} priority sizes={SHOT_SIZES} href={p.live ?? undefined} />
          {shot && <figcaption className="k">{p.live ? <>screenshot · {hostOf(p.live)} ↗</> : "screenshot"}</figcaption>}
        </figure>
      </div>

      <section className="pj__about">
        <div className="sec__h">
          <h2 data-n="01">About</h2><i />
          <small>{p.readme ? "from the readme on github" : h ? `from the résumé · ${missingReason}` : missingReason}</small>
        </div>
        <div className="about">
          <div className="about__body prose">
            {h && <ul className={p.readme ? "about__hl" : undefined}>{h.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
            {!h && !p.readme && <p>{p.description}</p>}
            {/* mdLite escapes the source before adding its own markup, so this is safe to inline */}
            {p.readme && <div dangerouslySetInnerHTML={{ __html: p.readme }} />}
          </div>
          <aside className="about__facts">
            <div className="sf sf--thin card">
              <div className="sf__in">
                <span className="k" data-cipher>facts</span>
                <div className="facts">
                  <div><span>status</span><b className={p.live ? "on" : undefined}>{p.live ? "live" : p.status ?? "source only"}</b></div>
                  <div><span>category</span><b>{p.category} · {p.context}</b></div>
                  <div><span>repository</span><b>{base.sourcePrivate ? `${repoSlug(p)} · private` : <a href={p.github} target="_blank" rel="noopener">{repoSlug(p)} ↗</a>}</b></div>
                  <div><span>created</span><b>{created ?? "—"}</b></div>
                  <div><span>last push</span><b>{p.meta ? ago(p.meta.pushed) : "private repo"}</b></div>
                  <div><span>stars</span><b>{p.meta ? p.meta.stars : "—"}</b></div>
                  <div><span>top language</span><b>{top ? `${top.n} · ${top.v.toFixed(1)}%` : "—"}</b></div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section>
        <div className="sec__h">
          <h2 data-n="02">Built with</h2><i />
          <small>{p.langsLive ? "github language bytes · live" : "github language bytes · stored"}</small>
        </div>
        <div className="built">
          <div className="sf sf--thin card"><div className="sf__in"><span className="k" data-cipher>composition</span><Composition langs={p.langs} /></div></div>
          <div className="sf sf--thin card"><div className="sf__in"><span className="k" data-cipher>stack</span><div className="chips"><Chips items={h?.tech ?? p.stack} /></div></div></div>
        </div>
      </section>

      <nav className="pj__nav" aria-label="Other projects">
        <Link href={`/read/projects/${prev.id}`}>← {prev.title}</Link>
        <Link href={`/read/projects/${next.id}`}>{next.title} →</Link>
      </nav>
    </article>
  );
}
