"use client";
// Projects, and each project's planet. Everything the shader used to hardcode is a control here: type,
// size, the four-colour ramp, the atmosphere rim, the surface parameters, the ring, and the orbit it
// sits on. The live preview is the real planet renderer, so what you set is what the deck shows.

import dynamic from "next/dynamic";
import { useState } from "react";
import { Area, Check, Chips, Colour, Empty, Field, Lines, Num, Select, Skeleton, Text, useDragSort, useResource, type WithId } from "../kit";

const PlanetPreview = dynamic(() => import("../PlanetPreview"), { ssr: false, loading: () => <div className="skel" style={{ height: 200 }} /> });

const PLANET_TYPES = ["gas", "rocky", "lava", "ice"] as const;
type PlanetType = (typeof PLANET_TYPES)[number];
interface Ring { ca: number; cb: number; inner: number; outer: number; tilt: number }
interface Planet {
  type: PlanetType; size: number; c0: number; c1: number; c2: number; c3: number; rim: number;
  ocean?: number; cloud?: number; crater?: number; vein?: number; ring?: Ring | null;
}
interface Row extends WithId {
  slug: string; title: string; tagline: string; description: string; heading: string;
  bullets: string[]; tech: string[]; stack: string[]; extraLinks: [string, string][];
  category: string; context: string; status: string; year: number | null; weight: number;
  github: string; live: string; langs: [string, number][]; planet: Planet; orbit: number;
  coverImage: string; featured: boolean; visible: boolean;
}

const DEFAULT_PLANET: Planet = { type: "rocky", size: 1, c0: 0x0b3d91, c1: 0x1f8a5b, c2: 0x7a9a3c, c3: 0xf2f5ff, rim: 0x6fc3ff, ocean: 0.4, cloud: 0.6, ring: null };
const RAMP_LABELS: Record<PlanetType, [string, string, string, string]> = {
  gas: ["band 1", "band 2", "band 3", "highlight"],
  rocky: ["ocean", "lowland", "highland", "snow"],
  lava: ["rock, dark", "rock, light", "unused", "vein glow"],
  ice: ["base", "band", "storm", "highlight"],
};
const blank = {
  slug: "", title: "", tagline: "", description: "", heading: "", bullets: [] as string[], tech: [] as string[],
  stack: [] as string[], extraLinks: [] as [string, string][], category: "web", context: "product", status: "",
  year: new Date().getFullYear(), weight: 0.6, github: "", live: "", langs: [] as [string, number][],
  planet: DEFAULT_PLANET, orbit: 120, coverImage: "", featured: false, visible: true,
};

