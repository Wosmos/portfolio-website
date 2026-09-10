"use client";
// The traffic dashboard. One request to /api/admin/stats, drawn with CSS bars — no chart library, so
// the panel costs nothing to load.

import { useEffect, useState } from "react";
import { Empty, Skeleton, useToast } from "../kit";

interface Slice { key: string; count: number }
interface Day { day: string; pageviews: number; visits: number; uniques: number }
interface Stats {
  totals: { visitors: number; sessions: number; pageviews: number; events: number; converted: number };
  series: Day[];
  topPaths: Slice[]; topReferrers: Slice[]; topCountries: Slice[];
  devices: Slice[]; browsers: Slice[]; doors: Slice[];
  eventTargets: (Slice & { name?: string })[];
}

const fmt = (n: number): string => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n));


function Bars({ title, rows = [], empty }: { title: string; rows?: Slice[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="sf sf--thin">
      <div className="sf__in" style={{ padding: "14px 16px" }}>
        <p className="panel__h">{title}</p>
        {rows.length ? (
          <div className="bars">
            {rows.map((r) => (
              <div key={r.key} style={{ "--w": `${(r.count / max) * 100}%` } as React.CSSProperties}>
                <span title={r.key}>{r.key || "direct"}</span><b>{fmt(r.count)}</b>
              </div>
            ))}
          </div>
        ) : <p className="hint">{empty}</p>}
      </div>
    </div>
  );
}

export default function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const { say } = useToast();

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch(`/api/admin/stats?days=${days}`);
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as Stats;
        if (alive) setStats(data);
      } catch { if (alive) say("could not load the statistics", true); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [days, say]);

  if (loading) return <Skeleton rows={4} />;
  if (!stats) return <Empty text="No statistics yet." />;

  const series = stats.series ?? [];
  const peak = Math.max(1, ...series.map((d) => d.pageviews));
  const hasTraffic = stats.totals.pageviews > 0;

  return (
    <>
      <div className="states" style={{ marginBottom: 14 }}>
        {[7, 30, 90, 365].map((d) => (
          <button key={d} type="button" className={`btn btn--sm${days === d ? " btn--primary" : ""}`} onClick={() => setDays(d)}>{d === 365 ? "1 year" : `${d} days`}</button>
        ))}
      </div>

      <div className="stats">
        <div className="sf sf--thin stat"><div className="sf__in"><b>{fmt(stats.totals.visitors)}</b><span>people</span><small>unique profiles</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{fmt(stats.totals.sessions)}</b><span>visits</span><small>a new one after 30 idle minutes</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{fmt(stats.totals.pageviews)}</b><span>pages read</span><small>{(stats.totals.pageviews / Math.max(1, stats.totals.sessions)).toFixed(1)} per visit</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{fmt(stats.totals.events)}</b><span>interactions</span><small>clicks, cutaways, flights</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{fmt(stats.totals.converted)}</b><span>got in touch</span><small>{((stats.totals.converted / Math.max(1, stats.totals.visitors)) * 100).toFixed(1)}% of people</small></div></div>
      </div>

      <div className="sf sf--thin" style={{ marginBottom: 12 }}>
        <div className="sf__in" style={{ padding: "14px 16px" }}>
          <p className="panel__h">pages read per day</p>
          {hasTraffic ? (
            <>
              <div className="spark">
                {series.map((d) => (
                  <i key={d.day} style={{ height: `${Math.max(2, (d.pageviews / peak) * 100)}%` }} title={`${d.day} · ${d.pageviews} pages · ${d.uniques} people`} />
                ))}
              </div>
              <div className="spark__x">
                <span>{series[0]?.day ?? ""}</span>
                <span>peak {peak}</span>
                <span>{series.at(-1)?.day ?? ""}</span>
              </div>
            </>
          ) : <p className="hint">Nothing recorded yet. Open the site in another tab and this fills in.</p>}
        </div>
      </div>

      <div className="panels">
        <Bars title="pages" rows={stats.topPaths} empty="no pageviews yet" />
        <Bars title="where they came from" rows={stats.topReferrers} empty="all direct so far" />
        <Bars title="countries" rows={stats.topCountries} empty="geography needs the deployed site" />
        <Bars title="read or fly" rows={stats.doors} empty="nobody has picked a door yet" />
        <Bars title="devices" rows={stats.devices} empty="—" />
        <Bars title="browsers" rows={stats.browsers} empty="—" />
        <Bars title="what they clicked" rows={stats.eventTargets.map((e) => ({ key: e.name ? `${e.name} · ${e.key}` : e.key, count: e.count }))} empty="no clicks recorded yet" />
      </div>
    </>
  );
}
