"use client";
// Projects, and each project's planet. Everything the shader used to hardcode is a control here: type,
// size, the four-colour ramp, the atmosphere, the surface parameters, the banding, the spin, the ring,
// and the orbit it sits on. The live preview is the real planet renderer, so what you set is what the
// deck shows.
//
// Every optional planet knob may be absent, and absent means "whatever the scene has always done with
// this body" — see planetDefaults in src/lib/three/scene.ts. So the editor writes a value only when you
// move the control, and `reset` puts the fields back to absent rather than to a number.

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Area, Badge, Bone, Btn, Card, Check, Chip, Chips, Colour, Count, Danger, Empty, Field, Lines, Num, Pager,
  Search, Section, Select, Skeleton, Slider, Table, Text, Toolbar, applySort, pageOf, useResource, usePager,
  useSearch, useSort, type Column, type WithId,
} from "../kit";

const PlanetPreview = dynamic(() => import("../PlanetPreview"), { ssr: false, loading: () => <Bone height={200} /> });

const PLANET_TYPES = ["gas", "rocky", "lava", "ice"] as const;
type PlanetType = (typeof PLANET_TYPES)[number];
interface Ring { ca: number; cb: number; inner: number; outer: number; tilt: number }
interface Planet {
  type: PlanetType; size: number; c0: number; c1: number; c2: number; c3: number; rim: number;
  ocean?: number; cloud?: number; crater?: number; vein?: number;
  seed?: number; spin?: number; tilt?: number; atmo?: number; atmoAlpha?: number; glow?: number;
  bands?: number; bandSharp?: number;
  ring?: Ring | null;
}
interface Row extends WithId {
  slug: string; title: string; tagline: string; description: string; heading: string;
  bullets: string[]; tech: string[]; stack: string[]; extraLinks: [string, string][];
  category: string; context: string; status: string; year: number | null; weight: number;
  github: string; live: string; langs: [string, number][]; planet: Planet; orbit: number;
  coverImage: string; featured: boolean; visible: boolean;
}

const DEFAULT_PLANET: Planet = { type: "rocky", size: 1, c0: 0x0b3d91, c1: 0x1f8a5b, c2: 0x7a9a3c, c3: 0xf2f5ff, rim: 0x6fc3ff, ocean: 0.4, cloud: 0.6, ring: null };
/** What the scene falls back to when a knob is absent — shown so a slider has somewhere to start. */
const KNOB: Required<Pick<Planet, "ocean" | "cloud" | "crater" | "vein" | "seed" | "spin" | "tilt" | "atmo" | "atmoAlpha" | "glow" | "bands" | "bandSharp">> = {
  ocean: 0, cloud: 0, crater: 0, vein: 0, seed: 2, spin: 2.1, tilt: -17, atmo: 0.14, atmoAlpha: 0.28, glow: 1, bands: 14, bandSharp: 0,
};
type Knob = keyof typeof KNOB;
const KNOBS: readonly Knob[] = ["ocean", "cloud", "crater", "vein", "seed", "spin", "tilt", "atmo", "atmoAlpha", "glow", "bands", "bandSharp"];

