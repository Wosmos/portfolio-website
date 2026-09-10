import type { Metadata } from "next";
import Link from "next/link";
import ShipLoader from "@/components/ship/ShipLoader";
import { getContributions, getLastPush, getRepoStars } from "@/lib/github";
import { getEggFacts, getPerson, getProjects, getScene } from "@/lib/content";
import { SITE_URL } from "@/data/portfolio";
import { absoluteUrl, clampDescription, SITE_NAME } from "@/lib/seo";
import "@/styles/ship.css";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [person, projects] = await Promise.all([getPerson(), getProjects()]);
  const title = `Flight deck — ${person.name}`;
  const description = clampDescription(
    `${projects.length} projects as a solar system: one planet each, cut open to show what it is built from. The same work reads as plain pages at /read.`,
  );
  return {
    title: "Flight deck",
    description,
    alternates: { canonical: "/ship" },
    openGraph: { type: "website", url: "/ship", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ShipPage() {
  const [person, projects, scene, lastPush, activity, facts, repoStars] = await Promise.all([
    getPerson(), getProjects(), getScene(), getLastPush(), getContributions(), getEggFacts(), getRepoStars(),
  ]);
  // the deck needs the plain project shape plus the orbit each one sits on
  const bodies = projects.map((p) => ({
    id: p.id, title: p.title, tagline: p.tagline, description: p.description, stack: p.stack,
    category: p.category, context: p.context, status: p.status, year: p.year, weight: p.weight,
    github: p.github, live: p.live, langs: p.langs, planet: p.planet,
  }));
  const orbits = projects.map((p) => p.orbit);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${absoluteUrl("/ship")}#app`,
        name: `${SITE_NAME} flight deck`,
        url: absoluteUrl("/ship"),
        applicationCategory: "BrowserApplication",
        browserRequirements: "Requires JavaScript and WebGL",
        description: `${projects.length} projects flown as a solar system, one planet per project.`,
        inLanguage: "en",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        author: { "@type": "Person", name: person.fullName, url: SITE_URL },
        about: projects.map((p) => ({
          "@type": "SoftwareSourceCode", name: p.title, description: p.tagline,
          url: absoluteUrl(`/read/projects/${p.id}`), codeRepository: p.github,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/read` },
          { "@type": "ListItem", position: 2, name: "Flight deck", item: absoluteUrl("/ship") },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* the deck is a canvas app, so the page keeps its heading, its summary and a way out in the HTML:
          a crawler that cannot run WebGL still reads what this is and follows it to every project page */}
      <div className="sr-only">
        <h1>{person.name} — flight deck</h1>
        <p>
          {`An interactive solar system of the ${projects.length} projects listed on the reading site: one planet per project, `}
          {`each cut open to show the languages it is built from. It needs WebGL. Prefer plain pages?`}
        </p>
        <nav aria-label="Plain pages for every project">
          <ul>
            <li><Link href="/read" prefetch={false}>Read the résumé site — experience, skills, education</Link></li>
            <li><Link href="/read/projects" prefetch={false}>{`All ${projects.length} projects`}</Link></li>
            {/* prefetch off: these are a crawler's way out, not something a pilot is about to click */}
            {projects.map((p) => (
              <li key={p.id}><Link href={`/read/projects/${p.id}`} prefetch={false}>{`${p.title} — ${p.tagline}`}</Link></li>
            ))}
            <li><Link href="/read/contact" prefetch={false}>Contact</Link></li>
            <li><a href={person.cv}>Résumé (PDF)</a></li>
          </ul>
        </nav>
      </div>
      <ShipLoader lastPush={lastPush ? { repo: lastPush.repo, at: lastPush.at } : null} projects={bodies} orbits={orbits} scene={scene} activity={activity} facts={facts} repoStars={repoStars} />
    </>
  );
}
