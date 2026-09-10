"use client";
// The contact inbox: a list on the left, the message and a reply box on the right. Replying sends
// through Resend and moves the message to "replied", so the list is a work queue rather than an archive.

import { useCallback, useEffect, useState } from "react";
import { Area, Empty, Skeleton, useToast } from "../kit";

type State = "new" | "read" | "replied" | "archived" | "spam";
const STATES: readonly State[] = ["new", "read", "replied", "archived", "spam"];

interface Message {
  id: number; name: string; email: string; subject: string; message: string; state: State;
  notes: string; country: string; city: string; referrer: string; visitorId: string | null; createdAt: string;
}

const when = (iso: string): string => {
  const d = new Date(iso), mins = (Date.now() - d.getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export default function InboxPanel() {
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<State | "all">("all");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const { say } = useToast();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/submissions${filter === "all" ? "" : `?state=${filter}`}`);
      const data: unknown = await r.json();
      setItems(Array.isArray(data) ? (data as Message[]) : []);
    } catch { say("could not load the inbox", true); }
    setLoading(false);
  }, [filter, say]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the updates land after the fetch resolves
  useEffect(() => { void load(); }, [load]);

  const current = items.find((m) => m.id === selected) ?? null;

  async function patch(id: number, body: Partial<Pick<Message, "state" | "notes">>): Promise<void> {
    const r = await fetch("/api/admin/submissions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    if (!r.ok) { say("could not update", true); return; }
    setItems((list) => list.map((m) => (m.id === id ? { ...m, ...body } : m)));
  }
  async function open(m: Message): Promise<void> {
    setSelected(m.id);
    setReply("");
    if (m.state === "new") await patch(m.id, { state: "read" });
  }
  async function send(): Promise<void> {
    if (!current || !reply.trim()) return;
    setSending(true);
    const r = await fetch("/api/admin/submissions/reply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: current.id, body: reply }) });
    const data: { error?: string } = await r.json().catch(() => ({}));
    if (r.ok) { say("reply sent"); setReply(""); await load(); }
    else say(data.error ?? "could not send the reply", true);
    setSending(false);
  }
  async function drop(id: number): Promise<void> {
    const r = await fetch(`/api/admin/submissions?id=${id}`, { method: "DELETE" });
    if (!r.ok) { say("could not delete", true); return; }
    say("deleted"); setSelected(null); await load();
  }

  const counts = STATES.map((s) => ({ s, n: items.filter((m) => m.state === s).length }));

  return (
    <>
      <div className="states" style={{ marginBottom: 14 }}>
        <button className={`btn btn--sm${filter === "all" ? " btn--primary" : ""}`} type="button" onClick={() => setFilter("all")}>all</button>
        {STATES.map((s) => (
          <button key={s} className={`btn btn--sm${filter === s ? " btn--primary" : ""}`} type="button" onClick={() => setFilter(s)}>
            {s}{filter === "all" ? ` ${counts.find((c) => c.s === s)?.n ?? 0}` : ""}
          </button>
        ))}
      </div>

      {loading ? <Skeleton rows={4} /> : !items.length ? <Empty text="Nothing here. Messages from the contact form land in this list." /> : (
        <div className="inbox">
          <div className="inbox__list">
            {items.map((m) => (
              <button key={m.id} type="button" className={`msg${m.id === selected ? " is-on" : ""}${m.state === "new" ? " is-new" : ""}`} onClick={() => void open(m)}>
                <span className="msg__when">{when(m.createdAt)}</span>
                <strong>{m.name}</strong>
                <em>{m.subject}</em>
                <p>{m.message.slice(0, 90)}</p>
              </button>
            ))}
          </div>

          <div className="sf sf--thin">
            {current ? (
              <div className="sf__in" style={{ padding: "18px 20px", display: "grid", gap: 14 }}>
                <div>
                  <div className="row__top">
                    <h3>{current.subject}</h3>
                    <span className="tag">{current.state}</span>
                  </div>
                  <p className="hint" style={{ marginTop: 4 }}>
                    {current.name} · <a href={`mailto:${current.email}`}>{current.email}</a>
                    {current.city || current.country ? ` · ${[current.city, current.country].filter(Boolean).join(", ")}` : ""}
                    {current.referrer ? ` · from ${current.referrer}` : ""}
                    {" · "}{new Date(current.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <p className="read__body">{current.message}</p>

                <div>
                  <p className="panel__h">reply</p>
                  <Area value={reply} onChange={setReply} placeholder={`Hi ${current.name.split(" ")[0] ?? ""},`} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn btn--primary" type="button" disabled={sending || !reply.trim()} onClick={() => void send()}>{sending ? "sending…" : "send reply"}</button>
                    <a className="btn" href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject}`)}`}>open in mail</a>
                    <button className="btn" type="button" onClick={() => void patch(current.id, { state: "archived" })}>archive</button>
                    <button className="btn" type="button" onClick={() => void patch(current.id, { state: "spam" })}>spam</button>
                    <button className="btn btn--danger" type="button" onClick={() => void drop(current.id)}>delete</button>
                  </div>
                </div>

                <div>
                  <p className="panel__h">private note</p>
                  <Area value={current.notes} onChange={(v) => void patch(current.id, { notes: v })} placeholder="only you see this" />
                </div>
              </div>
            ) : <div className="sf__in" style={{ padding: 20 }}><p className="hint">Pick a message.</p></div>}
          </div>
        </div>
      )}
    </>
  );
}
