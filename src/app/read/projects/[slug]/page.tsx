import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { highlights, person, projects, projectById, repoSlug, SITE_URL, type Project } from "@/data/portfolio";
import { getLiveProject } from "@/lib/github";
import { ago, hostOf, pad2 } from "@/lib/text";
import Composition, { langsOf } from "@/components/read/Composition";
import PlanetCanvases from "@/components/read/PlanetCanvases";
import { Chips } from "@/components/read/ProjectCard";
import FlyLink from "@/components/read/FlyLink";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return projects.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = projectById(slug);
  if (!p) return { title: "Project not found", robots: { index: false } };
  const title = `${p.title} — ${p.tagline}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/read/projects/${p.id}` },
    openGraph: { url: `/read/projects/${p.id}`, title, description: p.description, type: "article" },
    twitter: { card: "summary_large_image", title, description: p.description },
  };
}

function links(p: Project): (readonly [string, string])[] {
  const h = highlights[p.id];
  return [
    ["source on github", p.github] as const,
    ...(p.live ? [["open live", p.live] as const] : []),
    ...(h?.extraLinks ?? []).map(([n, u]) => [n.toLowerCase(), u] as const),
  ];
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = projectById(slug);
  if (!base) notFound();

  const p = await getLiveProject(base, { readme: true });
  const i = projects.findIndex((q) => q.id === p.id);
  const h = highlights[p.id];
  const prev = projects[(i - 1 + projects.length) % projects.length] ?? p;
  const next = projects[(i + 1) % projects.length] ?? p;
  const top = langsOf(p.langs)[0];
  const created = p.meta ? new Date(p.meta.created).getFullYear() : p.year;
  const missingReason = p.meta === null ? "repo is private or github is unreachable" : "no readme on github";

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
      <Link className="back" href="/read/projects">← all projects</Link>

      <div className="pj__hero">
        <div className="pj__text">
          <p className="k">planet {pad2(i + 1)} of {pad2(projects.length)} · {p.category} · {p.context}</p>
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
            {links(p).map(([label, url], k) => (
              <a key={url} className={`sf sf--btn${k === 0 ? "" : " sf--ghost"}`} href={url} target="_blank" rel="noopener"><span className="sf__in">{label} ↗</span></a>
            ))}
            <FlyLink className="sf sf--btn is-mg" to={p.id}><span className="sf__in">fly there ↗</span></FlyLink>
          </div>
        </div>
        <div className="pj__planet">
          <div className="pj__stage">
            <canvas className="planet" data-planet={p.id} aria-label={`${p.title} planet`} />
            <span className="pj__stagek k">planet {pad2(i + 1)} · drag to turn</span>
            <span className="planet__hint" id="planet-hint">click the planet to see what it is made of</span>
            <button className="sf sf--btn pj__cut" id="cutbtn" type="button"><span className="sf__in">cut it open</span></button>
          </div>
          <div className="callouts callouts--grid" id="callouts" hidden />
        </div>
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
                  <div><span>repository</span><b><a href={p.github} target="_blank" rel="noopener">{repoSlug(p)} ↗</a></b></div>
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
          <small>{p.langsLive ? "github language bytes · live" : "github language bytes"} · same numbers as the planet&rsquo;s layers</small>
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

      <PlanetCanvases cutaway />
    </article>
  );
}