const RAMP_LABELS: Record<PlanetType, [string, string, string, string]> = {
  gas: ["band 1", "band 2", "band 3", "highlight"],
  rocky: ["ocean", "lowland", "highland", "snow"],
  lava: ["rock, dark", "rock, light", "unused", "vein glow"],
  ice: ["base", "band", "storm", "highlight"],
};
/** One sensible planet per type, so a new project starts somewhere rather than grey. */
const PRESETS: Record<PlanetType, Planet> = {
  gas: { type: "gas", size: 1.5, c0: 0x160536, c1: 0x5b21b6, c2: 0xc026d3, c3: 0xf0abfc, rim: 0xff4de0, cloud: 0.3, bands: 17, bandSharp: 0.45, atmo: 0.16, atmoAlpha: 0.32, spin: 3.4, tilt: -6, ring: null },
  rocky: { type: "rocky", size: 1.1, c0: 0x0b3d91, c1: 0x1f8a5b, c2: 0x7a9a3c, c3: 0xf2f5ff, rim: 0x6fc3ff, ocean: 0.55, cloud: 0.85, crater: 0.15, atmo: 0.14, atmoAlpha: 0.3, spin: 2.1, tilt: -17, ring: null },
  lava: { type: "lava", size: 0.9, c0: 0x07070c, c1: 0x2a2a38, c2: 0x3c3c4a, c3: 0xff5a1f, rim: 0xff7a3c, vein: 1, atmo: 0.09, atmoAlpha: 0.22, glow: 1.7, spin: 1.5, tilt: 9, ring: null },
  ice: { type: "ice", size: 1.05, c0: 0x0a4fd6, c1: 0x00e5ff, c2: 0xd6f3ff, c3: 0xffffff, rim: 0x7ff0ff, cloud: 0.2, bands: 10, bandSharp: 0.3, atmo: 0.18, atmoAlpha: 0.34, spin: 2.6, tilt: -24, ring: null },
};

const rnd = (min: number, max: number, step = 0.01): number => Math.round((min + Math.random() * (max - min)) / step) * step;
const rndColour = (): number => Math.floor(Math.random() * 0xffffff);
/** Keeps the size and the ring — those are composition decisions — and rolls everything else. */
function randomise(p: Planet): Planet {
  const type = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)] ?? "rocky";
  return {
    ...p, type,
    c0: rndColour(), c1: rndColour(), c2: rndColour(), c3: rndColour(), rim: rndColour(),
    seed: rnd(0, 400, 0.1), spin: rnd(0.4, 6, 0.1), tilt: rnd(-40, 40, 1),
    atmo: rnd(0.05, 0.3), atmoAlpha: rnd(0.1, 0.6), glow: rnd(0.6, 2.2, 0.1),
    bands: rnd(4, 34, 1), bandSharp: rnd(0, 0.9),
    ocean: type === "rocky" ? rnd(0, 0.8) : p.ocean,
    cloud: type === "lava" ? p.cloud : rnd(0, 0.9),
    crater: type === "rocky" ? rnd(0, 1) : p.crater,
    vein: type === "lava" ? rnd(0.4, 1) : p.vein,
  };
}
/** Drops every override, so the planet goes back to the look the scene gives it on its own. */
function reset(p: Planet): Planet {
  const next: Planet = { type: p.type, size: p.size, c0: p.c0, c1: p.c1, c2: p.c2, c3: p.c3, rim: p.rim, ring: p.ring ?? null };
  return next;
}

const blank = {
  slug: "", title: "", tagline: "", description: "", heading: "", bullets: [] as string[], tech: [] as string[],
  stack: [] as string[], extraLinks: [] as [string, string][], category: "web", context: "product", status: "",
  year: new Date().getFullYear(), weight: 0.6, github: "", live: "", langs: [] as [string, number][],
  planet: DEFAULT_PLANET, orbit: 120, coverImage: "", featured: false, visible: true,
};

// ── the planet editor ──

const TIPS = {
  type: "picks which branch of the shader runs: banded gas, terrain, molten rock, or ice.",
  size: "the planet's radius in scene units. The sun is 6, so a planet is 0.5–1.6.",
  orbit: "how far from the sun this planet sits. The flight time to it follows from this.",
  seed: "moves the surface noise. Same colours, different continents — the cheapest way to make two planets of one type look unrelated.",
  spin: "turns per minute. Leave it be and the planet keeps the rate the scene has always given it.",
  tilt: "axial tilt in degrees. Tilts the whole body, and its ring with it.",
  atmo: "how far the atmosphere shell stands off the surface, as a fraction of the radius.",
  atmoAlpha: "how opaque that shell is. Above about 0.5 it starts to hide the surface.",
  glow: "multiplies the emissive channel — the lava veins. Above 1 it also lights the night side, so any planet can be made to burn.",
  bands: "how many latitude bands the gas and ice shaders draw.",
  bandSharp: "0 is a soft sine, 1 is hard-edged stripes.",
  ocean: "sea level. Everything below it is the first colour; 0 means no water at all.",
  cloud: "how much of the surface the cloud layer covers.",
  crater: "how heavily cratered the ground is.",
  vein: "how bright the molten veins run.",
} as const;

