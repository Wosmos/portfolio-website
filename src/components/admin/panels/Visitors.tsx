"use client";
// One row per profile, newest first, and a detail view showing that person's visits and everything
// they clicked. The id is a salted hash, so this is behaviour, not identity.

import { useCallback, useEffect, useState } from "react";
import { Empty, Skeleton, useToast } from "../kit";

interface Visitor {
  id: string; firstSeen: string; lastSeen: string; visits: number; pageviews: number; events: number;
  engagedSeconds: number; country: string; city: string; device: string; os: string; browser: string;
  language: string; firstReferrer: string; firstLanding: string; door: string; converted: boolean; label: string;
}
interface Session { id: string; startedAt: string; pageviews: number; engagedSeconds: number; maxScroll: number; entryPath: string; exitPath: string; referrer: string }
interface Event { id: number; name: string; path: string; target: string; value: number | null; at: string }
interface Detail { visitor: Visitor; sessions: Session[]; events: Event[] }

const ago = (iso: string): string => {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};
const secs = (s: number): string => (s < 90 ? `${Math.round(s)}s` : `${Math.round(s / 60)}m`);

export default function VisitorsPanel() {
  const [rows, setRows] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const { say } = useToast();

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/stats?days=365");
      const data = (await r.json()) as { recentVisitors?: Visitor[] };
      setRows(data.recentVisitors ?? []);
    } catch { say("could not load the visitors", true); }
    setLoading(false);
  }, [say]);
  useEffect(() => { void load(); }, [load]);

  async function open(id: string): Promise<void> {
    try {
      const r = await fetch(`/api/admin/visitors/${id}`);
      if (!r.ok) throw new Error(String(r.status));
      setDetail((await r.json()) as Detail);
    } catch { say("could not load that profile", true); }
  }

  if (loading) return <Skeleton rows={5} />;
  if (!rows.length) return <Empty text="No profiles yet. A profile appears the first time someone loads a page." />;

  if (detail) {
    const v = detail.visitor;
    return (
      <>
        <button className="btn btn--sm" type="button" onClick={() => setDetail(null)} style={{ marginBottom: 14 }}>← all profiles</button>
        <div className="stats">
          <div className="sf sf--thin stat"><div className="sf__in"><b>{v.visits}</b><span>visits</span><small>first {new Date(v.firstSeen).toLocaleDateString("en-GB")}</small></div></div>
          <div className="sf sf--thin stat"><div className="sf__in"><b>{v.pageviews}</b><span>pages</span><small>{v.events} events</small></div></div>
          <div className="sf sf--thin stat"><div className="sf__in"><b>{secs(v.engagedSeconds)}</b><span>attention</span><small>total</small></div></div>
          <div className="sf sf--thin stat"><div className="sf__in"><b>{v.door || "—"}</b><span>door</span><small>{v.converted ? "sent a message" : "no message"}</small></div></div>
        </div>
        <p className="adm__hint">
          {[v.device, v.os, v.browser, v.language, [v.city, v.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          {v.firstReferrer ? ` · arrived from ${v.firstReferrer}` : " · arrived directly"} · landed on {v.firstLanding || "/"}
        </p>

        <div className="panels">
          <div className="sf sf--thin"><div className="sf__in" style={{ padding: "14px 16px" }}>
            <p className="panel__h">visits</p>
            <table className="tbl"><thead><tr><th>when</th><th>entry</th><th className="num">pages</th><th className="num">time</th><th className="num">scroll</th></tr></thead>
              <tbody>{detail.sessions.map((s) => (
                <tr key={s.id}><td>{ago(s.startedAt)}</td><td><b>{s.entryPath}</b></td><td className="num">{s.pageviews}</td><td className="num">{secs(s.engagedSeconds)}</td><td className="num">{s.maxScroll}%</td></tr>
              ))}</tbody></table>
          </div></div>
          <div className="sf sf--thin"><div className="sf__in" style={{ padding: "14px 16px" }}>
            <p className="panel__h">what they did</p>
            <table className="tbl tbl--fixed"><thead><tr><th>when</th><th>event</th><th>on</th></tr></thead>
              <tbody>{detail.events.map((e) => (
                <tr key={e.id}><td>{ago(e.at)}</td><td><b>{e.name}</b></td><td>{e.target || e.path}</td></tr>
              ))}</tbody></table>
          </div></div>
        </div>
      </>
    );
  }

  return (
    <div className="sf sf--thin"><div className="sf__in" style={{ padding: "14px 16px", overflowX: "auto" }}>
      <table className="tbl">
        <thead><tr><th>last seen</th><th>where</th><th>device</th><th>door</th><th className="num">visits</th><th className="num">pages</th><th className="num">time</th><th /></tr></thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id}>
              <td>{ago(v.lastSeen)}</td>
              <td><b>{[v.city, v.country].filter(Boolean).join(", ") || "unknown"}</b></td>
              <td>{[v.device, v.browser].filter(Boolean).join(" · ")}</td>
              <td>{v.door || "—"}{v.converted && <b style={{ color: "var(--ok)" }}> · wrote in</b>}</td>
              <td className="num">{v.visits}</td>
              <td className="num">{v.pageviews}</td>
              <td className="num">{secs(v.engagedSeconds)}</td>
              <td><button className="btn btn--sm" type="button" onClick={() => void open(v.id)}>open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div></div>
  );
}
