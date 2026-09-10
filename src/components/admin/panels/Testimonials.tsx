"use client";
// Quotes. Anything marked as a sample is labelled as one on the site rather than passed off as real.
// Toolbar, table, detail box — the pattern from panels/Facts.tsx.

import { useState } from "react";
import {
  Area, Badge, Btn, Card, Check, Chip, Count, Danger, Empty, Field, Pager, Search, Skeleton, Table, Text,
  Toolbar, applySort, pageOf, useResource, usePager, useSearch, useSort, type Column, type WithId,
} from "../kit";

interface Row extends WithId {
  quote: string; name: string; role: string; company: string; link: string;
  placeholder: boolean; visible: boolean;
}
const blank = { quote: "", name: "", role: "", company: "", link: "", placeholder: false, visible: true };

const COLUMNS: readonly Column<Row>[] = [
  { key: "name", label: "who", width: "200px", value: (r) => r.name, cell: (r) => <><b>{r.name || "unnamed"}</b><small className="sub">{[r.role, r.company].filter(Boolean).join(" · ")}</small></> },
  { key: "quote", label: "quote", value: (r) => r.quote, cell: (r) => <span className="clamp">{r.quote}</span> },
  {
    key: "state", label: "state", width: "140px", value: (r) => (r.visible ? 0 : 1),
    cell: (r) => <>{r.placeholder && <Badge tone="warn">sample</Badge>}{r.visible ? <Badge tone="on">live</Badge> : <Badge tone="off">hidden</Badge>}</>,
  },
];

export default function TestimonialsPanel() {
  const { items, loading, create, update, remove, move } = useResource<Row>("testimonials");
  const [term, setTerm] = useState("");
  const [only, setOnly] = useState<"all" | "real" | "sample" | "hidden">("all");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { sort, toggle } = useSort();

  const found = useSearch(items, term, (r) => [r.name, r.role, r.company, r.quote]);
  const rows = found.filter((r) =>
    only === "all" || (only === "real" ? !r.placeholder : only === "sample" ? r.placeholder : !r.visible));
  const pager = usePager(rows.length);
  const page = pageOf(applySort(rows, COLUMNS, sort), pager);
  const current = sel === null ? null : items.find((r) => r.id === sel) ?? null;

  if (loading) return <Skeleton rows={3} />;
  const close = (): void => { setSel(null); setAdding(false); };

  return (
    <div className="split" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search quotes…" />
          <div className="tbar__chips">
            <Chip on={only === "all"} onClick={() => setOnly("all")}>all</Chip>
            <Chip on={only === "real"} onClick={() => setOnly("real")} count={items.filter((r) => !r.placeholder).length}>real</Chip>
            <Chip on={only === "sample"} onClick={() => setOnly("sample")} count={items.filter((r) => r.placeholder).length}>samples</Chip>
            <Chip on={only === "hidden"} onClick={() => setOnly("hidden")} count={items.filter((r) => !r.visible).length}>hidden</Chip>
          </div>
          <Count shown={rows.length} total={items.length} noun="quotes" />
          <Btn kind="primary" onClick={() => { setSel(null); setAdding(true); }}>new quote</Btn>
        </Toolbar>

        {rows.length === 0 ? (
          <Empty
            icon="❝" text={items.length ? "No quote matches that filter." : "No quotes yet. The section hides itself on the site while there are none."}
            action={items.length ? undefined : "add the first quote"} onAction={items.length ? undefined : () => setAdding(true)}
          />
        ) : (
          <>
            <Table
              label="testimonials" columns={COLUMNS} rows={page} keyOf={(r) => r.id}
              selected={sel} onSelect={(r) => { setAdding(false); setSel(r.id); }} sort={sort} onSort={toggle}
              actions={(r) => (
                <>
                  <Btn onClick={() => { setAdding(false); setSel(r.id); }}>edit</Btn>
                  <Btn onClick={() => void update({ id: r.id, visible: !r.visible })}>{r.visible ? "hide" : "show"}</Btn>
                  <Danger onConfirm={() => { if (sel === r.id) setSel(null); void remove(r.id); }} />
                </>
              )}
            />
            <Pager state={pager} total={rows.length} noun="quotes" />
          </>
        )}
      </div>

      {adding && <NewQuote onCancel={close} onCreate={async (d) => { const ok = await create(d); if (ok) setAdding(false); return ok; }} />}
      {current && !adding && (
        <EditQuote
          key={current.id} row={current} onClose={close}
          onSave={(patch) => update({ id: current.id, ...patch })}
          onDelete={() => { void remove(current.id); close(); }}
          onMove={(dir) => void move(current.id, dir)}
        />
      )}
    </div>
  );
}

function Form({ value, onChange }: { value: typeof blank; onChange: (v: typeof blank) => void }) {
  return (
    <>
      <Field label="quote"><Area value={value.quote} onChange={(v) => onChange({ ...value, quote: v })} required /></Field>
      <Field label="name"><Text value={value.name} onChange={(v) => onChange({ ...value, name: v })} required /></Field>
      <div className="fields fields--2">
        <Field label="role"><Text value={value.role} onChange={(v) => onChange({ ...value, role: v })} /></Field>
        <Field label="company"><Text value={value.company} onChange={(v) => onChange({ ...value, company: v })} /></Field>
      </div>
      <Field label="link" tip="linkedin, or wherever they wrote it — the site links the name to this."><Text value={value.link} onChange={(v) => onChange({ ...value, link: v })} /></Field>
      <Check label="this is a sample, label it as one" checked={value.placeholder} onChange={(v) => onChange({ ...value, placeholder: v })} />
    </>
  );
}

function EditQuote({ row, onClose, onSave, onDelete, onMove }: {
  row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => Promise<boolean>; onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [form, setForm] = useState<typeof blank>(row);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify({ ...row, ...form }) !== JSON.stringify(row);

  return (
    <Card
      title={row.name || "the quote"} onClose={onClose}
      actions={<><Btn onClick={() => onMove(-1)} aria-label="move up">↑</Btn><Btn onClick={() => onMove(1)} aria-label="move down">↓</Btn></>}
    >
      <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void onSave(form).finally(() => setBusy(false)); }}>
        <Form value={form} onChange={setForm} />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save" : "saved"}</Btn>
          <Btn size="md" onClick={() => setForm(row)} disabled={!dirty}>undo</Btn>
          <Danger size="md" onConfirm={onDelete} />
        </div>
      </form>
    </Card>
  );
}

function NewQuote({ onCancel, onCreate }: { onCancel: () => void; onCreate: (draft: typeof blank) => Promise<boolean> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="new quote" onClose={onCancel}>
      <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void onCreate(draft).then((ok) => { if (ok) setDraft(blank); setBusy(false); }); }}>
        <Form value={draft} onChange={setDraft} />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy}>{busy ? "adding…" : "add quote"}</Btn>
          <Btn size="md" onClick={onCancel}>cancel</Btn>
        </div>
      </form>
    </Card>
  );
}
