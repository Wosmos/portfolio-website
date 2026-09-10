"use client";
// The traffic dashboard. One cached request to /api/admin/stats, drawn as SVG and CSS — no chart
// library, so the panel costs nothing to download.
//
// Everything here is defensive about the response: fields are optional, lists default to empty, and a
// section that has no data hides itself rather than drawing an empty frame.

import { useEffect, useMemo, useState } from "react";
import { useCached } from "@/lib/admin-cache";
import { Empty, Skeleton } from "../kit";

/** Local, so this panel does not depend on the shared kit's tooltip landing first. */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return <span className="dtip" tabIndex={0} data-tip={text} aria-label={text}>{children}<i aria-hidden="true">?</i></span>;
}

interface Slice { key: string; count: number }
interface Day { day: string; pageviews: number; visits: number; uniques: number }
interface RecentVisitor {
  id: string; lastSeen: string; country?: string; city?: string; device?: string; browser?: string;
  visits?: number; pageviews?: number; engagedSeconds?: number; door?: string; converted?: boolean;
  score?: number; intent?: string; isOwner?: boolean;
}
interface Stats {
  days?: number;
  totals?: { visitors?: number; sessions?: number; pageviews?: number; events?: number; converted?: number; engagedSeconds?: number };
  series?: Day[];
  topPaths?: Slice[]; topReferrers?: Slice[]; topCountries?: Slice[];
  devices?: Slice[]; browsers?: Slice[]; doors?: Slice[];
  eventTargets?: (Slice & { name?: string })[];
  intents?: Slice[];
  recentVisitors?: RecentVisitor[];
}

const RANGES: readonly { d: number; label: string }[] = [
  { d: 7, label: "7 days" }, { d: 30, label: "30 days" }, { d: 90, label: "90 days" }, { d: 365, label: "1 year" },
];

const INTENT_COLOUR: Readonly<Record<string, string>> = {
  hot: "#ff2bd6", warm: "#ffb547", curious: "#00e5ff", passing: "rgba(242,245,255,.35)", bot: "rgba(255,77,94,.5)",
};

