"use client";
// One row per profile, and a detail view showing that person's visits, everything they clicked, and
// why the intent engine scored them the way it did. The id is a salted hash, so this is behaviour, not
// identity.
//
// The list is paged by Postgres through /api/admin/visitors when that endpoint answers in the paged
// shape, and falls back to the twenty rows /api/admin/stats already returns when it does not — so this
// panel works whether or not the scoring endpoint has shipped. Every scoring field is treated as
// possibly missing for the same reason.

import { useCallback, useEffect, useState } from "react";
import {
  Badge, Btn, Chip, Count, Empty, Pager, Search, Section, Skeleton, Table, Toolbar, Tooltip,
  applySort, pageOf, usePager, useSearch, useSort, useToast, type Column,
} from "../kit";

const INTENTS = ["hot", "warm", "curious", "passing", "bot"] as const;
type Intent = (typeof INTENTS)[number];
const isIntent = (v: unknown): v is Intent => INTENTS.some((i) => i === v);
const TONE: Record<Intent, "hot" | "warn" | "cool" | "mute" | "off"> = { hot: "hot", warm: "warn", curious: "cool", passing: "mute", bot: "off" };

interface Visitor {
  id: string; firstSeen: string; lastSeen: string; visits: number; pageviews: number; events: number;
  engagedSeconds: number; country: string; city: string; device: string; os: string; browser: string;
  language?: string; firstReferrer: string; firstLanding: string; door: string; converted: boolean; label: string;
  /** All four arrive with the lead scoring; older responses do not carry them. */
  score?: number; intent?: string; scoreWhy?: readonly string[]; isOwner?: boolean; isBot?: boolean;
}
interface Session { id: string; startedAt: string; pageviews: number; engagedSeconds: number; maxScroll: number; entryPath: string; exitPath: string; referrer: string }
interface Event { id: number; name: string; path: string; target: string; value: number | null; at: string }
interface Lead { score?: number; intent?: string; why?: readonly string[] }
interface Detail { visitor: Visitor; sessions: Session[]; events: Event[]; lead?: Lead }

const ago = (iso: string): string => {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};
const secs = (s: number): string => (s < 90 ? `${Math.round(s)}s` : `${Math.round(s / 60)}m`);
const place = (v: Visitor): string => [v.city, v.country].filter(Boolean).join(", ") || "unknown";
const reasons = (d: Detail): readonly string[] => d.lead?.why ?? d.visitor.scoreWhy ?? [];
const scoreOf = (v: Visitor, lead?: Lead): number | null => {
  const n = lead?.score ?? v.score;
  return typeof n === "number" ? n : null;
};
const intentOf = (v: Visitor, lead?: Lead): Intent | null => {
  const raw = lead?.intent ?? v.intent;
  return isIntent(raw) ? raw : null;
};

/** The paged shape, or null when the endpoint answered with something else (or is not there yet). */
function readPage(data: unknown): { rows: Visitor[]; total: number } | null {
  if (typeof data !== "object" || data === null) return null;
  const rows: unknown = Reflect.get(data, "rows");
  const total: unknown = Reflect.get(data, "total");
  if (!Array.isArray(rows) || typeof total !== "number") return null;
  return { rows: rows as Visitor[], total };
}
/** The old stats shape: twenty recent rows, no paging. */
function readRecent(data: unknown): Visitor[] | null {
  if (typeof data !== "object" || data === null) return null;
  const rows: unknown = Reflect.get(data, "recentVisitors");
  return Array.isArray(rows) ? (rows as Visitor[]) : null;
}

const SCORE_TIP = "0–100, from behaviour only: a message, the résumé, the contact page, time on the page, coming back. The band is the colour. Open a profile to see the reasons.";

