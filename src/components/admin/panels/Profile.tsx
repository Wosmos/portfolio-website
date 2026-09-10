"use client";
// Name, contact details and the two descriptions: the long résumé summary the page shows, and the
// short one search engines get.

import { useState } from "react";
import { Area, Btn, Field, Section, Skeleton, Text, useSingle } from "../kit";

interface Profile {
  id: number; name: string; fullName: string; role: string; line: string; positioning: string;
  summary: string; metaDescription: string; location: string; tz: string; tzLabel: string;
  email: string; phone: string; cv: string; github: string; linkedin: string; hashnode: string; npmCard: string;
}

export default function ProfilePanel() {
  const { value, loading, save } = useSingle<Profile>("profile");
  if (loading || !value) return <Skeleton rows={5} />;
  return <Form key={value.id} initial={value} save={save} />;
}

function Form({ initial, save }: { initial: Profile; save: (patch: Partial<Profile>) => Promise<boolean> }) {
  const [form, setForm] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Profile>(k: K) => (v: Profile[K]): void => setForm({ ...form, [k]: v });
  const metaLength = form.metaDescription.length;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void save(form).finally(() => setBusy(false)); }}>
      <Section title="who you are" />
      <div className="fields fields--2">
        <Field label="display name"><Text value={form.name} onChange={set("name")} required /></Field>
        <Field label="full name" tip="goes into the structured data search engines read, not onto the page."><Text value={form.fullName} onChange={set("fullName")} /></Field>
        <Field label="role"><Text value={form.role} onChange={set("role")} /></Field>
        <Field label="one-liner" hint="under the name"><Text value={form.line} onChange={set("line")} /></Field>
      </div>

      <Section title="what you say" />
      <Field label="positioning" hint="the short claim"><Area value={form.positioning} onChange={set("positioning")} /></Field>
      <Field label="summary" hint="the paragraph on the reading site"><Area value={form.summary} onChange={set("summary")} tall /></Field>
      <Field
        label={`meta description · ${metaLength}/160`}
        tip="what Google prints under the link. Past 160 characters it gets cut off mid-sentence."
        hint={metaLength > 160 ? "too long for search results" : undefined}
      >
        <Area value={form.metaDescription} onChange={set("metaDescription")} />
      </Field>

      <Section title="where to find you" />
      <div className="fields fields--3">
        <Field label="location"><Text value={form.location} onChange={set("location")} /></Field>
        <Field label="timezone" tip="an IANA name like Asia/Karachi — the site works out your local time from it."><Text value={form.tz} onChange={set("tz")} /></Field>
        <Field label="timezone label"><Text value={form.tzLabel} onChange={set("tzLabel")} /></Field>
        <Field label="email"><Text value={form.email} onChange={set("email")} /></Field>
        <Field label="phone"><Text value={form.phone} onChange={set("phone")} /></Field>
        <Field label="résumé path"><Text value={form.cv} onChange={set("cv")} /></Field>
        <Field label="github"><Text value={form.github} onChange={set("github")} /></Field>
        <Field label="linkedin"><Text value={form.linkedin} onChange={set("linkedin")} /></Field>
        <Field label="hashnode"><Text value={form.hashnode} onChange={set("hashnode")} /></Field>
      </div>

      <div className="acts">
        <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save profile" : "saved"}</Btn>
        <Btn size="md" onClick={() => setForm(initial)} disabled={!dirty}>undo</Btn>
      </div>
    </form>
  );
}
