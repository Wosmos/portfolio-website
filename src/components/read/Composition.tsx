// Language composition: the bar and legend share their numbers with the planet's cutaway layers.

import { LANG_COLORS, type LangShare } from "@/data/portfolio";
import { hex } from "@/lib/text";

export function langsOf(langs: readonly LangShare[]): { n: string; v: number; share: number; c: string }[] {
  const sorted = langs.slice().sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((a, l) => a + l[1], 0) || 1;
  return sorted.map(([n, v]) => ({ n, v, share: v / total, c: hex(LANG_COLORS[n] ?? LANG_COLORS.Other ?? 0xededed) }));
}

export default function Composition({ langs, legend = true }: { langs: readonly LangShare[]; legend?: boolean }) {
  const list = langsOf(langs);
  if (!list.length) return null;
  return (
    <>
      <div className="comp__bar" aria-label="Language composition">
        {list.map((l) => <i key={l.n} title={`${l.n} ${l.v.toFixed(1)}%`} style={{ flexBasis: `${(l.share * 100).toFixed(2)}%`, background: l.c }} />)}
      </div>
      {legend && (
        <div className="comp__legend">
          {list.map((l) => <span key={l.n} className={l.v < 1 ? "is-dim" : undefined} style={{ "--c": l.c } as React.CSSProperties}><b>{l.n}</b>{l.v.toFixed(1)}%</span>)}
        </div>
      )}
    </>
  );
}