const COLUMNS: readonly Column<Visitor>[] = [
  {
    key: "score", label: "intent", width: "132px", value: (v) => v.score ?? -1,
    cell: (v) => {
      const intent = intentOf(v), n = scoreOf(v);
      if (!intent && n === null) return <span className="hint">not scored</span>;
      return (
        <span className="lead">
          {intent && <Badge tone={TONE[intent]}>{intent}</Badge>}
          {n !== null && <span className="meter" style={{ ["--w" as string]: `${Math.max(0, Math.min(100, n))}%` }}><b>{n}</b></span>}
        </span>
      );
    },
  },
  { key: "lastSeen", label: "last seen", width: "104px", value: (v) => new Date(v.lastSeen).getTime(), cell: (v) => ago(v.lastSeen) },
  { key: "where", label: "where", cell: (v) => <><b>{place(v)}</b>{v.converted && <small className="sub ok">wrote in</small>}</> },
  { key: "device", label: "device", width: "160px", cell: (v) => [v.device, v.browser].filter(Boolean).join(" · ") || "—" },
  { key: "door", label: "door", width: "76px", cell: (v) => v.door || "—" },
  { key: "visits", label: "visits", width: "78px", num: true, value: (v) => v.visits, cell: (v) => v.visits },
  { key: "pageviews", label: "pages", width: "78px", num: true, value: (v) => v.pageviews, cell: (v) => v.pageviews },
  { key: "engagedSeconds", label: "time", width: "78px", num: true, value: (v) => v.engagedSeconds, cell: (v) => secs(v.engagedSeconds) },
];

export default function VisitorsPanel() {
  const [rows, setRows] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [served, setServed] = useState(false);   // true once the paged endpoint has answered in its own shape
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [term, setTerm] = useState("");
  const [intent, setIntent] = useState<Intent | "all">("all");
  const [owners, setOwners] = useState(false);
  const { say } = useToast();
  const { sort, toggle } = useSort({ key: "lastSeen", dir: "desc" });

  // The server filters, sorts and pages its own answer; the fallback shape does none of that, so the
  // same three steps happen here over the twenty rows it returns — and the pager counts whichever of
  // the two is actually the list.
  const mine = served ? rows : rows.filter((v) => owners || v.isOwner !== true);
  const found = useSearch(mine, served ? "" : term, (v) => [v.city, v.country, v.device, v.browser, v.os, v.label, v.firstReferrer, v.id]);
  const filtered = served ? found : found.filter((v) => intent === "all" || v.intent === intent);
  const count = served ? total : filtered.length;
  const pager = usePager(count);
  const { page, per } = pager;
  const shown = served ? filtered : pageOf(applySort(filtered, COLUMNS, sort), pager);

  const load = useCallback(async () => {
    const key = sort?.key ?? "lastSeen";
    const dir = sort?.dir ?? "desc";
    const query = new URLSearchParams({ page: String(page), per: String(per), sort: key, dir });
    if (term.trim()) query.set("q", term.trim());
    if (intent !== "all") query.set("intent", intent);
    if (owners) query.set("include", "owner");
    try {
      const r = await fetch(`/api/admin/visitors?${query.toString()}`, { cache: "no-store" });
      const paged = r.ok ? readPage(await r.json().catch(() => null)) : null;
      if (paged) {
        setRows(paged.rows); setTotal(paged.total); setServed(true); setError(""); setLoading(false);
        return;
      }
    } catch { /* fall through to the stats shape */ }
    try {
      const r = await fetch("/api/admin/stats?days=365", { cache: "no-store" });
      const recent = readRecent(await r.json().catch(() => null));
      if (recent) { setRows(recent); setTotal(recent.length); setServed(false); setError(""); }
      else setError("the visitor list is unavailable");
    } catch { setError("could not load the visitors"); }
    setLoading(false);
  }, [page, per, term, intent, owners, sort]);
  // every state update above lands after a fetch resolves, not while the effect runs
  useEffect(() => { void load(); }, [load]);

  const open = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/admin/visitors/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const data: unknown = await r.json();
      if (typeof data !== "object" || data === null) throw new Error("shape");
      setDetail(data as Detail);
    } catch { say("could not load that profile", true); }
  }, [say]);

  if (loading) return <Skeleton rows={5} />;
  if (detail) return <Profile detail={detail} onBack={() => setDetail(null)} />;

  return (
    <div onKeyDown={(e) => { if (e.key === "Escape") setDetail(null); }}>
      <Toolbar>
        <Search value={term} onChange={setTerm} placeholder="search by place, device or id…" />
        <div className="tbar__chips">
          <Chip on={intent === "all"} onClick={() => setIntent("all")}>all</Chip>
          {INTENTS.map((i) => <Chip key={i} on={intent === i} onClick={() => setIntent(i)}>{i}</Chip>)}
        </div>
        <div className="tbar__chips">
          <Chip on={owners} onClick={() => setOwners(!owners)}>show mine</Chip>
          <Tooltip text={SCORE_TIP} />
        </div>
        <Count shown={shown.length} total={count} noun="profiles" />
      </Toolbar>

      {error && <p className="err" style={{ marginBottom: 12 }}>{error}</p>}
      {shown.length === 0 ? (
        <Empty icon="◎" text={count === 0 && !term && intent === "all" ? "No profiles yet. One appears the first time someone loads a page." : "No profile matches that filter."} />
      ) : (
        <>
          <Table
            label="visitor profiles" columns={COLUMNS} rows={shown} keyOf={(v) => v.id}
            onSelect={(v) => void open(v.id)} sort={sort} onSort={toggle}
            actions={(v) => <Btn onClick={() => void open(v.id)}>open</Btn>}
          />
          <Pager state={pager} total={count} noun="profiles" />
          {!served && <p className="hint" style={{ marginTop: 8 }}>Showing the most recent twenty. The paged endpoint is not answering yet.</p>}
        </>
      )}
    </div>
  );
}

