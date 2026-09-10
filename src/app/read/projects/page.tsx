import type { Metadata } from "next";
import { SITE_URL } from "@/data/portfolio";
import { getProjects } from "@/lib/content";
import { OG_SIZE } from "@/lib/seo";
import { pad2 } from "@/lib/text";
import PlanetCanvases from "@/components/read/PlanetCanvases";
import ProjectCard from "@/components/read/ProjectCard";
import { toProjects } from "@/components/read/project-props";

export const revalidate = 3600;

const DESCRIPTION = "Every project: what each one is, what it is built from, and where it runs.";

export const metadata: Metadata = {
  title: "Projects",
  description: DESCRIPTION,
  alternates: { canonical: "/read/projects" },
  // naming `openGraph` replaces the parent's whole object, so the root brand card is repeated here —
  // see the same note in src/app/read/page.tsx
  openGraph: { type: "website", url: "/read/projects", title: "Projects", description: DESCRIPTION, images: [{ url: "/opengraph-image", ...OG_SIZE, alt: "Projects" }] },
  twitter: { card: "summary_large_image", title: "Projects", description: DESCRIPTION, images: ["/opengraph-image"] },
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Projects",
    numberOfItems: projects.length,
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem", position: i + 1, name: p.title, description: p.tagline, url: `${SITE_URL}/read/projects/${p.id}`,
    })),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/read` },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE_URL}/read/projects` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <section className="hero pj" style={{ marginTop: 0, gridTemplateColumns: "1fr" }}>
        <div>
          <p className="k">{pad2(projects.length)} planets · one per orbit · languages from github</p>
          <h1 style={{ marginTop: 12 }}><span className="name">Projects</span></h1>
          <p className="hero__p">Everything I have shipped or am shipping, ordered like the solar system in the flight deck: the biggest body closest to the sun. Drag a planet to turn it. Open one for the full breakdown.</p>
        </div>
      </section>
      <section style={{ marginTop: 40 }}>
        <ol className="proj">
          {projects.map((p, i) => <ProjectCard key={p.id} p={p} index={i} />)}
        </ol>
      </section>
      <PlanetCanvases projects={toProjects(projects)} />
    </>
  );
}