function PlanetEditor({ planet, orbit, onChange, onOrbit }: { planet: Planet; orbit: number; onChange: (p: Planet) => void; onOrbit: (v: number) => void }) {
  const set = <K extends keyof Planet>(k: K, v: Planet[K]): void => onChange({ ...planet, [k]: v });
  const ring = planet.ring ?? null;
  const setRing = (patch: Partial<Ring>): void => onChange({ ...planet, ring: { ca: 0xa78bfa, cb: 0xf3e8ff, inner: 1.3, outer: 2.4, tilt: 0.4, ...ring, ...patch } });
  const labels = RAMP_LABELS[planet.type];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: 14 }}>
      <div className="fields">
        <div className="fields fields--3">
          <Field label="type" hint="picks the shader"><Select value={planet.type} onChange={(v) => set("type", v)} options={PLANET_TYPES} /></Field>
          <Field label="size" hint="radius · the sun is 6"><Num value={planet.size} onChange={(v) => set("size", v)} step={0.05} /></Field>
          <Field label="orbit" hint="distance from the sun"><Num value={orbit} onChange={onOrbit} step={1} /></Field>
        </div>
        <div className="fields fields--3">
          <Field label={labels[0]}><Colour value={planet.c0} onChange={(v) => set("c0", v)} /></Field>
          <Field label={labels[1]}><Colour value={planet.c1} onChange={(v) => set("c1", v)} /></Field>
          <Field label={labels[2]}><Colour value={planet.c2} onChange={(v) => set("c2", v)} /></Field>
          <Field label={labels[3]}><Colour value={planet.c3} onChange={(v) => set("c3", v)} /></Field>
          <Field label="atmosphere rim"><Colour value={planet.rim} onChange={(v) => set("rim", v)} /></Field>
        </div>
        <div className="fields fields--2">
          {planet.type === "rocky" && <>
            <Field label={`ocean · ${(planet.ocean ?? 0).toFixed(2)}`}><input type="range" min={0} max={1} step={0.01} value={planet.ocean ?? 0} onChange={(e) => set("ocean", Number(e.target.value))} /></Field>
            <Field label={`clouds · ${(planet.cloud ?? 0).toFixed(2)}`}><input type="range" min={0} max={1} step={0.01} value={planet.cloud ?? 0} onChange={(e) => set("cloud", Number(e.target.value))} /></Field>
            <Field label={`craters · ${(planet.crater ?? 0).toFixed(2)}`}><input type="range" min={0} max={1} step={0.01} value={planet.crater ?? 0} onChange={(e) => set("crater", Number(e.target.value))} /></Field>
          </>}
          {planet.type === "lava" && <Field label={`veins · ${(planet.vein ?? 0).toFixed(2)}`}><input type="range" min={0} max={1} step={0.01} value={planet.vein ?? 0} onChange={(e) => set("vein", Number(e.target.value))} /></Field>}
          {planet.type === "gas" && <Field label={`clouds · ${(planet.cloud ?? 0).toFixed(2)}`}><input type="range" min={0} max={1} step={0.01} value={planet.cloud ?? 0} onChange={(e) => set("cloud", Number(e.target.value))} /></Field>}
        </div>
        <Check label="give it a ring" checked={ring !== null} onChange={(on) => (on ? setRing({}) : onChange({ ...planet, ring: null }))} />
        {ring && (
          <div className="fields fields--3">
            <Field label="ring, inner colour"><Colour value={ring.ca} onChange={(v) => setRing({ ca: v })} /></Field>
            <Field label="ring, outer colour"><Colour value={ring.cb} onChange={(v) => setRing({ cb: v })} /></Field>
            <Field label="tilt" hint="radians"><Num value={ring.tilt} onChange={(v) => setRing({ tilt: v })} step={0.02} /></Field>
            <Field label="inner radius" hint="× planet size"><Num value={ring.inner} onChange={(v) => setRing({ inner: v })} step={0.02} /></Field>
            <Field label="outer radius" hint="× planet size"><Num value={ring.outer} onChange={(v) => setRing({ outer: v })} step={0.02} /></Field>
          </div>
        )}
      </div>
      <div>
        <p className="panel__h">live preview</p>
        <PlanetPreview planet={planet} />
      </div>
    </div>
  );
}

