import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/data/portfolio";
import { getEducation, getExperience, getFeatured, getPerson, getProjects, getSkills, getTestimonials } from "@/lib/content";
import { getLastPush } from "@/lib/github";
import { ago, monthsBetween, pad2, spanLabel, ym } from "@/lib/text";
import ContactForm from "@/components/read/ContactForm";
import LocalTime from "@/components/read/LocalTime";
import PlanetCanvases from "@/components/read/PlanetCanvases";
import PlanetStrip from "@/components/read/PlanetStrip";
import ProjectCard, { Chips } from "@/components/read/ProjectCard";
import SkillsMatrix from "@/components/read/SkillsMatrix";
import FlyLink from "@/components/read/FlyLink";
import ResumeLink from "@/components/read/ResumeLink";
import { toMatrixProjects, toProjects } from "@/components/read/project-props";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const person = await getPerson();
  const title = `${person.name} — software engineer`;
  return {
    title,
    description: person.metaDescription,
    alternates: { canonical: "/read" },
    openGraph: { url: "/read", title, description: person.metaDescription },
  };
}

export default async function ReadHome() {
  const [person, projects, featuredProjects, experience, skills, education, testimonials, lastPush] = await Promise.all([
    getPerson(), getProjects(), getFeatured(), getExperience(), getSkills(), getEducation(), getTestimonials(), getLastPush(),
  ]);
  const tel = person.phone.replace(/\s/g, "");
  const firstStart = experience.map((e) => e.start).sort()[0] ?? "2022-10";
  const years = Math.floor(monthsBetween(firstStart, null) / 12);
  const liveCount = projects.filter((p) => p.live).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: person.fullName,
        alternateName: person.name,
        jobTitle: "Software Engineer",
        description: person.summary,
        url: SITE_URL,
        email: `mailto:${person.email}`,
        telephone: person.phone,
        address: { "@type": "PostalAddress", addressLocality: "Karachi", addressCountry: "PK" },
        sameAs: [person.github, person.linkedin, person.hashnode],
        knowsAbout: skills.flatMap((g) => g.items).slice(0, 24),
        alumniOf: education.map((e) => ({ "@type": "EducationalOrganization", name: e.school })),
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "wosmo", publisher: { "@id": `${SITE_URL}/#person` } },
    ],
  };

  const proof: { n: number; label: string; sub: string }[] = [
    { n: years, label: "years building", sub: `since ${ym(firstStart)}` },
    { n: projects.length, label: "projects", sub: "all on github" },
    { n: liveCount, label: "live deployments", sub: "open in a tab" },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero" style={{ marginTop: 0 }}>
        <div>
          <p className="k"><i className="live" />open to remote roles · <LocalTime tz={person.tz} location={person.location} /></p>
          <h1 style={{ marginTop: 16 }}><span className="name">{person.name}</span><span className="sub">software engineer · go · systems · next.js</span></h1>
          <p className="hero__p">{person.summary}</p>
          <div className="hero__row">
            <Link className="sf sf--btn" href="/read/contact"><span className="sf__in">get in touch</span></Link>
            <ResumeLink className="sf sf--btn" href={person.cv} from="hero"><span className="sf__in">résumé pdf ↓</span></ResumeLink>
            <FlyLink className="sf sf--btn is-mg"><span className="sf__in">fly the flight deck ↗</span></FlyLink>
          </div>
          <div className="hero__meta">
            <span>{person.location}</span>
            <a href={`mailto:${person.email}`}>{person.email}</a>
            <a href={`tel:${tel}`}>{person.phone}</a>
            <a href={person.github} target="_blank" rel="noopener">github/Wosmos ↗</a>
            <a href={person.linkedin} target="_blank" rel="noopener">linkedin ↗</a>
          </div>
        </div>
        <aside className="hero__side" aria-label="At a glance">
          <div className="proof">
            {proof.map((p) => (
              <div className="sf sf--thin" key={p.label}>
                <div className="sf__in"><b data-count={p.n}>0</b><span>{p.label}</span><small>{p.sub}</small></div>
              </div>
            ))}
          </div>
          <div className="sf sf--thin status">
            <div className="sf__in">
              <span className="k">status</span>
              <div className="status__row"><span>availability</span><b className="on">open · remote</b></div>
              <div className="status__row"><span>base</span><b>{person.location}</b></div>
              <div className="status__row"><span>last push</span><b>{lastPush ? <a href={`https://github.com/Wosmos/${lastPush.repo}`} target="_blank" rel="noopener" title={lastPush.msg}>{lastPush.repo} · {ago(lastPush.at)}</a> : "offline"}</b></div>
              <div className="status__row"><span>github</span><b><a href={person.github} target="_blank" rel="noopener">Wosmos ↗</a></b></div>
              <PlanetStrip projects={toProjects(projects)} />
            </div>
          </div>
        </aside>
      </section>

      <section id="projects">
        <div className="sec__h">
          <h2 data-n="01">Selected projects</h2><i />
          <small>the real planets · drag to turn · <Link href="/read/projects">all {projects.length} →</Link></small>
        </div>
        <ol className="proj bento">
          {featuredProjects.map((p) => <ProjectCard key={p.id} p={p} index={projects.findIndex((q) => q.id === p.id)} />)}
          <li className="bento__more">
            <span>{pad2(projects.length - featuredProjects.length)} more on the projects page</span>
            <Link href="/read/projects">all {pad2(projects.length)} projects →</Link>
          </li>
        </ol>
      </section>

      <section id="experience">
        <div className="sec__h"><h2 data-n="02">Experience</h2><i /><small>{experience.length} roles · since {ym(firstStart)}</small></div>
        <ol className="xp">
          {experience.map((e) => (
            <li className="xp__i" key={`${e.company}-${e.start}`}>
              <div className="xp__when"><b>{ym(e.start)}</b><span>– {ym(e.end)}</span><i>{spanLabel(monthsBetween(e.start, e.end))}</i></div>
              <div>
                <div className="xp__h"><h3 data-cipher>{e.title}</h3><span>{e.company} · {e.location}</span></div>
                <ul className="xp__b">{e.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                <div className="xp__chips"><Chips items={e.stack} /></div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="skills">
        <div className="sec__h"><h2 data-n="03">Technical skills</h2><i /><small>hover one · it lights up the projects that use it</small></div>
        <SkillsMatrix skills={skills} projects={toMatrixProjects(projects)} />
      </section>

      <section id="education">
        <div className="sec__h"><h2 data-n="04">Education</h2><i /><small /></div>
        <div className="edu">
          {education.map((e) => (
            <div className="sf sf--thin card" key={e.school}>
              <div className="sf__in"><h3>{e.degree}</h3><span>{e.school} · {e.start} – {e.end}</span><b>{e.grade}</b></div>
            </div>
          ))}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section id="testimonials">
          <div className="sec__h">
            <h2 data-n="05">What people say</h2><i />
            <small>{testimonials.some((t) => t.placeholder) ? "sample quotes · real ones go in the admin" : `${testimonials.length} references`}</small>
          </div>
          <div className="quotes">
            {testimonials.map((t) => (
              <figure className={`sf sf--thin quote${t.placeholder ? " is-sample" : ""}`} key={t.quote}>
                <div className="sf__in">
                  {t.placeholder && <span className="quote__tag">sample · replace</span>}
                  <span className="quote__mark" aria-hidden="true">&ldquo;</span>
                  <blockquote>{t.quote}</blockquote>
                  <figcaption>
                    {t.link ? <a href={t.link} target="_blank" rel="noopener"><b>{t.name}</b> ↗</a> : <b>{t.name}</b>}
                    <span>{t.role} · {t.company}</span>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section id="contact">
        <div className="sec__h"><h2 data-n="06">Contact</h2><i /><small>lands in my inbox · reply-to is you</small></div>
        <div className="contact">
          <div>
            <p className="contact__lead rv">Roles, contracts, or a question about one of the projects. I read everything and reply within a day.</p>
            <div className="contact__alt rv">
              <a href={`mailto:${person.email}`}><span>email</span><span>{person.email}</span></a>
              <a href={`tel:${tel}`}><span>phone</span><span>{person.phone}</span></a>
              <a href={person.linkedin} target="_blank" rel="noopener"><span>linkedin</span><span>↗</span></a>
              <a href={person.github} target="_blank" rel="noopener"><span>github</span><span>Wosmos ↗</span></a>
            </div>
          </div>
          <div className="rv"><ContactForm /></div>
        </div>
      </section>

      <PlanetCanvases projects={toProjects(projects)} />
    </>
  );
}
