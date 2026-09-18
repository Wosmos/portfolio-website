"use client";
// The contact inbox: a list on the left, the message and a reply box on the right. Replying sends
// through Resend and moves the message to "replied", so the list is a work queue rather than an archive.

import { useCallback, useEffect, useState } from "react";
import { Area, Badge, Btn, Chip, Count, Danger, Empty, Pager, Search, Section, Skeleton, Toolbar, pageOf, useToast, usePager, useSearch } from "../kit";

type State = "new" | "read" | "replied" | "archived" | "spam";
const STATES: readonly State[] = ["new", "read", "replied", "archived", "spam"];
const TONE: Record<State, "on" | "off" | "warn" | "mute" | "cool"> = { new: "cool", read: "mute", replied: "on", archived: "mute", spam: "off" };

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

type BulkResult = { id: number; ok: boolean; error?: string };

export default function InboxPanel() {
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<State | "all">("all");
  const [term, setTerm] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const { say } = useToast();

  // Reply to several messages in one action — each still gets its own separate email.
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"same" | "each">("same");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkDrafts, setBulkDrafts] = useState<Record<number, string>>({});
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult[] | null>(null);

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

  const rows = useSearch(items, term, (m) => [m.name, m.email, m.subject, m.message, m.city, m.country]);
  const pager = usePager(rows.length);
  const page = pageOf(rows, pager);
  const current = items.find((m) => m.id === selected) ?? null;

  async function patch(id: number, body: Partial<Pick<Message, "state" | "notes">>, tell?: string): Promise<void> {
    setItems((list) => list.map((m) => (m.id === id ? { ...m, ...body } : m)));   // optimistic
    const r = await fetch("/api/admin/submissions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    if (!r.ok) {
      const data: { error?: string } = await r.json().catch(() => ({}));
      say(data.error ?? "could not update", true);
      await load();
      return;
    }
    if (tell) say(tell);
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

  function toggleChecked(id: number): void {
    setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function closeBulk(): void {
    setBulkOpen(false); setChecked(new Set()); setBulkBody(""); setBulkDrafts({}); setBulkResult(null);
  }
  const checkedRows = items.filter((m) => checked.has(m.id));
  const bulkReady = bulkMode === "same" ? bulkBody.trim() !== "" : checkedRows.every((m) => (bulkDrafts[m.id] ?? "").trim() !== "");

  async function sendBulk(): Promise<void> {
    if (!bulkReady || checkedRows.length === 0) return;
    setBulkSending(true);
    setBulkResult(null);
    const body = { items: checkedRows.map((m) => ({ id: m.id, body: bulkMode === "same" ? bulkBody : (bulkDrafts[m.id] ?? "") })) };
    const r = await fetch("/api/admin/submissions/reply-bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data: { results?: BulkResult[]; error?: string } = await r.json().catch(() => ({}));
    setBulkSending(false);
    if (!r.ok) { say(data.error ?? "could not send", true); return; }
    const results = data.results ?? [];
    setBulkResult(results);
    const okIds = results.filter((x) => x.ok).map((x) => x.id);
    say(okIds.length === results.length ? `sent to all ${results.length}` : `sent to ${okIds.length} of ${results.length}`, okIds.length < results.length);
    await load();
    // failures stay selected so a retry is one click; sent ones drop off the list
    setChecked(new Set(results.filter((x) => !x.ok).map((x) => x.id)));
    if (okIds.length === results.length) closeBulk();
  }

  return (
    <div onKeyDown={(e) => { if (e.key === "Escape") setSelected(null); }}>
      <Toolbar>
        <Search value={term} onChange={setTerm} placeholder="search the inbox…" />
        <div className="tbar__chips">
          <Chip on={filter === "all"} onClick={() => setFilter("all")}>all</Chip>
          {STATES.map((s) => (
            <Chip key={s} on={filter === s} onClick={() => setFilter(s)} count={filter === "all" ? items.filter((m) => m.state === s).length : undefined}>{s}</Chip>
          ))}
        </div>
        <Count shown={rows.length} total={items.length} noun="messages" />
      </Toolbar>

      {loading ? <Skeleton rows={4} /> : rows.length === 0 ? (
        <Empty icon="✉" text={items.length ? "No message matches that." : "Nothing here. Messages from the contact form land in this list."} />
      ) : (
        <>
          {checked.size > 0 && (
            <div className="sf sf--thin" style={{ marginBottom: 10 }}>
              <div className="sf__in acts" style={{ alignItems: "center" }}>
                <b>{checked.size} selected</b>
                <Btn onClick={() => setChecked(new Set())}>clear</Btn>
                <Btn kind="primary" onClick={() => setBulkOpen(true)}>reply to selected</Btn>
              </div>
            </div>
          )}
          <div className="inbox">
            <div className="inbox__list">
              {page.map((m) => (
                <div key={m.id} className="msg-row">
                  <input
                    type="checkbox" className="msg-row__pick" checked={checked.has(m.id)}
                    onChange={() => toggleChecked(m.id)} aria-label={`select ${m.name}`}
                  />
                  <button type="button" className={`msg${m.id === selected ? " is-on" : ""}${m.state === "new" ? " is-new" : ""}`} onClick={() => void open(m)}>
                    <span className="msg__when">{when(m.createdAt)}</span>
                    <strong>{m.name}</strong>
                    <em>{m.subject}</em>
                    <p>{m.message.slice(0, 90)}</p>
                  </button>
                </div>
              ))}
            </div>

            <div className="sf sf--thin">
              {bulkOpen ? (
                <div className="sf__in dbox__pane">
                  <div className="row__top">
                    <h3>reply to {checkedRows.length} {checkedRows.length === 1 ? "person" : "people"}</h3>
                    <Btn onClick={closeBulk}>back</Btn>
                  </div>
                  <div className="tbar__chips" style={{ margin: "10px 0" }}>
                    <Chip on={bulkMode === "same"} onClick={() => setBulkMode("same")}>same message to everyone</Chip>
                    <Chip on={bulkMode === "each"} onClick={() => setBulkMode("each")}>write one each</Chip>
                  </div>

                  {bulkMode === "same" ? (
                    <Section title="message" tip="sent to each person individually — nobody selected ever sees anyone else's address.">
                      <Area value={bulkBody} onChange={setBulkBody} placeholder="Hi, thanks for reaching out…" />
                    </Section>
                  ) : (
                    checkedRows.map((m) => (
                      <Section key={m.id} title={`${m.name} · ${m.subject}`}>
                        <Area
                          value={bulkDrafts[m.id] ?? ""}
                          onChange={(v) => setBulkDrafts((d) => ({ ...d, [m.id]: v }))}
                          placeholder={`Hi ${m.name.split(" ")[0] ?? ""},`}
                        />
                      </Section>
                    ))
                  )}

                  <div className="acts" style={{ marginTop: 10 }}>
                    <Btn kind="primary" size="md" disabled={bulkSending || !bulkReady} onClick={() => void sendBulk()}>
                      {bulkSending ? "sending…" : `send to ${checkedRows.length}`}
                    </Btn>
                  </div>

                  {bulkResult && (
                    <ul className="hint" style={{ marginTop: 10, display: "grid", gap: 4 }}>
                      {bulkResult.map((r) => {
                        const m = items.find((x) => x.id === r.id);
                        return <li key={r.id}>{m?.name ?? r.id}: {r.ok ? "sent" : (r.error ?? "failed")}</li>;
                      })}
                    </ul>
                  )}
                </div>
              ) : current ? (
                <div className="sf__in dbox__pane">
                  <div>
                    <div className="row__top">
                      <h3>{current.subject}</h3>
                      <Badge tone={TONE[current.state]}>{current.state}</Badge>
                    </div>
                    <p className="hint" style={{ marginTop: 4 }}>
                      {current.name} · <a href={`mailto:${current.email}`}>{current.email}</a>
                      {current.city || current.country ? ` · ${[current.city, current.country].filter(Boolean).join(", ")}` : ""}
                      {current.referrer ? ` · from ${current.referrer}` : ""}
                      {" · "}{new Date(current.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <p className="read__body">{current.message}</p>

                  <Section title="reply" tip="sends from the site's own address through Resend, and moves the message to replied.">
                    <Area value={reply} onChange={setReply} placeholder={`Hi ${current.name.split(" ")[0] ?? ""},`} />
                    <div className="acts" style={{ marginTop: 10 }}>
                      <Btn kind="primary" size="md" disabled={sending || !reply.trim()} onClick={() => void send()}>{sending ? "sending…" : "send reply"}</Btn>
                      <a className="btn" href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject}`)}`}>open in mail</a>
                      <Btn onClick={() => void patch(current.id, { state: "archived" }, "archived")}>archive</Btn>
                      <Btn onClick={() => void patch(current.id, { state: "spam" }, "marked as spam")}>spam</Btn>
                      <Danger onConfirm={() => void drop(current.id)} />
                    </div>
                  </Section>

                  <Section title="private note" tip="only you ever see this; it is not sent anywhere.">
                    <Area value={current.notes} onChange={(v) => void patch(current.id, { notes: v })} placeholder="only you see this" />
                  </Section>
                </div>
              ) : <div className="sf__in" style={{ padding: 20 }}><Empty icon="✉" text="Pick a message to read it and reply." /></div>}
            </div>
          </div>
          <Pager state={pager} total={rows.length} noun="messages" />
        </>
      )}
    </div>
  );
}
