"use client";
// The blog. Write in markdown, save as a draft, publish when it is ready.

import { useState } from "react";
import { Area, Check, Chips, Empty, Field, Skeleton, Text, useResource, type WithId } from "../kit";

interface Row extends WithId {
  slug: string; title: string; excerpt: string; body: string; coverImage: string;
  tags: string[]; readingMinutes: number; published: boolean; publishedAt: string | null;
}
const blank = { slug: "", title: "", excerpt: "", body: "", coverImage: "", tags: [] as string[], readingMinutes: 1, published: false };
const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 128);
const minutes = (body: string): number => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

export default function PostsPanel() {
  const { items, loading, create, update, remove } = useResource<Row>("posts");
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState(blank);
  const [adding, setAdding] = useState(false);

  if (loading) return <Skeleton rows={3} />;
  return (
    <>
      <div className="adm__list">
        {items.map((row) => (
          <div key={row.id} className="sf row">
            <div className="sf__in">
              <div className="row__top">
                <h3>{row.title || "untitled"}</h3>
                <span className="tag">/{row.slug}</span>
                <span className={`tag ${row.published ? "on" : "warn"}`}>{row.published ? "published" : "draft"}</span>
                <span className="tag">{row.readingMinutes} min</span>
                <div className="row__acts">
                  <button className="btn btn--sm" type="button" onClick={() => setOpen(open === row.id ? null : row.id)}>{open === row.id ? "close" : "edit"}</button>
                  <button className="btn btn--sm" type="button" onClick={() => void update({ id: row.id, published: !row.published })}>{row.published ? "unpublish" : "publish"}</button>
                  <button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button>
                </div>
              </div>
              {open === row.id && (
                <div className="fields">
                  <div className="fields fields--2">
                    <Field label="title"><Text value={row.title} onChange={(v) => void update({ id: row.id, title: v })} /></Field>
                    <Field label="slug"><Text value={row.slug} onChange={(v) => void update({ id: row.id, slug: v })} /></Field>
                  </div>
                  <Field label="excerpt" hint="the index and the meta description"><Area value={row.excerpt} onChange={(v) => void update({ id: row.id, excerpt: v })} /></Field>
                  <Field label="body" hint="markdown: ## headings, lists, `code`, fences, links, images">
                    <Area value={row.body} onChange={(v) => void update({ id: row.id, body: v, readingMinutes: minutes(v) })} tall />
                  </Field>
                  <div className="fields fields--2">
                    <Field label="tags"><Chips value={row.tags} onChange={(v) => void update({ id: row.id, tags: v })} /></Field>
                    <Field label="cover image url"><Text value={row.coverImage} onChange={(v) => void update({ id: row.id, coverImage: v })} /></Field>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No posts yet. The blog link only appears on the site once one is published." />}
      </div>
      <div style={{ marginTop: 18 }}>
        {adding ? (
          <form className="fields" onSubmit={(e) => { e.preventDefault(); void create({ ...draft, readingMinutes: minutes(draft.body) }).then((ok) => { if (ok) { setDraft(blank); setAdding(false); } }); }}>
            <div className="fields fields--2">
              <Field label="title"><Text value={draft.title} onChange={(v) => setDraft({ ...draft, title: v, slug: draft.slug || slugify(v) })} required /></Field>
              <Field label="slug"><Text value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: slugify(v) })} required /></Field>
            </div>
            <Field label="excerpt"><Area value={draft.excerpt} onChange={(v) => setDraft({ ...draft, excerpt: v })} /></Field>
            <Field label="body" hint="markdown"><Area value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} tall /></Field>
            <Check label="publish immediately" checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--primary" type="submit">create post</button>
              <button className="btn" type="button" onClick={() => setAdding(false)}>cancel</button>
            </div>
          </form>
        ) : <button className="btn btn--primary" type="button" onClick={() => setAdding(true)}>new post</button>}
      </div>
    </>
  );
}
