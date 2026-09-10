"use client";
// The flight deck's hidden lines. One of these is whispered whenever a visitor finds a secret, so the
// pool wants to stay short and worth reading. `kind` decides which secret can quote it.
//
// This is the reference list panel: toolbar (search · filters · count) → table → detail box. Every
// other list panel in the admin follows the same three parts, so the shapes are worth reading once.

import { useState } from "react";
import {
  Area, Badge, Btn, Card, Chip, Count, Danger, Empty, Field, Pager, Search, Select, Skeleton, Table,
  Toolbar, applySort, pageOf, useResource, usePager, useSearch, useSort, type Column, type WithId,
} from "../kit";

type Kind = "space" | "me" | "random";
const KINDS: readonly Kind[] = ["space", "me", "random"];
const isKind = (v: string): v is Kind => (KINDS as readonly string[]).includes(v);
type Shown = "all" | "visible" | "hidden";

interface Row extends WithId { kind: string; text: string; visible: boolean }
const blank: { kind: Kind; text: string; visible: boolean } = { kind: "space", text: "", visible: true };

export default function FactsPanel() {
  const { items, loading, create, update, remove, move } = useResource<Row>("facts");
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [shown, setShown] = useState<Shown>("all");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { sort, toggle } = useSort();

  const found = useSearch(items, term, (r) => [r.text, r.kind]);
  const rows = found.filter((r) => (kind === "all" || r.kind === kind) && (shown === "all" || r.visible === (shown === "visible")));
  const pager = usePager(rows.length);
  const page = pageOf(applySort(rows, COLUMNS, sort), pager);
  const current = sel === null ? null : items.find((r) => r.id === sel) ?? null;

  if (loading) return <Skeleton rows={4} />;

  const open = (row: Row): void => { setAdding(false); setSel(row.id); };
  const close = (): void => { setSel(null); setAdding(false); };

  return (
    <div className="split" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search the lines…" />
          <div className="tbar__chips">
            <Chip on={kind === "all"} onClick={() => setKind("all")}>all</Chip>
            {KINDS.map((k) => (
              <Chip key={k} on={kind === k} onClick={() => setKind(k)} count={items.filter((r) => r.kind === k).length}>{k}</Chip>
            ))}
          </div>
          <div className="tbar__chips">
            <Chip on={shown === "visible"} onClick={() => setShown(shown === "visible" ? "all" : "visible")}>visible</Chip>
            <Chip on={shown === "hidden"} onClick={() => setShown(shown === "hidden" ? "all" : "hidden")}>hidden</Chip>
          </div>
          <Count shown={rows.length} total={items.length} noun="lines" />
          <Btn kind="primary" onClick={() => { setSel(null); setAdding(true); }}>new line</Btn>
        </Toolbar>

        {rows.length === 0 ? (
          <Empty
            icon="✦"
            text={items.length ? "No line matches that filter." : "No lines yet. The deck falls back to its built-in pool until you add one."}
            action={items.length ? undefined : "add the first line"}
            onAction={items.length ? undefined : () => setAdding(true)}
          />
        ) : (
          <>
            <Table
              label="secret lines" columns={COLUMNS} rows={page} keyOf={(r) => r.id}
              selected={sel} onSelect={open} sort={sort} onSort={toggle}
              actions={(r) => (
                <>
                  <Btn onClick={() => open(r)}>edit</Btn>
                  <Btn onClick={() => void update({ id: r.id, visible: !r.visible })}>{r.visible ? "hide" : "show"}</Btn>
                  <Danger onConfirm={() => void remove(r.id)} />
                </>
              )}
            />
            <Pager state={pager} total={rows.length} noun="lines" />
          </>
        )}
      </div>

      {adding && <NewLine onCancel={close} onCreate={async (draft) => { const ok = await create(draft); if (ok) setAdding(false); return ok; }} />}
      {current && !adding && (
        <EditLine
          key={current.id} row={current} onClose={close}
          onSave={(patch) => update({ id: current.id, ...patch })}
          onDelete={() => { void remove(current.id); close(); }}
          onMove={(dir) => void move(current.id, dir)}
        />
      )}
    </div>
  );
}

const COLUMNS: readonly Column<Row>[] = [
  { key: "kind", label: "kind", width: "88px", value: (r) => r.kind, cell: (r) => <Badge tone={r.kind === "me" ? "cool" : r.kind === "space" ? "on" : "mute"}>{r.kind}</Badge> },
  { key: "text", label: "line", value: (r) => r.text, cell: (r) => <span className="clamp">{r.text || "empty"}</span> },
  { key: "visible", label: "on the deck", width: "110px", value: (r) => (r.visible ? 1 : 0), cell: (r) => (r.visible ? <Badge tone="on">visible</Badge> : <Badge tone="off">hidden</Badge>) },
];

function NewLine({ onCancel, onCreate }: { onCancel: () => void; onCreate: (draft: typeof blank) => Promise<boolean> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="new line" onClose={onCancel}>
      <form
        className="fields"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void onCreate(draft).then((ok) => { if (ok) setDraft(blank); setBusy(false); });
        }}
      >
        <Field label="line" hint="one sentence"><Area value={draft.text} onChange={(v) => setDraft({ ...draft, text: v })} required /></Field>
        <Field label="kind" tip="space trivia · a note about you · anything unfiled. The secret that fires picks a fitting kind.">
          <Select value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} options={KINDS} />
        </Field>
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy}>{busy ? "adding…" : "add line"}</Btn>
          <Btn size="md" onClick={onCancel}>cancel</Btn>
        </div>
      </form>
    </Card>
  );
}

function EditLine({ row, onClose, onSave, onDelete, onMove }: {
  row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => Promise<boolean>; onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [text, setText] = useState(row.text);
  const [kind, setKind] = useState<Kind>(isKind(row.kind) ? row.kind : "random");
  const [busy, setBusy] = useState(false);
  const dirty = text !== row.text || kind !== row.kind;

  return (
    <Card
      title="the line" onClose={onClose}
      actions={<><Btn onClick={() => onMove(-1)} aria-label="move up">↑</Btn><Btn onClick={() => onMove(1)} aria-label="move down">↓</Btn></>}
    >
      <form
        className="fields"
        onSubmit={(e) => { e.preventDefault(); setBusy(true); void onSave({ text, kind }).finally(() => setBusy(false)); }}
      >
        <Field label="line" hint="one sentence"><Area value={text} onChange={setText} required /></Field>
        <Field label="kind" tip="space trivia · a note about you · anything unfiled. The secret that fires picks a fitting kind.">
          <Select value={kind} onChange={setKind} options={KINDS} />
        </Field>
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save" : "saved"}</Btn>
          <Btn size="md" onClick={() => void onSave({ visible: !row.visible })}>{row.visible ? "hide" : "show"}</Btn>
          <Danger size="md" onConfirm={onDelete} />
        </div>
      </form>
    </Card>
  );
}
