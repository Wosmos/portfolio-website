"use client";
// Jobs, dates and the bullets under each one. Same three parts as every list panel: toolbar, table,
// detail box — see panels/Facts.tsx, which is the one worth reading first.

import { useState } from "react";
import {
  Area, Badge, Btn, Card, Check, Chip, Chips, Count, Danger, Empty, Field, Lines, Pager, Search, Skeleton,
  Table, Text, Toolbar, applySort, pageOf, useResource, usePager, useSearch, useSort, type Column, type WithId,
} from "../kit";

interface Row extends WithId {
  company: string; title: string; location: string; start: string; end: string | null;
  note: string; bullets: string[]; stack: string[]; visible: boolean;
}
const blank = { company: "", title: "", location: "", start: "", end: null as string | null, note: "", bullets: [] as string[], stack: [] as string[], visible: true };

const COLUMNS: readonly Column<Row>[] = [
  { key: "title", label: "role", value: (r) => r.title, cell: (r) => <><b>{r.title}</b><small className="sub">{r.company}</small></> },
  { key: "start", label: "from", width: "92px", value: (r) => r.start, cell: (r) => r.start },
  { key: "end", label: "to", width: "104px", value: (r) => r.end ?? "9999", cell: (r) => (r.end ? r.end : <Badge tone="on">present</Badge>) },
  { key: "bullets", label: "bullets", width: "88px", num: true, value: (r) => r.bullets.length, cell: (r) => r.bullets.length },
  { key: "visible", label: "state", width: "100px", value: (r) => (r.visible ? 0 : 1), cell: (r) => (r.visible ? <Badge tone="on">live</Badge> : <Badge tone="off">hidden</Badge>) },
];

export default function ExperiencePanel() {
  const { items, loading, create, update, remove, move } = useResource<Row>("experience");
  const [term, setTerm] = useState("");
  const [only, setOnly] = useState<"all" | "present" | "hidden">("all");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { sort, toggle } = useSort();

  const found = useSearch(items, term, (r) => [r.title, r.company, r.location, r.note]);
  const rows = found.filter((r) => (only === "all" || (only === "present" ? r.end === null : !r.visible)));
  const pager = usePager(rows.length);
  const page = pageOf(applySort(rows, COLUMNS, sort), pager);
  const current = sel === null ? null : items.find((r) => r.id === sel) ?? null;

  if (loading) return <Skeleton rows={4} />;
  const close = (): void => { setSel(null); setAdding(false); };

  return (
    <div className="split" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search jobs…" />
          <div className="tbar__chips">
            <Chip on={only === "all"} onClick={() => setOnly("all")}>all</Chip>
            <Chip on={only === "present"} onClick={() => setOnly("present")} count={items.filter((r) => r.end === null).length}>current</Chip>
            <Chip on={only === "hidden"} onClick={() => setOnly("hidden")} count={items.filter((r) => !r.visible).length}>hidden</Chip>
          </div>
          <Count shown={rows.length} total={items.length} noun="jobs" />
          <Btn kind="primary" onClick={() => { setSel(null); setAdding(true); }}>new job</Btn>
        </Toolbar>

        {rows.length === 0 ? (
          <Empty
            icon="▤" text={items.length ? "No job matches that filter." : "No jobs yet. These fill the résumé and the deck's career panel."}
            action={items.length ? undefined : "add the first job"} onAction={items.length ? undefined : () => setAdding(true)}
          />
        ) : (
          <>
            <Table
              label="jobs" columns={COLUMNS} rows={page} keyOf={(r) => r.id}
              selected={sel} onSelect={(r) => { setAdding(false); setSel(r.id); }} sort={sort} onSort={toggle}
              actions={(r) => (
                <>
                  <Btn onClick={() => { setAdding(false); setSel(r.id); }}>edit</Btn>
                  <Btn onClick={() => void update({ id: r.id, visible: !r.visible })}>{r.visible ? "hide" : "show"}</Btn>
                  <Danger onConfirm={() => { if (sel === r.id) setSel(null); void remove(r.id); }} />
                </>
              )}
            />
            <Pager state={pager} total={rows.length} noun="jobs" />
          </>
        )}
      </div>

      {adding && <NewJob onCancel={close} onCreate={async (d) => { const ok = await create(d); if (ok) setAdding(false); return ok; }} />}
      {current && !adding && (
        <EditJob
          key={current.id} row={current} onClose={close}
          onSave={(patch) => update({ id: current.id, ...patch })}
          onDelete={() => { void remove(current.id); close(); }}
          onMove={(dir) => void move(current.id, dir)}
        />
      )}
    </div>
  );
}

function EditJob({ row, onClose, onSave, onDelete, onMove }: {
  row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => Promise<boolean>; onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [form, setForm] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Row>(k: K) => (v: Row[K]): void => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(row);

  return (
    <Card
      title={row.title || "the job"} onClose={onClose}
      actions={<><Btn onClick={() => onMove(-1)} aria-label="move up">↑</Btn><Btn onClick={() => onMove(1)} aria-label="move down">↓</Btn></>}
    >
      <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void onSave(form).finally(() => setBusy(false)); }}>
        <div className="fields fields--2">
          <Field label="title"><Text value={form.title} onChange={set("title")} required /></Field>
          <Field label="company"><Text value={form.company} onChange={set("company")} required /></Field>
          <Field label="location"><Text value={form.location} onChange={set("location")} /></Field>
          <Field label="dates" tip="YYYY-MM. Leave the end empty and the site says present.">
            <div className="pair">
              <Text value={form.start} onChange={set("start")} placeholder="2025-01" />
              <Text value={form.end ?? ""} onChange={(v) => setForm({ ...form, end: v || null })} placeholder="present" />
            </div>
          </Field>
        </div>
        <Field label="one-line note" tip="the line the flight deck shows next to this job."><Area value={form.note} onChange={set("note")} /></Field>
        <Field label="bullets" hint="one per line"><Lines value={form.bullets} onChange={set("bullets")} /></Field>
        <Field label="stack"><Chips value={form.stack} onChange={set("stack")} /></Field>
        <Check label="visible on the site" checked={form.visible} onChange={set("visible")} />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save" : "saved"}</Btn>
          <Btn size="md" onClick={() => setForm(row)} disabled={!dirty}>undo</Btn>
          <Danger size="md" onConfirm={onDelete} />
        </div>
      </form>
    </Card>
  );
}

function NewJob({ onCancel, onCreate }: { onCancel: () => void; onCreate: (draft: typeof blank) => Promise<boolean> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="new job" onClose={onCancel}>
      <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void onCreate(draft).then((ok) => { if (ok) setDraft(blank); setBusy(false); }); }}>
        <Field label="title"><Text value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} required /></Field>
        <Field label="company"><Text value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })} required /></Field>
        <Field label="start" hint="YYYY-MM"><Text value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} placeholder="2025-01" required /></Field>
        <Check label="visible on the site" checked={draft.visible} onChange={(v) => setDraft({ ...draft, visible: v })} />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy}>{busy ? "adding…" : "add job"}</Btn>
          <Btn size="md" onClick={onCancel}>cancel</Btn>
        </div>
      </form>
    </Card>
  );
}
