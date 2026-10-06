// One project as a card: a screenshot of the product on top (beside the text on the home page's lead
// card), then what it is. Server-rendered, so it is crawlable and needs no script at all.

import Link from "next/link";
import { pad2 } from "@/lib/text";
import { projectShot } from "@/lib/shots";
import type { Project } from "@/data/portfolio";
import ProjectShot from "./ProjectShot";

export function Chips({ items }: { items: readonly string[] }) {
  return <>{items.map((s) => <span key={s} className="sf sf--chip"><span className="sf__in">{s}</span></span>)}</>;
}

/**
 * Where the card sits, which decides how wide its screenshot renders. Each `sizes` follows the grid in
 * read.css: the page column is 1160px at most, padded by clamp(16px, 4vw, 48px), and a card's own
 * padding takes 44px off the image.
 * - list: /read/projects, two columns, one under 960px
 * - lead: the first bento card, text beside a 46% image column, stacked under 720px
 * - tile: the other bento cards, three columns, one under 960px
 */
export type CardLayout = "list" | "lead" | "tile";
const SIZES: Readonly<Record<CardLayout, string>> = {
  list: "(max-width: 960px) calc(100vw - 76px), (max-width: 1256px) calc(50vw - 70px), 530px",
  lead: "(max-width: 720px) calc(100vw - 76px), (max-width: 1256px) 44vw, 520px",
  tile: "(max-width: 960px) calc(100vw - 76px), (max-width: 1256px) calc(31vw - 50px), 340px",
};

export default function ProjectCard({ p, index, layout = "list", priority = false, eager = false }: {
  p: Project & { coverImage?: string }; index: number; layout?: CardLayout;
  /** Preloaded at high priority: the first screen's largest image. */
  priority?: boolean;
  /** Fetched at high priority without a preload hint: in the first screen on a desktop, lower on a phone. */
  eager?: boolean;
}) {
  const top = p.langs[0];
  // the list page has no section headings between its h1 and the cards; the home page puts them under an h2
  const Title = layout === "list" ? "h2" : "h3";
  return (
    <li className="sf proj__card" data-project={p.id}>
      <Link className="sf__in" href={`/read/projects/${p.id}`}>
        <ProjectShot project={p} src={projectShot(p)} sizes={SIZES[layout]} priority={priority} eager={eager} />
        <span className="proj__body">
          <span className="proj__t">
            <span className="proj__n">project {pad2(index + 1)} · {p.category}</span>
            <Title className="proj__h">{p.title}</Title>
            <span>{p.tagline}</span>
          </span>
          <span className="proj__d">{p.description}</span>
          <span className="proj__chips"><Chips items={p.stack} /></span>
          <span className="proj__foot">
            <span className={p.live ? "on" : undefined}>{p.live ? "● live" : p.status ?? "source only"}</span>
            <span>{top ? `${top[0]} ${top[1].toFixed(0)}%` : ""}</span>
            <span className="fly">open →</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
