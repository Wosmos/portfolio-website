"use client";
// Degrees and grades. Toolbar, table, detail box — the pattern from panels/Facts.tsx.

import { useState } from "react";
import {
  Btn, Card, Count, Danger, Empty, Field, Pager, Search, Skeleton, Table, Text, Toolbar,
  applySort, pageOf, useResource, usePager, useSearch, useSort, type Column, type WithId,
} from "../kit";

interface Row extends WithId { school: string; degree: string; start: string; end: string; grade: string }
const blank = { school: "", degree: "", start: "", end: "", grade: "" };

const COLUMNS: readonly Column<Row>[] = [
  { key: "degree", label: "degree", value: (r) => r.degree, cell: (r) => <><b>{r.degree || "untitled"}</b><small className="sub">{r.school}</small></> },
  { key: "start", label: "from", width: "92px", value: (r) => r.start, cell: (r) => r.start || "—" },
  { key: "end", label: "to", width: "92px", value: (r) => r.end, cell: (r) => r.end || "—" },
  { key: "grade", label: "grade", width: "110px", value: (r) => r.grade, cell: (r) => r.grade || "—" },
];

export default function EducationPanel() {
  const { items, loading, create, update, remove, move } = useResource<Row>("education");
  const [term, setTerm] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { sort, toggle } = useSort();

  const rows = useSearch(items, term, (r) => [r.degree, r.school, r.grade]);
  const pager = usePager(rows.length);
  const page = pageOf(applySort(rows, COLUMNS, sort), pager);
  const current = sel === null ? null : items.find((r) => r.id === sel) ?? null;

  if (loading) return <Skeleton rows={3} />;
  const close = (): void => { setSel(null); setAdding(false); };

  return (
    <div className="split" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search degrees…" />
          <Count shown={rows.length} total={items.length} noun="entries" />
          <Btn kind="primary" onClick={() => { setSel(null); setAdding(true); }}>new entry</Btn>
        </Toolbar>

        {rows.length === 0 ? (
          <Empty
            icon="⌂" text={items.length ? "Nothing matches that." : "Nothing here yet. These show on the résumé and the reading site."}
            action={items.length ? undefined : "add the first entry"} onAction={items.length ? undefined : () => setAdding(true)}
          />
        ) : (
          <>
            <Table
              label="education" columns={COLUMNS} rows={page} keyOf={(r) => r.id}
              selected={sel} onSelect={(r) => { setAdding(false); setSel(r.id); }} sort={sort} onSort={toggle}
              actions={(r) => (
                <>
                  <Btn onClick={() => { setAdding(false); setSel(r.id); }}>edit</Btn>
                  <Danger onConfirm={() => { if (sel === r.id) setSel(null); void remove(r.id); }} />
                </>
              )}
            />
            <Pager state={pager} total={rows.length} noun="entries" />
          </>
        )}
      </div>

      {adding && <NewEntry onCancel={close} onCreate={async (d) => { const ok = await create(d); if (ok) setAdding(false); return ok; }} />}
      {current && !adding && (
        <EditEntry
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
      <Field label="degree"><Text value={value.degree} onChange={(v) => onChange({ ...value, degree: v })} required /></Field>
      <Field label="school"><Text value={value.school} onChange={(v) => onChange({ ...value, school: v })} required /></Field>
      <Field label="grade" hint="as it should read"><Text value={value.grade} onChange={(v) => onChange({ ...value, grade: v })} /></Field>
      <div className="fields fields--2">
        <Field label="from"><Text value={value.start} onChange={(v) => onChange({ ...value, start: v })} /></Field>
        <Field label="to"><Text value={value.end} onChange={(v) => onChange({ ...value, end: v })} /></Field>
      </div>
    </>
  );
}

function EditEntry({ row, onClose, onSave, onDelete, onMove }: {
  row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => Promise<boolean>; onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [form, setForm] = useState<typeof blank>(row);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify({ ...row, ...form }) !== JSON.stringify(row);

  return (
    <Card
      title={row.degree || "the entry"} onClose={onClose}
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

function NewEntry({ onCancel, onCreate }: { onCancel: () => void; onCreate: (draft: typeof blank) => Promise<boolean> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="new entry" onClose={onCancel}>
      <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void onCreate(draft).then((ok) => { if (ok) setDraft(blank); setBusy(false); }); }}>
        <Form value={draft} onChange={setDraft} />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy}>{busy ? "adding…" : "add entry"}</Btn>
          <Btn size="md" onClick={onCancel}>cancel</Btn>
        </div>
      </form>
    </Card>
  );
}
