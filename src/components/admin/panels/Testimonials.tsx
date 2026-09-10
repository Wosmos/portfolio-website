"use client";

import { useState } from "react";
import { Area, Check, Empty, Field, Skeleton, Text, useDragSort, useResource, type WithId } from "../kit";

interface Row extends WithId {
  quote: string; name: string; role: string; company: string; link: string;
  placeholder: boolean; visible: boolean;
}
const blank = { quote: "", name: "", role: "", company: "", link: "", placeholder: false, visible: true };

export default function TestimonialsPanel() {
  const { items, loading, create, update, remove, reorder } = useResource<Row>("testimonials");
  const [draft, setDraft] = useState(blank);
  const drag = useDragSort(items, (next) => void reorder(next));

  if (loading) return <Skeleton rows={2} />;
  return (
    <>
      <div className="adm__list">
        {items.map((row, i) => (
          <div key={row.id} className={`sf row${drag.over === i ? " is-over" : ""}`} {...drag.props(i)}>
            <div className="sf__in">
              <div className="row__top">
                <span className="row__grip" aria-hidden="true">⠿</span>
                <h3>{row.name || "unnamed"}</h3>
                <span className="tag">{row.role}{row.company ? ` · ${row.company}` : ""}</span>
                {row.placeholder && <span className="tag warn">sample</span>}
                {!row.visible && <span className="tag off">hidden</span>}
                <div className="row__acts">
                  <button className="btn btn--sm" type="button" onClick={() => void update({ id: row.id, visible: !row.visible })}>{row.visible ? "hide" : "show"}</button>
                  <button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button>
                </div>
              </div>
              <Field label="quote"><Area value={row.quote} onChange={(v) => void update({ id: row.id, quote: v })} /></Field>
              <div className="fields fields--3">
                <Field label="name"><Text value={row.name} onChange={(v) => void update({ id: row.id, name: v })} /></Field>
                <Field label="role"><Text value={row.role} onChange={(v) => void update({ id: row.id, role: v })} /></Field>
                <Field label="company"><Text value={row.company} onChange={(v) => void update({ id: row.id, company: v })} /></Field>
              </div>
              <Field label="link" hint="linkedin, or wherever they wrote it"><Text value={row.link} onChange={(v) => void update({ id: row.id, link: v })} /></Field>
              <Check label="this is a sample, label it as one on the site" checked={row.placeholder} onChange={(v) => void update({ id: row.id, placeholder: v })} />
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No quotes yet. The section hides itself when there are none." />}
      </div>
      <form className="fields" style={{ marginTop: 18 }} onSubmit={(e) => { e.preventDefault(); void create(draft).then((ok) => ok && setDraft(blank)); }}>
        <Field label="quote"><Area value={draft.quote} onChange={(v) => setDraft({ ...draft, quote: v })} required /></Field>
        <div className="fields fields--3">
          <Field label="name"><Text value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required /></Field>
          <Field label="role"><Text value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} /></Field>
          <Field label="company"><Text value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })} /></Field>
        </div>
        <div><button className="btn btn--primary" type="submit">add quote</button></div>
      </form>
    </>
  );
}
