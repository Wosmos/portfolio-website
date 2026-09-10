"use client";

import { useState } from "react";
import { Area, Check, Chips, Empty, Field, Lines, Skeleton, Text, useDragSort, useResource, type WithId } from "../kit";

interface Row extends WithId {
  company: string; title: string; location: string; start: string; end: string | null;
  note: string; bullets: string[]; stack: string[]; visible: boolean;
}
const blank = { company: "", title: "", location: "", start: "", end: null as string | null, note: "", bullets: [] as string[], stack: [] as string[], visible: true };

export default function ExperiencePanel() {
  const { items, loading, create, update, remove, reorder } = useResource<Row>("experience");
  const [draft, setDraft] = useState(blank);
  const drag = useDragSort(items, (next) => void reorder(next));

  if (loading) return <Skeleton rows={3} />;
  return (
    <>
      <div className="adm__list">
        {items.map((row, i) => (
          <div key={row.id} className={`sf row${drag.over === i ? " is-over" : ""}`} {...drag.props(i)}>
            <div className="sf__in">
              <div className="row__top">
                <span className="row__grip" aria-hidden="true">⠿</span>
                <h3>{row.title}</h3>
                <span className="tag">{row.company}</span>
                <span className={`tag ${row.end ? "" : "on"}`}>{row.start} → {row.end ?? "present"}</span>
                {!row.visible && <span className="tag off">hidden</span>}
                <div className="row__acts">
                  <button className="btn btn--sm" type="button" onClick={() => void update({ id: row.id, visible: !row.visible })}>{row.visible ? "hide" : "show"}</button>
                  <button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button>
                </div>
              </div>
              <div className="fields fields--2">
                <Field label="title"><Text value={row.title} onChange={(v) => void update({ id: row.id, title: v })} /></Field>
                <Field label="company"><Text value={row.company} onChange={(v) => void update({ id: row.id, company: v })} /></Field>
                <Field label="location"><Text value={row.location} onChange={(v) => void update({ id: row.id, location: v })} /></Field>
                <Field label="dates" hint="YYYY-MM · leave the end empty for present">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Text value={row.start} onChange={(v) => void update({ id: row.id, start: v })} placeholder="2025-01" />
                    <Text value={row.end ?? ""} onChange={(v) => void update({ id: row.id, end: v || null })} placeholder="present" />
                  </div>
                </Field>
              </div>
              <Field label="one-line note" hint="the flight deck shows this"><Area value={row.note} onChange={(v) => void update({ id: row.id, note: v })} /></Field>
              <Field label="bullets" hint="one per line"><Lines value={row.bullets} onChange={(v) => void update({ id: row.id, bullets: v })} /></Field>
              <Field label="stack"><Chips value={row.stack} onChange={(v) => void update({ id: row.id, stack: v })} /></Field>
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No jobs yet." />}
      </div>
      <form className="fields" style={{ marginTop: 18 }} onSubmit={(e) => { e.preventDefault(); void create(draft).then((ok) => ok && setDraft(blank)); }}>
        <div className="fields fields--3">
          <Field label="title"><Text value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} required /></Field>
          <Field label="company"><Text value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })} required /></Field>
          <Field label="start" hint="YYYY-MM"><Text value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} required /></Field>
        </div>
        <Check label="visible on the site" checked={draft.visible} onChange={(v) => setDraft({ ...draft, visible: v })} />
        <div><button className="btn btn--primary" type="submit">add job</button></div>
      </form>
    </>
  );
}