function PlanetEditor({ planet, orbit, onChange, onOrbit }: { planet: Planet; orbit: number; onChange: (p: Planet) => void; onOrbit: (v: number) => void }) {
  const set = <K extends keyof Planet>(k: K, v: Planet[K]): void => onChange({ ...planet, [k]: v });
  const knob = (k: Knob): number => planet[k] ?? KNOB[k];
  const ring = planet.ring ?? null;
  const setRing = (patch: Partial<Ring>): void => onChange({ ...planet, ring: { ca: 0xa78bfa, cb: 0xf3e8ff, inner: 1.3, outer: 2.4, tilt: 0.4, ...ring, ...patch } });
  const labels = RAMP_LABELS[planet.type];
  const unset = KNOBS.filter((k) => planet[k] === undefined).length;

  return (
    <div className="pled">
      <div className="fields">
        <Section
          title="planet"
          actions={
            <>
              {PLANET_TYPES.map((t) => (
                <Chip key={t} on={planet.type === t} onClick={() => onChange({ ...PRESETS[t], size: planet.size, ring: planet.ring ?? null })}>{t}</Chip>
              ))}
              <Btn onClick={() => onChange(randomise(planet))}>randomise</Btn>
              <Btn onClick={() => onChange(reset(planet))} title="clears every knob back to the scene's own defaults">reset</Btn>
            </>
          }
        />
        <div className="fields fields--3">
          <Field label="type" tip={TIPS.type}><Select value={planet.type} onChange={(v) => set("type", v)} options={PLANET_TYPES} /></Field>
          <Field label="size" tip={TIPS.size}><Num value={planet.size} onChange={(v) => set("size", v)} step={0.05} /></Field>
          <Field label="orbit" tip={TIPS.orbit}><Num value={orbit} onChange={onOrbit} step={1} /></Field>
        </div>

        <p className="panel__h">colours</p>
        <div className="fields fields--3">
          <Field label={labels[0]}><Colour value={planet.c0} onChange={(v) => set("c0", v)} /></Field>
          <Field label={labels[1]}><Colour value={planet.c1} onChange={(v) => set("c1", v)} /></Field>
          <Field label={labels[2]}><Colour value={planet.c2} onChange={(v) => set("c2", v)} /></Field>
          <Field label={labels[3]}><Colour value={planet.c3} onChange={(v) => set("c3", v)} /></Field>
          <Field label="atmosphere rim" hint="also the nebula tint"><Colour value={planet.rim} onChange={(v) => set("rim", v)} /></Field>
        </div>

        <p className="panel__h">surface</p>
        <div className="fields fields--2">
          <Slider label="seed" value={knob("seed")} onChange={(v) => set("seed", v)} min={0} max={400} step={0.1} tip={TIPS.seed} />
          {planet.type === "rocky" && <>
            <Slider label="ocean" value={knob("ocean")} onChange={(v) => set("ocean", v)} min={0} max={1} tip={TIPS.ocean} />
            <Slider label="craters" value={knob("crater")} onChange={(v) => set("crater", v)} min={0} max={1} tip={TIPS.crater} />
          </>}
          {planet.type === "lava" && <Slider label="veins" value={knob("vein")} onChange={(v) => set("vein", v)} min={0} max={1} tip={TIPS.vein} />}
          {planet.type !== "lava" && <Slider label="clouds" value={knob("cloud")} onChange={(v) => set("cloud", v)} min={0} max={1} tip={TIPS.cloud} />}
          {(planet.type === "gas" || planet.type === "ice") && <>
            <Slider label="bands" value={knob("bands")} onChange={(v) => set("bands", v)} min={1} max={40} step={1} tip={TIPS.bands} />
            <Slider label="band edges" value={knob("bandSharp")} onChange={(v) => set("bandSharp", v)} min={0} max={1} tip={TIPS.bandSharp} />
          </>}
        </div>

        <p className="panel__h">motion and air</p>
        <div className="fields fields--2">
          <Slider label="spin" value={knob("spin")} onChange={(v) => set("spin", v)} min={0} max={12} step={0.1} unit=" tpm" tip={TIPS.spin} />
          <Slider label="tilt" value={knob("tilt")} onChange={(v) => set("tilt", v)} min={-90} max={90} step={1} unit="°" tip={TIPS.tilt} />
          <Slider label="atmosphere" value={knob("atmo")} onChange={(v) => set("atmo", v)} min={0} max={0.6} tip={TIPS.atmo} />
          <Slider label="atmosphere opacity" value={knob("atmoAlpha")} onChange={(v) => set("atmoAlpha", v)} min={0} max={1} tip={TIPS.atmoAlpha} />
          <Slider label="glow" value={knob("glow")} onChange={(v) => set("glow", v)} min={0} max={3} step={0.05} tip={TIPS.glow} />
        </div>
        {unset > 0 && <p className="hint">{unset} of these are still unset, so the scene picks them from the planet&rsquo;s position. Moving one fixes it.</p>}

        <Check label="give it a ring" checked={ring !== null} onChange={(on) => (on ? setRing({}) : onChange({ ...planet, ring: null }))} />
        {ring && (
          <div className="fields fields--3">
            <Field label="ring, inner colour"><Colour value={ring.ca} onChange={(v) => setRing({ ca: v })} /></Field>
            <Field label="ring, outer colour"><Colour value={ring.cb} onChange={(v) => setRing({ cb: v })} /></Field>
            <Field label="ring tilt" hint="radians"><Num value={ring.tilt} onChange={(v) => setRing({ tilt: v })} step={0.02} /></Field>
            <Field label="inner radius" hint="× planet size"><Num value={ring.inner} onChange={(v) => setRing({ inner: v })} step={0.02} /></Field>
            <Field label="outer radius" hint="× planet size"><Num value={ring.outer} onChange={(v) => setRing({ outer: v })} step={0.02} /></Field>
          </div>
        )}
      </div>
      <div className="pled__view">
        <p className="panel__h">live preview</p>
        <PlanetPreview planet={planet} />
      </div>
    </div>
  );
}