export default function ProjectsPanel() {
  const { items, loading, create, update, remove, reorder } = useResource<Row>("projects");
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState(blank);
  const [adding, setAdding] = useState(false);
  const drag = useDragSort(items, (next) => void reorder(next));

  if (loading) return <Skeleton rows={4} />;
  return (
    <>
      <div className="adm__list">
        {items.map((row, i) => (
          <div key={row.id} className={`sf row${drag.over === i ? " is-over" : ""}`} {...drag.props(i)}>
            <div className="sf__in">
              <div className="row__top">
                <span className="row__grip" aria-hidden="true">⠿</span>
                <h3>{row.title}</h3>
                <span className="tag">{row.slug}</span>
                <span className="tag">{row.planet.type} · orbit {row.orbit}</span>
                {row.featured && <span className="tag on">featured</span>}
                {!row.visible && <span className="tag off">hidden</span>}
                <div className="row__acts">
                  <button className="btn btn--sm" type="button" onClick={() => setOpen(open === row.id ? null : row.id)}>{open === row.id ? "close" : "edit"}</button>
                  <button className="btn btn--sm" type="button" onClick={() => void update({ id: row.id, featured: !row.featured })}>{row.featured ? "unfeature" : "feature"}</button>
                  <button className="btn btn--sm" type="button" onClick={() => void update({ id: row.id, visible: !row.visible })}>{row.visible ? "hide" : "show"}</button>
                  <button className="btn btn--sm btn--danger" type="button" onClick={() => void remove(row.id)}>delete</button>
                </div>
              </div>

              {open === row.id && (
                <div className="fields">
                  <div className="fields fields--2">
                    <Field label="title"><Text value={row.title} onChange={(v) => void update({ id: row.id, title: v })} /></Field>
                    <Field label="slug" hint="the URL"><Text value={row.slug} onChange={(v) => void update({ id: row.id, slug: v })} /></Field>
                    <Field label="tagline"><Text value={row.tagline} onChange={(v) => void update({ id: row.id, tagline: v })} /></Field>
                    <Field label="résumé heading" hint="the longer title on the project page"><Text value={row.heading} onChange={(v) => void update({ id: row.id, heading: v })} /></Field>
                  </div>
                  <Field label="description" hint="one paragraph, used everywhere"><Area value={row.description} onChange={(v) => void update({ id: row.id, description: v })} /></Field>
                  <Field label="bullets" hint="one per line · the About section"><Lines value={row.bullets} onChange={(v) => void update({ id: row.id, bullets: v })} rows={6} /></Field>
                  <div className="fields fields--2">
                    <Field label="stack" hint="the chips"><Chips value={row.stack} onChange={(v) => void update({ id: row.id, stack: v })} /></Field>
                    <Field label="full tech list" hint="the project page's stack card"><Chips value={row.tech} onChange={(v) => void update({ id: row.id, tech: v })} /></Field>
                  </div>
                  <div className="fields fields--3">
                    <Field label="category"><Text value={row.category} onChange={(v) => void update({ id: row.id, category: v })} /></Field>
                    <Field label="context"><Text value={row.context} onChange={(v) => void update({ id: row.id, context: v })} /></Field>
                    <Field label="status" hint="when it is not live"><Text value={row.status} onChange={(v) => void update({ id: row.id, status: v })} /></Field>
                    <Field label="github"><Text value={row.github} onChange={(v) => void update({ id: row.id, github: v })} /></Field>
                    <Field label="live url"><Text value={row.live} onChange={(v) => void update({ id: row.id, live: v })} /></Field>
                    <Field label="year"><Num value={row.year ?? 0} onChange={(v) => void update({ id: row.id, year: v || null })} /></Field>
                  </div>
                  <Field label="weight" hint="0–1 · how big it looks in the strip"><Num value={row.weight} onChange={(v) => void update({ id: row.id, weight: v })} step={0.05} /></Field>
                  <p className="panel__h" style={{ marginTop: 8 }}>the planet</p>
                  <PlanetEditor
                    planet={row.planet}
                    orbit={row.orbit}
                    onChange={(p) => void update({ id: row.id, planet: p })}
                    onOrbit={(v) => void update({ id: row.id, orbit: v })}
                  />
                  <p className="hint">Languages come from GitHub at request time; the stored list is only the fallback when the API is unreachable.</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No projects yet." />}
      </div>

      <div style={{ marginTop: 18 }}>
        {adding ? (
          <form className="fields" onSubmit={(e) => { e.preventDefault(); void create(draft).then((ok) => { if (ok) { setDraft(blank); setAdding(false); } }); }}>
            <div className="fields fields--3">
              <Field label="title"><Text value={draft.title} onChange={(v) => setDraft({ ...draft, title: v, slug: draft.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} required /></Field>
              <Field label="slug"><Text value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: v })} required /></Field>
              <Field label="github"><Text value={draft.github} onChange={(v) => setDraft({ ...draft, github: v })} required /></Field>
            </div>
            <Field label="tagline"><Text value={draft.tagline} onChange={(v) => setDraft({ ...draft, tagline: v })} required /></Field>
            <Field label="description"><Area value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} required /></Field>
            <PlanetEditor planet={draft.planet} orbit={draft.orbit} onChange={(p) => setDraft({ ...draft, planet: p })} onOrbit={(v) => setDraft({ ...draft, orbit: v })} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn--primary" type="submit">create project</button>
              <button className="btn" type="button" onClick={() => setAdding(false)}>cancel</button>
            </div>
          </form>
        ) : (
          <button className="btn btn--primary" type="button" onClick={() => setAdding(true)}>new project</button>
        )}
      </div>
    </>
  );
}
