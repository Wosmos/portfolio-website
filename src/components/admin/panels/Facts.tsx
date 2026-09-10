"use client";
// The flight deck's hidden lines. One of these is whispered whenever a visitor finds a secret, so the
// pool wants to stay short and worth reading. `kind` decides which secret can quote it.

import { useState } from "react";
import { Area, Empty, Field, Select, Skeleton, useDragSort, useResource, type WithId } from "../kit";

type Kind = "space" | "me" | "random";
const KINDS: readonly Kind[] = ["space", "me", "random"];
const isKind = (v: string): v is Kind => (KINDS as readonly string[]).includes(v);

interface Row extends WithId { kind: string; text: string; visible: boolean }
const blank: { kind: Kind; text: string; visible: boolean } = { kind: "space", text: "", visible: true };

export default function FactsPanel() {
  const { items, loading, create, update, remove, reorder } = useResource<Row>("facts");
  const [draft, setDraft] = useState(blank);
  const drag = useDragSort(items, (next) => void reorder(next));

  if (loading) return <Skeleton rows={3} />;
  return (
    <>
      <p className="adm__hint">
        Twenty secrets are hidden in the flight deck — a key, a long press, a knock on the nameplate. Each one shows
        one of these lines. Keep them one sentence long.
      </p>
      <div className="adm__list">
        {items.map((row, i) => (
          <div key={row.id} className={`sf row${drag.over === i ? " is-over" : ""}`} {...drag.props(i)}>
            <div className="sf__in">
              <div className="row__top">
                <span className="row__grip" aria-hidden="true">⠿</span>
                <h3>{row.text.slice(0, 60) || "empty"}</h3>
                <span className="tag">{row.kind}</span>
                {!row.visible && <span className="tag off">hidden</span>}
                <div className="row__acts">
                  <button className="btn btn--sm" type="button" onClick={() => void update({ id: row.id, visible: !row.visible })}>{row.visible ? "hide" : "show"}</button>
                  <button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button>
                </div>
              </div>
              <div className="fields fields--2">
                <Field label="line"><Area value={row.text} onChange={(v) => void update({ id: row.id, text: v })} /></Field>
                <Field label="kind" hint="space trivia · about you · anything else">
                  <Select value={isKind(row.kind) ? row.kind : "random"} onChange={(v) => void update({ id: row.id, kind: v })} options={KINDS} />
                </Field>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No lines yet. The deck falls back to its built-in pool." />}
      </div>
      <form className="fields" style={{ marginTop: 18 }} onSubmit={(e) => { e.preventDefault(); void create(draft).then((ok) => ok && setDraft(blank)); }}>
        <Field label="line"><Area value={draft.text} onChange={(v) => setDraft({ ...draft, text: v })} required /></Field>
        <Field label="kind"><Select value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} options={KINDS} /></Field>
        <div><button className="btn btn--primary" type="submit">add line</button></div>
      </form>
    </>
  );
}
