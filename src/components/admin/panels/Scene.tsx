"use client";
// The solar system's global values. These used to be constants in the shader file; now they are a row.

import { useState } from "react";
import { Colour, Field, Num, Skeleton, useSingle } from "../kit";

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
  const set = <K extends keyof Scene>(k: K) => (v: Scene[K]) => setForm({ ...form, [k]: v });

  return (
    <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void save(form).finally(() => setBusy(false)); }}>
      <p className="panel__h">the sun</p>
      <div className="fields fields--2">
        <Field label="radius" hint="planets are 0.5–1.6"><Num value={form.sunRadius} onChange={set("sunRadius")} step={0.25} /></Field>
        <Field label={`brightness · ${form.sunIntensity.toFixed(2)}`}><input type="range" min={0.2} max={2} step={0.05} value={form.sunIntensity} onChange={(e) => set("sunIntensity")(Number(e.target.value))} /></Field>
        <Field label="core colour"><Colour value={form.sunColorCore} onChange={set("sunColorCore")} /></Field>
        <Field label="edge colour"><Colour value={form.sunColorEdge} onChange={set("sunColorEdge")} /></Field>
      </div>

      <p className="panel__h" style={{ marginTop: 12 }}>the system</p>
      <div className="fields fields--3">
        <Field label="orbit scale" hint="multiplies every distance"><Num value={form.orbitScale} onChange={set("orbitScale")} step={0.05} /></Field>
        <Field label="asteroid belt radius"><Num value={form.beltRadius} onChange={set("beltRadius")} step={0.5} /></Field>
        <Field label="belt density" hint="rocks"><Num value={form.beltDensity} onChange={set("beltDensity")} step={100} /></Field>
      </div>

      <p className="panel__h" style={{ marginTop: 12 }}>the sky</p>
      <div className="fields fields--3">
        <Field label="stars"><Num value={form.starCount} onChange={set("starCount")} step={200} /></Field>
        <Field label="nebula, first colour"><Colour value={form.nebulaA} onChange={set("nebulaA")} /></Field>
        <Field label="nebula, second colour"><Colour value={form.nebulaB} onChange={set("nebulaB")} /></Field>
      </div>

      <p className="panel__h" style={{ marginTop: 12 }}>the camera</p>
      <div className="fields fields--2">
        <Field label="field of view" hint="degrees · 42 is the default"><Num value={form.fov} onChange={set("fov")} step={1} /></Field>
        <Field label={`bloom · ${form.bloom.toFixed(2)}`}><input type="range" min={0} max={2} step={0.05} value={form.bloom} onChange={(e) => set("bloom")(Number(e.target.value))} /></Field>
      </div>

      <p className="hint">The deck reads these on load, so a change shows on the next visit to /ship.</p>
      <div><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "saving…" : "save the system"}</button></div>
    </form>
  );
}