const fmt = (n: number): string => (n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const mins = (s: number): string => (s < 90 ? `${Math.round(s)}s` : s < 5400 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`);
const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 100) : 0);
const dayLabel = (iso: string): string => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Second half of the window against the first, which is the only honest trend a single range gives. */
function trend(series: readonly Day[], pick: (d: Day) => number): number | null {
  if (series.length < 6) return null;
  const half = Math.floor(series.length / 2);
  const before = series.slice(0, half).reduce((t, d) => t + pick(d), 0);
  const after = series.slice(half).reduce((t, d) => t + pick(d), 0);
  if (before === 0) return after === 0 ? 0 : 100;
  return Math.round(((after - before) / before) * 100);
}

function Kpi({ value, label, sub, delta, tip }: { value: string; label: string; sub?: string; delta?: number | null; tip?: string }) {
  return (
    <div className="sf sf--thin stat">
      <div className="sf__in">
        <b>{value}</b>
        <span>{tip ? <Tip text={tip}>{label}</Tip> : label}</span>
        <small>
          {sub}
          {delta !== null && delta !== undefined && (
            <i className={`trend${delta > 0 ? " up" : delta < 0 ? " down" : ""}`}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {Math.abs(delta)}%</i>
          )}
        </small>
      </div>
    </div>
  );
}

/** Pageviews as an area, visits as a line, with a hover readout. No library: it is 40 lines of SVG. */
function Chart({ series }: { series: readonly Day[] }) {
  const [at, setAt] = useState<number | null>(null);
  const W = 1000, H = 220, pad = 6;
  const peak = Math.max(1, ...series.map((d) => Math.max(d.pageviews, d.visits)));
  const x = (i: number): number => (series.length < 2 ? W / 2 : pad + (i / (series.length - 1)) * (W - pad * 2));
  const y = (v: number): number => H - pad - (v / peak) * (H - pad * 2);
  const line = (pick: (d: Day) => number): string => series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(d)).toFixed(1)}`).join(" ");
  const area = `${line((d) => d.pageviews)} L${x(series.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const hovered = at !== null ? series[at] : undefined;

  return (
    <div className="chart">
      <div className="chart__head">
        <p className="panel__h">traffic</p>
        <span className="chart__key"><i className="k-pv" />pages<i className="k-v" />visits</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Pages and visits per day">
        <defs>
          <linearGradient id="pvfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00e5ff" stopOpacity=".45" />
            <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(242,245,255,.07)" />)}
        <path d={area} fill="url(#pvfill)" />
        <path d={line((d) => d.pageviews)} fill="none" stroke="#00e5ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={line((d) => d.visits)} fill="none" stroke="#ff2bd6" strokeWidth="1.4" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        {at !== null && <line x1={x(at)} x2={x(at)} y1="0" y2={H} stroke="rgba(0,229,255,.5)" vectorEffect="non-scaling-stroke" />}
        {series.map((d, i) => (
          <rect
            key={d.day} x={x(i) - (W / Math.max(1, series.length)) / 2} y="0"
            width={W / Math.max(1, series.length)} height={H} fill="transparent"
            onPointerEnter={() => setAt(i)} onPointerLeave={() => setAt(null)}
          />
        ))}
      </svg>
      <p className="chart__foot">
        {hovered
          ? <><b>{dayLabel(hovered.day)}</b> · {hovered.pageviews} pages · {hovered.visits} visits · {hovered.uniques} people</>
          : <>{series.length ? `${dayLabel(series[0]?.day ?? "")} → ${dayLabel(series[series.length - 1]?.day ?? "")}` : "no days yet"} · hover a day</>}
      </p>
    </div>
  );
}

function Bars({ title, rows = [], empty, tip }: { title: string; rows?: readonly Slice[]; empty: string; tip?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="sf sf--thin">
      <div className="sf__in" style={{ padding: "14px 16px" }}>
        <p className="panel__h">{tip ? <Tip text={tip}>{title}</Tip> : title}</p>
        {rows.length ? (
          <div className="bars">
            {rows.slice(0, 8).map((r) => (
              <div key={r.key} style={{ "--w": `${(r.count / max) * 100}%` } as React.CSSProperties}>
                <span title={r.key}>{r.key || "direct"}</span><b>{fmt(r.count)}</b>
              </div>
            ))}
          </div>
        ) : <p className="adm__hint" style={{ margin: 0 }}>{empty}</p>}
      </div>
    </div>
  );
}

/** One horizontal bar split by share — devices, doors, browsers. */
function Split({ title, rows = [] }: { title: string; rows?: readonly Slice[] }) {
  const total = rows.reduce((t, r) => t + r.count, 0);
  if (!total) return null;
  const shades = ["#00e5ff", "#ff2bd6", "#ffb547", "#6ee7ff", "rgba(242,245,255,.3)"];
  return (
    <div className="sf sf--thin">
      <div className="sf__in" style={{ padding: "14px 16px" }}>
        <p className="panel__h">{title}</p>
        <div className="share">
          {rows.map((r, i) => (
            <i key={r.key} style={{ width: `${pct(r.count, total)}%`, background: shades[i % shades.length] }} title={`${r.key || "unknown"} · ${r.count}`} />
          ))}
        </div>
        <div className="share__key">
          {rows.map((r, i) => (
            <span key={r.key}><i style={{ background: shades[i % shades.length] }} />{r.key || "unknown"} <b>{pct(r.count, total)}%</b></span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** visits → a project → the contact page → a message. Derived from the paths, labelled as such. */
function Funnel({ stats }: { stats: Stats }) {
  const paths = stats.topPaths ?? [];
  const sum = (test: (p: string) => boolean): number => paths.filter((p) => test(p.key)).reduce((t, p) => t + p.count, 0);
  const steps: readonly { key: string; n: number; hint: string }[] = [
    { key: "arrived", n: stats.totals?.sessions ?? 0, hint: "visits in this window" },
    { key: "read a project", n: sum((p) => p.startsWith("/read/projects/")), hint: "opened a case study" },
    { key: "reached contact", n: sum((p) => p.startsWith("/read/contact")), hint: "opened the contact page" },
    { key: "wrote in", n: stats.totals?.converted ?? 0, hint: "sent a message" },
  ];
  const top = Math.max(1, steps[0]?.n ?? 1);
  if (top <= 1 && steps.every((s) => s.n === 0)) return null;
  return (
    <div className="sf sf--thin">
      <div className="sf__in" style={{ padding: "14px 16px" }}>
        <p className="panel__h"><Tip text="Each step counts pageviews in this window, not one person walking the whole path.">the path to a message</Tip></p>
        <div className="funnel">
          {steps.map((s, i) => (
            <div key={s.key} style={{ "--w": `${Math.max(3, pct(s.n, top))}%` } as React.CSSProperties}>
              <span>{s.key}</span>
              <i />
              <b>{fmt(s.n)}<em>{i === 0 ? "" : ` ${pct(s.n, top)}%`}</em></b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Only rendered once the tracker starts scoring; until then the section is simply absent. */
function Intent({ rows, recent }: { rows?: readonly Slice[]; recent?: readonly RecentVisitor[] }) {
  const derived = useMemo<readonly Slice[]>(() => {
    if (rows?.length) return rows;
    const people = (recent ?? []).filter((v) => !v.isOwner && typeof v.intent === "string");
    if (!people.length) return [];
    const tally = new Map<string, number>();
    for (const v of people) tally.set(v.intent ?? "passing", (tally.get(v.intent ?? "passing") ?? 0) + 1);
    return [...tally].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }, [rows, recent]);
  if (!derived.length) return null;
  const total = derived.reduce((t, r) => t + r.count, 0);
  return (
    <div className="sf sf--thin">
      <div className="sf__in" style={{ padding: "14px 16px" }}>
        <p className="panel__h"><Tip text="Worked out from behaviour: contact, résumé, depth, return visits, project interest.">how interested they were</Tip></p>
        <div className="share">
          {derived.map((r) => <i key={r.key} style={{ width: `${pct(r.count, total)}%`, background: INTENT_COLOUR[r.key] ?? INTENT_COLOUR.passing }} title={`${r.key} · ${r.count}`} />)}
        </div>
        <div className="share__key">
          {derived.map((r) => <span key={r.key}><i style={{ background: INTENT_COLOUR[r.key] ?? INTENT_COLOUR.passing }} />{r.key} <b>{r.count}</b></span>)}
        </div>
      </div>
    </div>
  );
}

export default function OverviewPanel() {
  const [days, setDays] = useState(30);
  // "here now" needs a clock, and a clock cannot be read during render; it ticks instead
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const { data, loading, refreshing, error, reload } = useCached<Stats>(`stats:${days}`, `/api/admin/stats?days=${days}`, 60_000);

  if (loading) return <Skeleton rows={5} />;
  if (error && !data) {
    return (
      <>
        <Empty text={`Could not load the statistics (${error}).`} />
        <div style={{ marginTop: 12 }}><button className="btn btn--sm" type="button" onClick={() => void reload()}>try again</button></div>
      </>
    );
  }
  const stats: Stats = data ?? {};
  const series = stats.series ?? [];
  const totals = stats.totals ?? {};
  const people = totals.visitors ?? 0;
  const sessions = totals.sessions ?? 0;
  const pages = totals.pageviews ?? 0;
  const engaged = totals.engagedSeconds ?? 0;
  const hasTraffic = pages > 0 || people > 0;
  const live = now === 0 ? 0 : (stats.recentVisitors ?? []).filter((v) => !v.isOwner && now - new Date(v.lastSeen).getTime() < 5 * 60_000).length;

  return (
    <>
      <div className="adm__toolbar">
        <div className="dchips" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r.d} type="button" className={`dchip${days === r.d ? " is-on" : ""}`} onClick={() => setDays(r.d)} aria-pressed={days === r.d}>{r.label}</button>
          ))}
        </div>
        <span className="adm__spacer" />
        {live > 0 && <span className="pulse"><i />{live} here now</span>}
        <button className="btn btn--sm" type="button" onClick={() => void reload()} disabled={refreshing}>{refreshing ? "refreshing…" : "↻ refresh"}</button>
      </div>

      {!hasTraffic ? (
        <>
          <Empty text="No traffic in this window yet. Your own visits are not counted, so open the site in a private window if you want to watch the pipeline work." />
          <div style={{ marginTop: 12 }}><a className="btn btn--sm" href="/read" target="_blank" rel="noopener">open the site ↗</a></div>
        </>
      ) : (
        <>
          <div className="stats">
            <Kpi value={fmt(people)} label="people" sub="unique profiles" delta={trend(series, (d) => d.uniques)} tip="One profile is one device on one network — no cookies involved." />
            <Kpi value={fmt(sessions)} label="visits" sub="30 idle minutes ends one" delta={trend(series, (d) => d.visits)} />
            <Kpi value={fmt(pages)} label="pages read" sub={`${(pages / Math.max(1, sessions)).toFixed(1)} per visit`} delta={trend(series, (d) => d.pageviews)} />
            <Kpi value={mins(engaged / Math.max(1, sessions))} label="attention" sub="per visit, measured" tip="Time the tab was visible and the reader was actually doing something." />
            <Kpi value={fmt(totals.converted ?? 0)} label="messages" sub={`${pct(totals.converted ?? 0, Math.max(1, people))}% of people`} />
          </div>

          {series.length > 1 && (
            <div className="sf sf--thin" style={{ marginTop: 14 }}>
              <div className="sf__in" style={{ padding: "14px 16px" }}><Chart series={series} /></div>
            </div>
          )}

          <div className="panels" style={{ marginTop: 14 }}>
            <Funnel stats={stats} />
            <Intent rows={stats.intents} recent={stats.recentVisitors} />
            <Split title="devices" rows={stats.devices} />
            <Split title="read or fly" rows={stats.doors} />
          </div>

          <div className="panels" style={{ marginTop: 14 }}>
            <Bars title="pages" rows={stats.topPaths} empty="No pageviews yet." />
            <Bars title="where they came from" rows={stats.topReferrers} empty="Everyone arrived directly." tip="Empty means a direct visit: typed, bookmarked, or from an app that strips the referrer." />
            <Bars title="countries" rows={stats.topCountries} empty="No locations yet." />
            <Bars title="what they clicked" rows={stats.eventTargets} empty="No interactions yet." />
          </div>
        </>
      )}
    </>
  );
}
