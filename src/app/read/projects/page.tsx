import type { Metadata } from "next";
import { projects } from "@/data/portfolio";
import PlanetCanvases from "@/components/read/PlanetCanvases";
import ProjectCard from "@/components/read/ProjectCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Projects",
  description: "All eight projects: what each one is, what it is built from, and where it runs.",
  alternates: { canonical: "/read/projects" },
  openGraph: { url: "/read/projects", title: "Projects", description: "All eight projects: what each one is, what it is built from, and where it runs." },
};

export default function ProjectsPage() {
  return (
    <>
      <section className="hero pj" style={{ marginTop: 0, gridTemplateColumns: "1fr" }}>
        <div>
          <p className="k">08 planets · one per orbit · languages from github</p>
          <h1 style={{ marginTop: 12 }}><span className="name">Projects</span></h1>
          <p className="hero__p">Everything I have shipped or am shipping, ordered like the solar system in the flight deck: the biggest body closest to the sun. Drag a planet to turn it. Open one for the full breakdown.</p>
        </div>
      </section>
      <section style={{ marginTop: 40 }}>
        <ol className="proj">
          {projects.map((p, i) => <ProjectCard key={p.id} p={p} index={i} />)}
        </ol>
      </section>
      <PlanetCanvases />
    </>
  );
}
