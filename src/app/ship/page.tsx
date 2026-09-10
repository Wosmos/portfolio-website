import type { Metadata } from "next";
import ShipLoader from "@/components/ship/ShipLoader";
import { getContributions, getLastPush } from "@/lib/github";
import { getEggFacts, getPerson, getProjects, getScene } from "@/lib/content";
import "@/styles/ship.css";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [person, projects] = await Promise.all([getPerson(), getProjects()]);
  return {
    title: "Flight deck",
    description: `Pilot ${person.name}'s projects as a solar system: ${projects.length} planets, one per project, cut open to reveal what each is built from.`,
    alternates: { canonical: "/ship" },
    openGraph: { title: `Flight deck — ${person.name}`, description: `${projects.length} projects as a solar system you fly through.`, url: "/ship" },
  };
}

export default async function ShipPage() {
  const [person, projects, scene, lastPush, activity, facts] = await Promise.all([
    getPerson(), getProjects(), getScene(), getLastPush(), getContributions(), getEggFacts(),
  ]);
  // the deck needs the plain project shape plus the orbit each one sits on
  const bodies = projects.map((p) => ({
    id: p.id, title: p.title, tagline: p.tagline, description: p.description, stack: p.stack,
    category: p.category, context: p.context, status: p.status, year: p.year, weight: p.weight,
    github: p.github, live: p.live, langs: p.langs, planet: p.planet,
  }));
  const orbits = projects.map((p) => p.orbit);
  return (
    <>
      {/* the deck is a canvas app; this keeps a crawlable, linkable summary in the HTML */}
      <h1 className="sr-only">{person.name} — flight deck</h1>
      <p className="sr-only">
        An interactive solar system of the projects listed on the reading site. Prefer plain pages? <a href="/read">Read the résumé site</a>.
      </p>
      <ShipLoader lastPush={lastPush ? { repo: lastPush.repo, at: lastPush.at } : null} projects={bodies} orbits={orbits} scene={scene} activity={activity} facts={facts} />
    </>
  );
}
