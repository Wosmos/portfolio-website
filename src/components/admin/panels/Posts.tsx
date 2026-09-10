"use client";
// The blog. Write in markdown, save as a draft, publish when it is ready. Toolbar, table, detail box —
// the pattern from panels/Facts.tsx, with the editor full width because a body needs the room.

import { useState } from "react";
import {
  Area, Badge, Btn, Card, Check, Chips, Chip, Count, Danger, Empty, Field, Pager, Search, Skeleton, Table,
  Text, Toolbar, applySort, pageOf, useResource, usePager, useSearch, useSort, type Column, type WithId,
} from "../kit";

interface Row extends WithId {
  slug: string; title: string; excerpt: string; body: string; coverImage: string;
  tags: string[]; readingMinutes: number; published: boolean; publishedAt: string | null;
}
const blank = { slug: "", title: "", excerpt: "", body: "", coverImage: "", tags: [] as string[], readingMinutes: 1, published: false };
const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 128);
const minutes = (body: string): number => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

const COLUMNS: readonly Column<Row>[] = [
  { key: "title", label: "post", value: (r) => r.title, cell: (r) => <><b>{r.title || "untitled"}</b><small className="sub">/{r.slug}</small></> },
  { key: "tags", label: "tags", width: "180px", value: (r) => r.tags.join(", "), cell: (r) => <span className="clamp">{r.tags.join(" · ") || "—"}</span> },
  { key: "readingMinutes", label: "read", width: "80px", num: true, value: (r) => r.readingMinutes, cell: (r) => `${r.readingMinutes}m` },
  { key: "published", label: "state", width: "116px", value: (r) => (r.published ? 0 : 1), cell: (r) => (r.published ? <Badge tone="on">published</Badge> : <Badge tone="warn">draft</Badge>) },
];

export default function PostsPanel() {
  const { items, loading, create, update, remove } = useResource<Row>("posts");
  const [term, setTerm] = useState("");
  const [only, setOnly] = useState<"all" | "published" | "draft">("all");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { sort, toggle } = useSort();

  const found = useSearch(items, term, (r) => [r.title, r.slug, r.excerpt, r.tags.join(" ")]);
  const rows = found.filter((r) => only === "all" || r.published === (only === "published"));
  const pager = usePager(rows.length);
  const page = pageOf(applySort(rows, COLUMNS, sort), pager);
  const current = sel === null ? null : items.find((r) => r.id === sel) ?? null;

  if (loading) return <Skeleton rows={4} />;
  const close = (): void => { setSel(null); setAdding(false); };

  return (
    <div className="stack" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search posts…" />
          <div className="tbar__chips">
            <Chip on={only === "all"} onClick={() => setOnly("all")}>all</Chip>
            <Chip on={only === "published"} onClick={() => setOnly("published")} count={items.filter((r) => r.published).length}>published</Chip>
            <Chip on={only === "draft"} onClick={() => setOnly("draft")} count={items.filter((r) => !r.published).length}>drafts</Chip>
          </div>
          <Count shown={rows.length} total={items.length} noun="posts" />
          <Btn kind="primary" onClick={() => { setSel(null); setAdding(true); }}>new post</Btn>
        </Toolbar>

        {rows.length === 0 ? (
          <Empty
            icon="✎" text={items.length ? "No post matches that filter." : "No posts yet. The blog link only appears on the site once one is published."}
            action={items.length ? undefined : "write the first post"} onAction={items.length ? undefined : () => setAdding(true)}
          />
        ) : (
          <>
            <Table
              label="posts" columns={COLUMNS} rows={page} keyOf={(r) => r.id}
              selected={sel} onSelect={(r) => { setAdding(false); setSel(r.id); }} sort={sort} onSort={toggle}
              actions={(r) => (
                <>
                  <Btn onClick={() => { setAdding(false); setSel(sel === r.id ? null : r.id); }}>{sel === r.id ? "close" : "edit"}</Btn>
                  <Btn onClick={() => void update({ id: r.id, published: !r.published })}>{r.published ? "unpublish" : "publish"}</Btn>
                  <Danger onConfirm={() => { if (sel === r.id) setSel(null); void remove(r.id); }} />
                </>
              )}
            />
            <Pager state={pager} total={rows.length} noun="posts" />
          </>
        )}
      </div>

      {adding && <NewPost onCancel={close} onCreate={async (d) => { const ok = await create({ ...d, readingMinutes: minutes(d.body) }); if (ok) setAdding(false); return ok; }} />}
      {current && !adding && (
        <EditPost
          key={current.id} row={current} onClose={close}
          onSave={(patch) => update({ id: current.id, ...patch })}
          onDelete={() => { void remove(current.id); close(); }}
        />
      )}
    </div>
  );
}

function EditPost({ row, onClose, onSave, onDelete }: {
  row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => Promise<boolean>; onDelete: () => void;
}) {
  const [form, setForm] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Row>(k: K) => (v: Row[K]): void => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(row);

  return (
    <Card
      title={row.title || "untitled"} onClose={onClose}
      actions={<a className="btn btn--sm" href={`/read/blog/${row.slug}`} target="_blank" rel="noopener">↗ view</a>}
    >
      <form
        className="fields"
        onSubmit={(e) => { e.preventDefault(); setBusy(true); void onSave({ ...form, readingMinutes: minutes(form.body) }).finally(() => setBusy(false)); }}
      >
        <div className="fields fields--2">
          <Field label="title"><Text value={form.title} onChange={set("title")} required /></Field>
          <Field label="slug" tip="the URL segment. Changing it breaks any link already out there."><Text value={form.slug} onChange={(v) => setForm({ ...form, slug: slugify(v) })} required /></Field>
        </div>
        <Field label="excerpt" hint="the index and the meta description"><Area value={form.excerpt} onChange={set("excerpt")} /></Field>
        <Field label="body" hint="markdown: ## headings, lists, `code`, fences, links, images">
          <Area value={form.body} onChange={set("body")} tall />
        </Field>
        <div className="fields fields--2">
          <Field label="tags"><Chips value={form.tags} onChange={set("tags")} /></Field>
          <Field label="cover image url"><Text value={form.coverImage} onChange={set("coverImage")} /></Field>
        </div>
        <Check label="published" checked={form.published} onChange={set("published")} />
        <p className="hint">Reading time is recounted from the body on every save — about {minutes(form.body)} minutes right now.</p>
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save the post" : "saved"}</Btn>
          <Btn size="md" onClick={() => setForm(row)} disabled={!dirty}>undo</Btn>
          <Danger size="md" onConfirm={onDelete} />
        </div>
      </form>
    </Card>
  );
}

function NewPost({ onCancel, onCreate }: { onCancel: () => void; onCreate: (draft: typeof blank) => Promise<boolean> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="new post" onClose={onCancel}>
      <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void onCreate(draft).then((ok) => { if (ok) setDraft(blank); setBusy(false); }); }}>
        <div className="fields fields--2">
          <Field label="title"><Text value={draft.title} onChange={(v) => setDraft({ ...draft, title: v, slug: draft.slug || slugify(v) })} required /></Field>
          <Field label="slug"><Text value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: slugify(v) })} required /></Field>
        </div>
        <Field label="excerpt"><Area value={draft.excerpt} onChange={(v) => setDraft({ ...draft, excerpt: v })} /></Field>
        <Field label="body" hint="markdown"><Area value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} tall /></Field>
        <Check label="publish immediately" checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy}>{busy ? "creating…" : "create post"}</Btn>
          <Btn size="md" onClick={onCancel}>cancel</Btn>
        </div>
      </form>
    </Card>
  );
}