// ── the panel ──

const COLUMNS: readonly Column<Row>[] = [
  { key: "title", label: "project", value: (r) => r.title, cell: (r) => <><b>{r.title}</b><small className="sub">/{r.slug}</small></> },
  { key: "planet", label: "planet", width: "96px", value: (r) => r.planet.type, cell: (r) => <Badge tone="cool">{r.planet.type}</Badge> },
  { key: "orbit", label: "orbit", width: "80px", num: true, value: (r) => r.orbit, cell: (r) => r.orbit },
  { key: "year", label: "year", width: "72px", num: true, value: (r) => r.year ?? 0, cell: (r) => r.year ?? "—" },
  {
    key: "state", label: "state", width: "150px", value: (r) => (r.visible ? 0 : 1),
    cell: (r) => <>{r.featured && <Badge tone="warn">featured</Badge>}{!r.visible && <Badge tone="off">hidden</Badge>}{r.visible && !r.featured && <Badge tone="on">live</Badge>}</>,
  },
];
type Shown = "all" | "visible" | "hidden" | "featured";

export default function ProjectsPanel() {
  const { items, loading, create, update, remove, move } = useResource<Row>("projects");
  const [term, setTerm] = useState("");
  const [type, setType] = useState<PlanetType | "all">("all");
  const [shown, setShown] = useState<Shown>("all");
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { sort, toggle } = useSort();

  const found = useSearch(items, term, (r) => [r.title, r.slug, r.tagline, r.category, r.context]);
  const rows = found.filter((r) =>
    (type === "all" || r.planet.type === type) &&
    (shown === "all" || (shown === "featured" ? r.featured : r.visible === (shown === "visible"))));
  const pager = usePager(rows.length);
  const page = pageOf(applySort(rows, COLUMNS, sort), pager);
  const current = sel === null ? null : items.find((r) => r.id === sel) ?? null;

  if (loading) return <Skeleton rows={5} />;

  const close = (): void => { setSel(null); setAdding(false); };

  return (
    <div className="stack" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search projects…" />
          <div className="tbar__chips">
            <Chip on={type === "all"} onClick={() => setType("all")}>all</Chip>
            {PLANET_TYPES.map((t) => (
              <Chip key={t} on={type === t} onClick={() => setType(t)} count={items.filter((r) => r.planet.type === t).length}>{t}</Chip>
            ))}
          </div>
          <div className="tbar__chips">
            <Chip on={shown === "featured"} onClick={() => setShown(shown === "featured" ? "all" : "featured")}>featured</Chip>
            <Chip on={shown === "hidden"} onClick={() => setShown(shown === "hidden" ? "all" : "hidden")}>hidden</Chip>
          </div>
          <Count shown={rows.length} total={items.length} noun="projects" />
          <Btn kind="primary" onClick={() => { setSel(null); setAdding(true); }}>new project</Btn>
        </Toolbar>

        {rows.length === 0 ? (
          <Empty
            icon="◍" text={items.length ? "No project matches that filter." : "No projects yet. Each one becomes a planet in the flight deck."}
            action={items.length ? undefined : "add the first project"} onAction={items.length ? undefined : () => setAdding(true)}
          />
        ) : (
          <>
            <Table
              label="projects" columns={COLUMNS} rows={page} keyOf={(r) => r.id}
              selected={sel} onSelect={(r) => { setAdding(false); setSel(r.id); }} sort={sort} onSort={toggle}
              actions={(r) => (
                <>
                  <Btn onClick={() => { setAdding(false); setSel(sel === r.id ? null : r.id); }}>{sel === r.id ? "close" : "edit"}</Btn>
                  <Btn onClick={() => void update({ id: r.id, featured: !r.featured })}>{r.featured ? "unfeature" : "feature"}</Btn>
                  <Btn onClick={() => void update({ id: r.id, visible: !r.visible })}>{r.visible ? "hide" : "show"}</Btn>
                  <Danger onConfirm={() => { if (sel === r.id) setSel(null); void remove(r.id); }} />
                </>
              )}
            />
            <Pager state={pager} total={rows.length} noun="projects" />
          </>
        )}
      </div>

      {adding && (
        <NewProject
          onCancel={close}
          onCreate={async (draft) => { const ok = await create(draft); if (ok) setAdding(false); return ok; }}
        />
      )}
      {current && !adding && (
        <EditProject
          key={current.id} row={current} onClose={close}
          onSave={(patch) => update({ id: current.id, ...patch })}
          onDelete={() => { void remove(current.id); close(); }}
          onMove={(dir) => void move(current.id, dir)}
        />
      )}
    </div>
  );
}

