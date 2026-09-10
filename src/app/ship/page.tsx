import type { Metadata } from "next";
import ShipLoader from "@/components/ship/ShipLoader";
import { getLastPush } from "@/lib/github";
import { person } from "@/data/portfolio";
import "@/styles/ship.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Flight deck",
  description: `Pilot ${person.name}'s projects as a solar system: eight planets, one per project, cut open to reveal what each is built from.`,
  alternates: { canonical: "/ship" },
  openGraph: { title: `Flight deck — ${person.name}`, description: "Eight projects as a solar system you fly through.", url: "/ship" },
};

export default async function ShipPage() {
  const lastPush = await getLastPush();
  return (
    <>
      {/* the deck is a canvas app; this keeps a crawlable, linkable summary in the HTML */}
      <h1 className="sr-only">{person.name} — flight deck</h1>
      <p className="sr-only">
        An interactive solar system of eight shipped projects. Prefer plain pages? <a href="/read">Read the résumé site</a>.
      </p>
      <ShipLoader lastPush={lastPush ? { repo: lastPush.repo, at: lastPush.at } : null} />
    </>
  );
}