function Profile({ detail, onBack }: { detail: Detail; onBack: () => void }) {
  const v = detail.visitor;
  const n = scoreOf(v, detail.lead);
  const intent = intentOf(v, detail.lead);
  const why = reasons(detail);

  return (
    <>
      <div className="acts" style={{ marginBottom: 14 }}>
        <Btn onClick={onBack}>← all profiles</Btn>
        {intent && <Badge tone={TONE[intent]}>{intent}</Badge>}
        {v.isOwner === true && <Badge tone="cool">this is you</Badge>}
        {v.isBot === true && <Badge tone="off">bot</Badge>}
      </div>

      <div className="stats">
        <div className="sf sf--thin stat"><div className="sf__in"><b>{n === null ? "—" : n}</b><span>intent <Tooltip text={SCORE_TIP} /></span><small>{intent ?? "not scored"}</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{v.visits}</b><span>visits</span><small>first {new Date(v.firstSeen).toLocaleDateString("en-GB")}</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{v.pageviews}</b><span>pages</span><small>{v.events} events</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{secs(v.engagedSeconds)}</b><span>attention</span><small>total</small></div></div>
        <div className="sf sf--thin stat"><div className="sf__in"><b>{v.door || "—"}</b><span>door</span><small>{v.converted ? "sent a message" : "no message"}</small></div></div>
      </div>

      <p className="adm__hint">
        {[v.device, v.os, v.browser, v.language, place(v)].filter(Boolean).join(" · ")}
        {v.firstReferrer ? ` · arrived from ${v.firstReferrer}` : " · arrived directly"} · landed on {v.firstLanding || "/"}
      </p>

      {why.length > 0 && (
        <div className="sf sf--thin" style={{ marginBottom: 12 }}>
          <div className="sf__in dbox__pane">
            <Section title="why it scored that" tip="each line is one signal the engine found. Nothing here comes from outside the analytics this site already collects.">
              <ul className="whys">{why.map((w, i) => <li key={`${w}-${i}`}>{w}</li>)}</ul>
            </Section>
          </div>
        </div>
      )}

      <div className="panels">
        <div className="sf sf--thin"><div className="sf__in dbox__pane">
          <p className="panel__h">visits</p>
          <div className="tw">
            <table className="tbl"><thead><tr><th>when</th><th>entry</th><th className="num">pages</th><th className="num">time</th><th className="num">scroll</th></tr></thead>
              <tbody>{detail.sessions.map((s) => (
                <tr key={s.id}><td>{ago(s.startedAt)}</td><td><b>{s.entryPath}</b></td><td className="num">{s.pageviews}</td><td className="num">{secs(s.engagedSeconds)}</td><td className="num">{s.maxScroll}%</td></tr>
              ))}</tbody></table>
          </div>
        </div></div>
        <div className="sf sf--thin"><div className="sf__in dbox__pane">
          <p className="panel__h">what they did</p>
          <div className="tw">
            <table className="tbl tbl--fixed"><thead><tr><th>when</th><th>event</th><th>on</th></tr></thead>
              <tbody>{detail.events.map((e) => (
                <tr key={e.id}><td>{ago(e.at)}</td><td><b>{e.name}</b></td><td>{e.target || e.path}</td></tr>
              ))}</tbody></table>
          </div>
        </div></div>
      </div>
    </>
  );
}
