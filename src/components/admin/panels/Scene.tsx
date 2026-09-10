"use client";
// The solar system's global values. These used to be constants in the shader file; now they are a row.

import { useState } from "react";
import { Btn, Colour, Field, Num, Section, Skeleton, Slider, useSingle } from "../kit";

interface Scene {
  id: number; sunRadius: number; sunColorCore: number; sunColorEdge: number; sunIntensity: number;
  orbitScale: number; beltRadius: number; beltDensity: number; starCount: number;
  nebulaA: number; nebulaB: number; bloom: number; fov: number;
}

export default function ScenePanel() {
  const { value, loading, save } = useSingle<Scene>("scene");
  if (loading || !value) return <Skeleton rows={4} />;
  return <Form key={value.id} initial={value} save={save} />;
}

function Form({ initial, save }: { initial: Scene; save: (patch: Partial<Scene>) => Promise<boolean> }) {
  const [form, setForm] = useState<Scene>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Scene>(k: K) => (v: Scene[K]): void => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void save(form).finally(() => setBusy(false)); }}>
      <Section title="the sun" />
      <div className="fields fields--2">
        <Field label="radius" tip="in scene units. Planets are 0.5–1.6, so the sun dwarfs them at 6."><Num value={form.sunRadius} onChange={set("sunRadius")} step={0.25} /></Field>
        <Slider label="brightness" value={form.sunIntensity} onChange={set("sunIntensity")} min={0.2} max={2} step={0.05} tip="scales the light every planet is lit by, and the sun's own bloom." />
        <Field label="core colour"><Colour value={form.sunColorCore} onChange={set("sunColorCore")} /></Field>
        <Field label="edge colour"><Colour value={form.sunColorEdge} onChange={set("sunColorEdge")} /></Field>
      </div>

      <Section title="the system" />
      <div className="fields fields--3">
        <Field label="orbit scale" tip="multiplies every planet's distance from the sun at once, so the whole system spreads or tightens."><Num value={form.orbitScale} onChange={set("orbitScale")} step={0.05} /></Field>
        <Field label="asteroid belt radius"><Num value={form.beltRadius} onChange={set("beltRadius")} step={0.5} /></Field>
        <Field label="belt density" tip="how many rocks the belt draws. Every one is an instance, so this is the belt's whole cost."><Num value={form.beltDensity} onChange={set("beltDensity")} step={100} /></Field>
      </div>

      <Section title="the sky" />
      <div className="fields fields--3">
        <Field label="stars" tip="one point sprite each, drawn in a single call — thousands are cheap."><Num value={form.starCount} onChange={set("starCount")} step={200} /></Field>
        <Field label="nebula, first colour"><Colour value={form.nebulaA} onChange={set("nebulaA")} /></Field>
        <Field label="nebula, second colour"><Colour value={form.nebulaB} onChange={set("nebulaB")} /></Field>
      </div>

      <Section title="the camera" />
      <div className="fields fields--2">
        <Field label="field of view" tip="degrees. 42 is the default; higher feels wider and faster, lower feels telephoto."><Num value={form.fov} onChange={set("fov")} step={1} /></Field>
        <Slider label="bloom" value={form.bloom} onChange={set("bloom")} min={0} max={2} step={0.05} tip="how far bright pixels bleed. 0 turns the post-processing glow off entirely." />
      </div>

      <p className="hint">The deck reads these on load, so a change shows on the next visit to /ship.</p>
      <div className="acts">
        <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save the system" : "saved"}</Btn>
        <Btn size="md" onClick={() => setForm(initial)} disabled={!dirty}>undo</Btn>
      </div>
    </form>
  );
}
