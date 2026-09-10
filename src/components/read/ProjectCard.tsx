// One project as a card with a planet canvas beside it. The canvas is filled in on the client by
// PlanetCanvases; the card itself is server-rendered so it is crawlable and works without WebGL.

import Link from "next/link";
import { pad2 } from "@/lib/text";
import { visibleMoons } from "@/lib/three/types";
import type { Project } from "@/data/portfolio";
import type { WithMoons } from "@/lib/three/types";

export function Chips({ items }: { items: readonly string[] }) {
  return <>{items.map((s) => <span key={s} className="sf sf--chip"><span className="sf__in">{s}</span></span>)}</>;
}

export default function ProjectCard({ p, index }: { p: Project & WithMoons; index: number }) {
  const top = p.langs[0];
  // the canvas draws these as specks orbiting the planet; without the count they read as noise
  const moons = visibleMoons(p.moons).length;
  return (
    <li className="sf proj__card has-planet">
      <Link className="sf__in" href={`/read/projects/${p.id}`}>
        <span className="proj__body">
          <span className="proj__t">
            <span className="proj__n">planet {pad2(index + 1)} · {p.category}{moons > 0 ? ` · ${pad2(moons)} moons` : ""}</span>
            <h3>{p.title}</h3>
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
        <canvas className="planet" data-planet={p.id} aria-label={`${p.title} planet`} />
      </Link>
    </li>
  );
}
