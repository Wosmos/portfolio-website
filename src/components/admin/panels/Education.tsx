"use client";

import { useState } from "react";
import { Empty, Field, Skeleton, Text, useDragSort, useResource, type WithId } from "../kit";

interface Row extends WithId { school: string; degree: string; start: string; end: string; grade: string }
const blank = { school: "", degree: "", start: "", end: "", grade: "" };

export default function EducationPanel() {
  const { items, loading, create, update, remove, reorder } = useResource<Row>("education");
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
                <h3>{row.degree || "untitled"}</h3>
                <span className="tag">{row.school}</span>
                <div className="row__acts"><button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button></div>
              </div>
              <div className="fields fields--2">
                <Field label="degree"><Text value={row.degree} onChange={(v) => void update({ id: row.id, degree: v })} /></Field>
                <Field label="school"><Text value={row.school} onChange={(v) => void update({ id: row.id, school: v })} /></Field>
                <Field label="from"><Text value={row.start} onChange={(v) => void update({ id: row.id, start: v })} /></Field>
                <Field label="to"><Text value={row.end} onChange={(v) => void update({ id: row.id, end: v })} /></Field>
                <Field label="grade"><Text value={row.grade} onChange={(v) => void update({ id: row.id, grade: v })} /></Field>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <Empty text="Nothing here yet. Add the first entry below." />}
      </div>
      <form className="fields fields--3" style={{ marginTop: 18 }} onSubmit={(e) => { e.preventDefault(); void create(draft).then((ok) => ok && setDraft(blank)); }}>
        <Field label="degree"><Text value={draft.degree} onChange={(v) => setDraft({ ...draft, degree: v })} required /></Field>
        <Field label="school"><Text value={draft.school} onChange={(v) => setDraft({ ...draft, school: v })} required /></Field>
        <Field label="grade"><Text value={draft.grade} onChange={(v) => setDraft({ ...draft, grade: v })} /></Field>
        <Field label="from"><Text value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} /></Field>
        <Field label="to"><Text value={draft.end} onChange={(v) => setDraft({ ...draft, end: v })} /></Field>
        <div className="fld" style={{ alignSelf: "end" }}><button className="btn btn--primary" type="submit">add</button></div>
      </form>
    </>
  );
}