function EditProject({ row, onClose, onSave, onDelete, onMove }: {
  row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => Promise<boolean>; onDelete: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [form, setForm] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Row>(k: K) => (v: Row[K]): void => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(row);

  return (
    <Card
      title={row.title} onClose={onClose}
      actions={<><Btn onClick={() => onMove(-1)} aria-label="move up">↑</Btn><Btn onClick={() => onMove(1)} aria-label="move down">↓</Btn></>}
    >
      <form
        className="fields"
        onSubmit={(e) => { e.preventDefault(); setBusy(true); void onSave(form).finally(() => setBusy(false)); }}
      >
        <div className="fields fields--2">
          <Field label="title"><Text value={form.title} onChange={set("title")} required /></Field>
          <Field label="slug" hint="the URL"><Text value={form.slug} onChange={set("slug")} required /></Field>
          <Field label="tagline"><Text value={form.tagline} onChange={set("tagline")} /></Field>
          <Field label="résumé heading" hint="the longer title on the project page"><Text value={form.heading} onChange={set("heading")} /></Field>
        </div>
        <Field label="description" hint="one paragraph, used everywhere"><Area value={form.description} onChange={set("description")} /></Field>
        <Field label="bullets" hint="one per line · the About section"><Lines value={form.bullets} onChange={set("bullets")} rows={6} /></Field>
        <div className="fields fields--2">
          <Field label="stack" hint="the chips"><Chips value={form.stack} onChange={set("stack")} /></Field>
          <Field label="full tech list" hint="the project page's stack card"><Chips value={form.tech} onChange={set("tech")} /></Field>
        </div>
        <div className="fields fields--3">
          <Field label="category"><Text value={form.category} onChange={set("category")} /></Field>
          <Field label="context"><Text value={form.context} onChange={set("context")} /></Field>
          <Field label="status" hint="when it is not live"><Text value={form.status} onChange={set("status")} /></Field>
          <Field label="github"><Text value={form.github} onChange={set("github")} /></Field>
          <Field label="live url"><Text value={form.live} onChange={set("live")} /></Field>
          <Field label="year"><Num value={form.year ?? 0} onChange={(v) => setForm({ ...form, year: v || null })} /></Field>
        </div>
        <Slider label="weight" value={form.weight} onChange={set("weight")} min={0} max={1} tip="how big the planet looks in the strip, and how high the project sits on the reading page." />
        <div className="fields fields--2">
          <Check label="featured" checked={form.featured} onChange={set("featured")} />
          <Check label="visible on the site" checked={form.visible} onChange={set("visible")} />
        </div>

        <PlanetEditor planet={form.planet} orbit={form.orbit} onChange={set("planet")} onOrbit={set("orbit")} />
        <p className="hint">Languages come from GitHub at request time; the stored list is only the fallback when the API is unreachable.</p>

        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save the project" : "saved"}</Btn>
          <Btn size="md" onClick={() => setForm(row)} disabled={!dirty}>undo</Btn>
          <Danger size="md" onConfirm={onDelete} />
        </div>
      </form>
    </Card>
  );
}

function NewProject({ onCancel, onCreate }: { onCancel: () => void; onCreate: (draft: typeof blank) => Promise<boolean> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="new project" onClose={onCancel}>
      <form
        className="fields"
        onSubmit={(e) => { e.preventDefault(); setBusy(true); void onCreate(draft).then((ok) => { if (ok) setDraft(blank); setBusy(false); }); }}
      >
        <div className="fields fields--3">
          <Field label="title">
            <Text
              value={draft.title} required
              onChange={(v) => setDraft({ ...draft, title: v, slug: draft.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })}
            />
          </Field>
          <Field label="slug"><Text value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: v })} required /></Field>
          <Field label="github"><Text value={draft.github} onChange={(v) => setDraft({ ...draft, github: v })} required /></Field>
        </div>
        <Field label="tagline"><Text value={draft.tagline} onChange={(v) => setDraft({ ...draft, tagline: v })} required /></Field>
        <Field label="description"><Area value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} required /></Field>
        <PlanetEditor
          planet={draft.planet} orbit={draft.orbit}
          onChange={(p) => setDraft({ ...draft, planet: p })} onOrbit={(v) => setDraft({ ...draft, orbit: v })}
        />
        <div className="acts">
          <Btn kind="primary" size="md" type="submit" disabled={busy}>{busy ? "creating…" : "create project"}</Btn>
          <Btn size="md" onClick={onCancel}>cancel</Btn>
        </div>
      </form>
    </Card>
  );
}
