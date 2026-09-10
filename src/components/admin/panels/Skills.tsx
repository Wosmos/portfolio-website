"use client";

import { useState } from "react";
import { Chips, Empty, Field, Skeleton, Text, useDragSort, useResource, type WithId } from "../kit";

interface Row extends WithId { group: string; items: string[] }

export default function SkillsPanel() {
  const { items, loading, create, update, remove, reorder } = useResource<Row>("skills");
  const [name, setName] = useState("");
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
                <h3>{row.group}</h3>
                <span className="tag">{row.items.length} items</span>
                <div className="row__acts"><button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button></div>
              </div>
              <Field label="group name"><Text value={row.group} onChange={(v) => void update({ id: row.id, group: v })} /></Field>
              <Field label="items" hint="enter to add, backspace to remove"><Chips value={row.items} onChange={(v) => void update({ id: row.id, items: v })} /></Field>
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No groups yet." />}
      </div>
      <form className="fields fields--2" style={{ marginTop: 18 }} onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; void create({ group: name.trim(), items: [] }).then((ok) => ok && setName("")); }}>
        <Field label="new group"><Text value={name} onChange={setName} placeholder="languages" /></Field>
        <div className="fld" style={{ alignSelf: "end" }}><button className="btn btn--primary" type="submit">add group</button></div>
      </form>
    </>
  );
}
