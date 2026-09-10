"use client";
// Skills as a console matrix. Hovering a token shows which projects use it (from the stack and the
// GitHub languages) and lights those cards in the bento, dimming the rest; clicking pins the choice.

import { useMemo, useState } from "react";
import Link from "next/link";
import { projects, skills, type Project } from "@/data/portfolio";
import { pad2 } from "@/lib/text";

const norm = (x: string): string => x.toLowerCase().replace(/\s*\(.*?\)/g, "").replace(/\.js$/, "").replace(/\s+\d+$/, "").trim();

function usedIn(skill: string): readonly Project[] {
  const k = norm(skill);
  return projects.filter((p) =>
    [...p.stack, ...p.langs.map((l) => l[0])].some((t) => {
      const n = norm(t);
      return n === k || n.startsWith(`${k} `) || k.startsWith(`${n} `) || (k === "react" && n.startsWith("next")) || (k === "node" && n.startsWith("node"));
    }),
  );
}

interface Token { skill: string; group: string; n: number; used: readonly Project[] }

/** Cross-highlighting reaches the server-rendered bento cards, which are outside this component. */
function paintCards(used: readonly string[] | null): void {
  for (const card of document.querySelectorAll<HTMLElement>(".bento .proj__card")) {
    const id = card.querySelector<HTMLCanvasElement>("canvas[data-planet]")?.dataset.planet;
    const match = Boolean(used && id && used.includes(id));
    card.classList.toggle("is-match", match);
    card.classList.toggle("is-dim", Boolean(used) && !match);
  }
}

export default function SkillsMatrix() {
  const { rows, total } = useMemo(() => {
    let n = 0;
    const rows = skills.map((g) => ({ group: g.group, tokens: g.items.map((skill): Token => ({ skill, group: g.group, n: ++n, used: usedIn(skill) })) }));
    return { rows, total: n };
  }, []);
  const [active, setActive] = useState<Token | null>(null);
  const [pinned, setPinned] = useState<Token | null>(null);
  const shown = active ?? pinned;
  const langCount = skills.find((g) => g.group === "languages")?.items.length ?? 0;

  const show = (t: Token | null): void => { setActive(t); paintCards(t ? t.used.map((p) => p.id) : null); };

  return (
    <div className="skills">
      <div className="skills__matrix">
        <div className="sk__head"><span>›</span> skills --list <span className="sk__cur" /></div>
        {rows.map((row) => (
          <div className="sk__row" key={row.group}>
            <span className="sk__g">{row.group}</span>
            <div className="sk__toks">
              {row.tokens.map((t) => (
                <button
                  key={t.skill}
                  type="button"
                  className={`tok${t.used.length ? " has-use" : ""}${shown?.skill === t.skill ? " is-on" : ""}`}
                  onPointerEnter={() => show(t)}
                  onPointerLeave={() => show(pinned)}
                  onClick={() => { const next = pinned?.skill === t.skill ? null : t; setPinned(next); show(next); }}
                >
                  <i>{pad2(t.n)}</i><span>{t.skill}</span>{t.used.length > 0 && <em>{t.used.length}</em>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <aside className="sf sf--thin skills__read">
        <div className="sf__in">
          <span className="k">readout</span>
          <b className="skr__name">{shown ? shown.skill : "hover a skill"}</b>
          <span className="skr__g">{shown?.group ?? ""}</span>
          <div className="skr__used">
            {shown && (shown.used.length > 0
              ? <><span className="k">used in</span>{shown.used.map((p) => <Link key={p.id} href={`/read/projects/${p.id}`}>{p.title}<small>{p.tagline}</small></Link>)}</>
              : <span className="k">client work · not in a public repo</span>)}
          </div>
          <div className="skr__stats">
            <span><b>{total}</b> technologies</span><span><b>{langCount}</b> languages</span><span><b>{skills.length}</b> groups</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
