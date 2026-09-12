"use client";
// The solar system's global values. These used to be constants in the shader file; now they are a row.
//
// Every field is read back defensively: the row gains columns faster than the API does, so a value the
// endpoint has not learned to send yet falls back to the same default the database column carries.

import { useEffect, useMemo, useState } from "react";
import { LIGHT_YEAR_AU, arrange, isScaleMode, maxPlanetSize, type ScaleMode } from "@/lib/scale";
import {
  Btn, Choice, ColourRamp, Danger, Field, Fold, LogSlider, Num, Picker, Section, Skeleton, Slider,
  Swatches, Toggle, Tooltip, useSingle, useToast, type ChoiceOption, type PickerItem,
} from "../kit";
import { RESCALES, type Rescale } from "@/lib/catalog";
import type { StarApplyResult } from "@/app/api/admin/scene/star/route";

// A type alias rather than an interface: it has to be assignable to the endpoint's loose record shape.
type Scene = {
  id: number;
  /** Which catalogue star is at the centre, "" for the scene's own sun. Read-only here — only the star
   *  catalogue's own confirm writes it, so a normal "save the system" can never touch it by accident. */
  sunStar: string;
  sunRadius: number; sunColorCore: number; sunColorMid: number; sunColorEdge: number; sunIntensity: number;
  sunGranulation: number; sunLimb: number; sunSpots: number; sunSpin: number; sunCorona: number; sunFlare: number;
  orbitScale: number; scaleMode: ScaleMode; spanAu: number;
  beltRadius: number; beltWidth: number; beltThickness: number; beltRockSize: number; beltColor: number;
  beltTilt: number; beltDensity: number;
  starCount: number; nebulaA: number; nebulaB: number; constellations: boolean; constellationGain: number;
  bloom: number; fov: number;
};

/** The scene_config defaults, repeated here so a column the API has not started returning still edits. */
const DEFAULTS: Omit<Scene, "id"> = {
  sunStar: "",
  sunRadius: 6, sunColorCore: 0xfff3c4, sunColorMid: 0xffb547, sunColorEdge: 0xff7a1a, sunIntensity: 1,
  sunGranulation: 1, sunLimb: 1, sunSpots: 0, sunSpin: 1, sunCorona: 1, sunFlare: 1,
  orbitScale: 1, scaleMode: "stylised", spanAu: 30,
  beltRadius: 65.5, beltWidth: 9, beltThickness: 1.2, beltRockSize: 1, beltColor: 0x8b7d6b,
  beltTilt: 0, beltDensity: 1400,
  starCount: 3600, nebulaA: 0x3b0764, nebulaB: 0x0b2f6e, constellations: true, constellationGain: 1,
  bloom: 1, fov: 42,
};

type Raw = Record<string, unknown>;
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
const mode = (v: unknown): ScaleMode => (typeof v === "string" && isScaleMode(v) ? v : DEFAULTS.scaleMode);

function fill(raw: Raw): Scene {
  return {
    id: num(raw["id"], 1),
    sunStar: typeof raw["sunStar"] === "string" ? raw["sunStar"] : DEFAULTS.sunStar,
    sunRadius: num(raw["sunRadius"], DEFAULTS.sunRadius),
    sunColorCore: num(raw["sunColorCore"], DEFAULTS.sunColorCore),
    sunColorMid: num(raw["sunColorMid"], DEFAULTS.sunColorMid),
    sunColorEdge: num(raw["sunColorEdge"], DEFAULTS.sunColorEdge),
    sunIntensity: num(raw["sunIntensity"], DEFAULTS.sunIntensity),
    sunGranulation: num(raw["sunGranulation"], DEFAULTS.sunGranulation),
    sunLimb: num(raw["sunLimb"], DEFAULTS.sunLimb),
    sunSpots: num(raw["sunSpots"], DEFAULTS.sunSpots),
    sunSpin: num(raw["sunSpin"], DEFAULTS.sunSpin),
    sunCorona: num(raw["sunCorona"], DEFAULTS.sunCorona),
    sunFlare: num(raw["sunFlare"], DEFAULTS.sunFlare),
    orbitScale: num(raw["orbitScale"], DEFAULTS.orbitScale),
    scaleMode: mode(raw["scaleMode"]),
    spanAu: num(raw["spanAu"], DEFAULTS.spanAu),
    beltRadius: num(raw["beltRadius"], DEFAULTS.beltRadius),
    beltWidth: num(raw["beltWidth"], DEFAULTS.beltWidth),
    beltThickness: num(raw["beltThickness"], DEFAULTS.beltThickness),
    beltRockSize: num(raw["beltRockSize"], DEFAULTS.beltRockSize),
    beltColor: num(raw["beltColor"], DEFAULTS.beltColor),
    beltTilt: num(raw["beltTilt"], DEFAULTS.beltTilt),
    beltDensity: num(raw["beltDensity"], DEFAULTS.beltDensity),
    starCount: num(raw["starCount"], DEFAULTS.starCount),
    nebulaA: num(raw["nebulaA"], DEFAULTS.nebulaA),
    nebulaB: num(raw["nebulaB"], DEFAULTS.nebulaB),
    constellations: bool(raw["constellations"], DEFAULTS.constellations),
    constellationGain: num(raw["constellationGain"], DEFAULTS.constellationGain),
    bloom: num(raw["bloom"], DEFAULTS.bloom),
    fov: num(raw["fov"], DEFAULTS.fov),
  };
}

/** au, plus light years once the number stops being readable in au. */
function auText(v: number): string {
  const au = v < 10 ? v.toFixed(2) : v < 1000 ? v.toFixed(1) : Math.round(v).toLocaleString("en-GB");
  return v > 1000 ? `${au} au · ${(v / LIGHT_YEAR_AU).toFixed(3)} ly` : `${au} au`;
}

const SPAN_STOPS = [
  { at: 1, label: "1 au" },
  { at: 30, label: "30 au · neptune" },
  { at: 100, label: "100 au" },
  { at: 1000, label: "1000 au" },
  { at: LIGHT_YEAR_AU, label: "1 light year" },
] as const;

const TIPS = {
  span: "what the outermost orbit is worth in real distance. Everything else is placed inside it, so this is the size of the system rather than the size of the screen.",
  arrange: "recomputes size, orbit, tilt and spin for every planet from the real solar system, then writes them.",
  apply: "on, the planets are rewritten too. Off, only the scene row changes — the sun, the belt and the span.",
  cap: "no planet may be larger than 72% of this, so the sun always reads as the biggest thing in the system.",
  granulation: "how strongly the convection cells show on the surface.",
  limb: "how much the disc darkens towards its edge — the thing that makes a sphere look like a star and not a circle.",
  spots: "how much cooler, darker mottling the surface carries.",
  spin: "how fast the surface turns, and how much faster the equator runs than the poles.",
  corona: "the size and brightness of the outer halo.",
  flare: "how hard the lens flare and the surface prominences hit.",
  ramp: "core, middle and edge. The shader ramps between them from the centre of the disc outwards.",
  beltWidth: "how far the belt spreads inward and outward from its radius.",
  beltThickness: "how far the rocks scatter above and below the orbital plane.",
  beltRock: "multiplies every rock's size — the belt is one instanced mesh, so this costs nothing.",
  beltTilt: "tips the whole belt out of the planets' plane.",
  beltDensity: "how many rocks the belt draws. Every one is an instance, so this is the belt's whole cost.",
  constellations: "each background star is one of your other repositories, sized by its commit count; the constellations join the ones that share a language.",
  gain: "multiplies those repository stars' brightness, so the sky can be a hint or a headline.",
} as const;

export default function ScenePanel() {
  const { value, loading, save, refresh } = useSingle<Raw>("scene");
  // A star apply or an auto-arrange writes straight to the database from a fetch of their own, bypassing
  // `save`, so the sun/scale fields this same form is showing would otherwise sit stale until the page
  // was reloaded — the whole reason "what's selected" was hard to trust. Bumping the key forces a full
  // remount from the freshly refreshed row, the same way switching projects does in the panel next door.
  const [bump, setBump] = useState(0);
  const hardRefresh = async (): Promise<void> => { await refresh(); setBump((b) => b + 1); };
  if (loading || !value) return <Skeleton rows={6} />;
  const row = fill(value);
  return <Form key={`${row.id}-${bump}`} initial={row} save={save} refresh={hardRefresh} />;
}

function Form({ initial, save, refresh }: {
  initial: Scene; save: (patch: Partial<Raw>) => Promise<boolean>; refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState<Scene>(initial);
  const [busy, setBusy] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [applyAll, setApplyAll] = useState(true);
  const { say } = useToast();
  const set = <K extends keyof Scene>(k: K) => (v: Scene[K]): void => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const cap = maxPlanetSize(form.sunRadius);

  // The note is the mode's own one-liner from src/lib/scale.ts, so the admin cannot drift from the maths.
  const modes: ChoiceOption<ScaleMode>[] = (["stylised", "relative", "real"] as const).map((m) => ({
    value: m, label: m, note: arrange(m, { count: 8, spanAu: form.spanAu, sunRadius: form.sunRadius }).note,
  }));

  const runArrange = async (): Promise<void> => {
    setArranging(true);
    try {
      const r = await fetch("/api/admin/scene/arrange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: form.scaleMode, spanAu: form.spanAu, apply: applyAll ? "all" : "scene" }),
      });
      const body: unknown = await r.json().catch(() => null);
      if (!r.ok) {
        const said = typeof body === "object" && body !== null && "error" in body ? String((body as { error: unknown }).error) : "";
        say(r.status === 404 ? "the arrange endpoint is not there yet — nothing was changed" : said || `arrange failed (${r.status})`, true);
        return;
      }
      say(report(body, form, applyAll));
      await refresh();
    } catch {
      say("no connection — nothing was changed", true);
    } finally {
      setArranging(false);
    }
  };

  return (
    <form className="fields" onSubmit={(e) => { e.preventDefault(); setBusy(true); void save(form).finally(() => setBusy(false)); }}>
      <StarCatalogue sunRadius={form.sunRadius} current={form.sunStar} onApplied={() => void refresh()} />

      <div className="sf scaleblk">
        <div className="sf__in">
          <Section title="scale" tip="how the real solar system is squeezed onto a screen. The mode decides what a size and a distance mean." />
          <Choice name="scale-mode" value={form.scaleMode} onChange={set("scaleMode")} options={modes} />
          <p className="hint">
            <b>real</b> is genuinely to scale — one measure for size and distance both. At a span where Neptune
            fits on screen the earth is a fifth of a pixel and the sun is a dot, so the system is correct and
            very nearly invisible. It is here because it is the truth; <b>relative</b> is the one to fly.
          </p>

          <LogSlider
            label="system span" value={form.spanAu} onChange={set("spanAu")}
            min={0.2} max={LIGHT_YEAR_AU} stops={SPAN_STOPS} tip={TIPS.span} format={auText}
          />

          <div className="scaleblk__go">
            <Danger
              label={arranging ? "arranging…" : "auto-arrange the system"}
              armedLabel="click again — this rewrites every planet"
              size="md" onConfirm={() => void runArrange()}
            />
            <Tooltip text={TIPS.arrange} />
            <Toggle label="apply to the projects too" checked={applyAll} onChange={setApplyAll} tip={TIPS.apply} />
          </div>
          <p className="hint">
            Auto-arrange recomputes size, orbit, tilt and spin for every project from the real planet it maps
            to and writes them straight to the database, over whatever is stored. It uses the mode and span
            shown here, saved or not, so there is no undo — the values it overwrites are gone.
          </p>
        </div>
      </div>

      <Fold id="scene.sun" title="the sun" tip="radius and brightness set the star's presence; the rest is what its surface does.">
        <div className="fields fields--3">
          <Field label="radius" hint={`planets cap at ${cap.toFixed(2)}`} tip={TIPS.cap}><Num value={form.sunRadius} onChange={set("sunRadius")} step={0.25} /></Field>
          <Slider label="brightness" value={form.sunIntensity} onChange={set("sunIntensity")} min={0.2} max={2} step={0.05} tip="scales the light every planet is lit by, and the sun's own bloom." />
          <Slider label="granulation" value={form.sunGranulation} onChange={set("sunGranulation")} min={0} max={3} step={0.05} tip={TIPS.granulation} />
          <Slider label="limb darkening" value={form.sunLimb} onChange={set("sunLimb")} min={0} max={2} step={0.05} tip={TIPS.limb} />
          <Slider label="spots" value={form.sunSpots} onChange={set("sunSpots")} min={0} max={1} tip={TIPS.spots} />
          <Slider label="differential spin" value={form.sunSpin} onChange={set("sunSpin")} min={0} max={3} step={0.05} tip={TIPS.spin} />
          <Slider label="corona" value={form.sunCorona} onChange={set("sunCorona")} min={0} max={3} step={0.05} tip={TIPS.corona} />
          <Slider label="flare" value={form.sunFlare} onChange={set("sunFlare")} min={0} max={3} step={0.05} tip={TIPS.flare} />
        </div>
        <ColourRamp
          label="colour ramp" tip={TIPS.ramp}
          stops={[
            { label: "core", value: form.sunColorCore, onChange: set("sunColorCore") },
            { label: "mid", value: form.sunColorMid, onChange: set("sunColorMid") },
            { label: "edge", value: form.sunColorEdge, onChange: set("sunColorEdge") },
          ]}
        />
      </Fold>

      <Fold id="scene.system" title="the system and the camera" note="spread, lens, bloom">
        <div className="fields fields--3">
          <Field label="orbit scale" tip="multiplies every planet's distance from the sun at once, so the whole system spreads or tightens."><Num value={form.orbitScale} onChange={set("orbitScale")} step={0.05} /></Field>
          <Field label="field of view" tip="degrees. 42 is the default; higher feels wider and faster, lower feels telephoto."><Num value={form.fov} onChange={set("fov")} step={1} /></Field>
          <Slider label="bloom" value={form.bloom} onChange={set("bloom")} min={0} max={2} step={0.05} tip="how far bright pixels bleed. 0 turns the post-processing glow off entirely." />
        </div>
      </Fold>

      <Fold id="scene.belt" title="the asteroid belt" open={false} tip="a ring of instanced rocks between the inner and outer planets." note={`radius ${form.beltRadius} · ${form.beltDensity} rocks`}>
        <div className="fields fields--3">
          <Field label="radius"><Num value={form.beltRadius} onChange={set("beltRadius")} step={0.5} /></Field>
          <Field label="rocks" tip={TIPS.beltDensity}><Num value={form.beltDensity} onChange={set("beltDensity")} step={100} /></Field>
          <Slider label="width" value={form.beltWidth} onChange={set("beltWidth")} min={0.5} max={60} step={0.5} tip={TIPS.beltWidth} />
          <Slider label="thickness" value={form.beltThickness} onChange={set("beltThickness")} min={0} max={10} step={0.1} tip={TIPS.beltThickness} />
          <Slider label="rock size" value={form.beltRockSize} onChange={set("beltRockSize")} min={0.2} max={4} step={0.05} tip={TIPS.beltRock} />
          <Slider label="tilt" value={form.beltTilt} onChange={set("beltTilt")} min={-45} max={45} step={1} unit="°" tip={TIPS.beltTilt} />
        </div>
        <Swatches items={[{ label: "rock", value: form.beltColor, onChange: set("beltColor") }]} />
      </Fold>

      <Fold id="scene.sky" title="the sky" open={false} note={`${form.starCount} stars${form.constellations ? " · constellations on" : ""}`}>
        <div className="fields fields--3">
          <Field label="stars" tip="one point sprite each, drawn in a single call — thousands are cheap."><Num value={form.starCount} onChange={set("starCount")} step={200} /></Field>
          <Slider label="repo star gain" value={form.constellationGain} onChange={set("constellationGain")} min={0} max={3} step={0.05} tip={TIPS.gain} />
          <Toggle label="constellations from the other repos" checked={form.constellations} onChange={set("constellations")} tip={TIPS.constellations} />
        </div>
        <Swatches
          items={[
            { label: "nebula a", value: form.nebulaA, onChange: set("nebulaA") },
            { label: "nebula b", value: form.nebulaB, onChange: set("nebulaB") },
          ]}
        />
      </Fold>

      <p className="hint">The deck reads these on load, so a change shows on the next visit to /ship.</p>
      <div className="acts">
        <Btn kind="primary" size="md" type="submit" disabled={busy || !dirty}>{busy ? "saving…" : dirty ? "save the system" : "saved"}</Btn>
        <Btn size="md" onClick={() => setForm(initial)} disabled={!dirty}>undo</Btn>
      </div>
    </form>
  );
}

/** What the arrange endpoint says it wrote, read by shape — it is another agent's route and may say less. */
function report(body: unknown, form: Scene, applyAll: boolean): string {
  const o: Record<string, unknown> = typeof body === "object" && body !== null ? { ...body } : {};
  const list = o["bodies"] ?? o["projects"] ?? o["planets"];
  const count = Array.isArray(list) ? list.length : typeof o["updated"] === "number" ? o["updated"] : null;
  const sun = typeof o["sunRadius"] === "number" ? o["sunRadius"] : null;
  const span = typeof o["spanAu"] === "number" ? o["spanAu"] : form.spanAu;
  const used = typeof o["mode"] === "string" && isScaleMode(o["mode"]) ? o["mode"] : form.scaleMode;
  return [
    `arranged as ${used}`,
    count !== null ? `${count} ${applyAll ? "planets rewritten" : "planets placed"}` : applyAll ? "planets rewritten" : "scene only",
    sun !== null ? `sun ${sun.toFixed(2)}` : null,
    `span ${auText(span)}`,
  ].filter((s): s is string => s !== null).join(" · ");
}

// ── the star catalogue ──

interface StarRow {
  id: number; slug: string; name: string; kind: string; cls: string; constellation: string; note: string;
  radiusSolar: number; tempK: number; luminositySolar: number; massSolar: number; distanceLy: number;
}

const RESCALE_LABEL: Readonly<Record<Rescale, string>> = {
  none: "leave the system alone",
  planets: "scale the planets with the star",
  distances: "scale the distances too",
  refit: "lay the system out again to fit",
};

const CLASS_ORDER = ["G", "K", "M", "F", "A", "B", "WD"];
const GROUP: Readonly<Record<string, string>> = {
  G: "sun-like", K: "orange and red giants", M: "red dwarfs, giants and hypergiants",
  F: "yellow-white", A: "white and blue-white", B: "blue supergiants", WD: "white dwarfs",
};

const solarR = (r: number): string => (r >= 100 ? `${Math.round(r).toLocaleString("en-GB")}× sun` : `${Number(r.toFixed(r < 1 ? 3 : 2))}× sun`);

/**
 * Pick a real star. Applying one sets the sun's whole shader configuration and its radius at the true
 * ratio to the Sun — which for the hypergiants is destructive, so nothing is written until the preview
 * has said, in real numbers, what it will do.
 */
function StarCatalogue({ sunRadius, current, onApplied }: { sunRadius: number; current: string; onApplied: () => void }) {
  const [stars, setStars] = useState<StarRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<StarRow | null>(null);
  const [rescale, setRescale] = useState<Rescale>("refit");
  const [preview, setPreview] = useState<StarApplyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const { say } = useToast();

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch("/api/admin/presets/stars");
        const body: unknown = await r.json().catch(() => null);
        if (!alive) return;
        if (!r.ok || !Array.isArray(body)) { setError("the star catalogue is not available"); setLoading(false); return; }
        setStars(body as StarRow[]);
      } catch { if (alive) setError("no connection"); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Show the star that is actually applied without needing a click first — otherwise the only trace
  // of "what's selected" was the moment you picked it, gone the instant you navigated away and back.
  useEffect(() => {
    if (!current || picked) return;
    const found = stars.find((s) => s.slug === current);
    if (found) setPicked(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only stars finishing its own load should trigger this
  }, [stars, current]);

  const items: PickerItem[] = useMemo(() => {
    const sorted = [...stars].sort((a, b) => {
      const ca = CLASS_ORDER.indexOf(a.cls), cb = CLASS_ORDER.indexOf(b.cls);
      return ca !== cb ? ca - cb : a.radiusSolar - b.radiusSolar;
    });
    return sorted.map((s) => ({
      id: s.slug,
      label: s.name,
      group: GROUP[s.cls] ?? s.cls,
      meta: solarR(s.radiusSolar),
      note: `${s.kind}${s.constellation && s.constellation !== "—" ? ` · ${s.constellation}` : ""} · ${Math.round(s.tempK).toLocaleString("en-GB")} K`,
      terms: `${s.kind} ${s.constellation} ${s.note} ${s.cls}`,
    }));
  }, [stars]);

  // Every pick re-previews, and so does every change of what the planets should do — the sentence the
  // confirm shows has to describe the button that is actually there.
  const ask = async (slug: string, how: Rescale): Promise<void> => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/scene/star", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, rescale: how, preview: true }),
      });
      const body: unknown = await r.json().catch(() => null);
      if (!r.ok) { say("could not work out what that would do", true); setPreview(null); return; }
      setPreview(body as StarApplyResult);
    } catch { say("no connection", true); setPreview(null); } finally { setBusy(false); }
  };

  const pick = (slug: string): void => {
    const row = stars.find((s) => s.slug === slug) ?? null;
    setPicked(row);
    if (row) void ask(slug, rescale);
  };
  const choose = (how: Rescale): void => {
    setRescale(how);
    if (picked) void ask(picked.slug, how);
  };

  const apply = async (): Promise<void> => {
    if (!picked) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/scene/star", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: picked.slug, rescale, preview: false }),
      });
      const body: unknown = await r.json().catch(() => null);
      if (!r.ok) {
        const said = typeof body === "object" && body !== null && "error" in body ? String((body as { error: unknown }).error) : "";
        say(said || `could not apply that star (${r.status})`, true);
        return;
      }
      const done = body as StarApplyResult;
      say(`${done.star.name} is the star now · sun ${done.sun.sunRadius.toFixed(2)}`);
      setPreview(done);
      onApplied();
    } catch { say("no connection — nothing was changed", true); } finally { setBusy(false); }
  };

  const options: ChoiceOption<Rescale>[] = RESCALES.map((r) => ({
    value: r,
    label: RESCALE_LABEL[r],
    note: preview && preview.rescale === r ? preview.note : undefined,
  }));

  return (
    <div className="sf">
      <div className="sf__in">
        <Section title="put a real star at the centre" tip="thirty-one real stars with their published radius, temperature and luminosity. Picking one writes the sun's whole appearance, and its radius at the true ratio to the Sun." />
        <div className="fields fields--2">
          <Picker
            // The row lit is whichever star is under consideration right now — set on load to
            // whatever is actually applied, and moved the instant a different one is clicked, so
            // browsing candidates has the same immediate feedback as any other picker in the panel.
            items={items} label="search the catalogue — name, kind, constellation"
            loading={loading} error={error} onPick={pick} selected={picked?.slug ?? current ?? null}
            hint={`the star now is ${sunRadius.toFixed(2)} scene units — whatever that is, it is what one solar radius means here, so every pick is a true ratio against it`}
          />
          <div className="fields">
            {picked ? (
              <>
                <p className="panel__h">{picked.name}</p>
                <p className="hint">{picked.note}</p>
                <dl className="starfx">
                  <div><dt>radius</dt><dd>{solarR(picked.radiusSolar)}</dd></div>
                  <div><dt>temperature</dt><dd>{Math.round(picked.tempK).toLocaleString("en-GB")} K</dd></div>
                  <div><dt>luminosity</dt><dd>{picked.luminositySolar >= 1000 ? `${Math.round(picked.luminositySolar).toLocaleString("en-GB")}×` : `${Number(picked.luminositySolar.toFixed(3))}×`} sun</dd></div>
                  <div><dt>mass</dt><dd>{Number(picked.massSolar.toFixed(2))}× sun</dd></div>
                  <div><dt>distance</dt><dd>{picked.distanceLy < 1 ? "—" : `${Number(picked.distanceLy.toFixed(1)).toLocaleString("en-GB")} ly`}</dd></div>
                </dl>
                <Section title="and the planets" tip="the star's radius is applied at its true ratio, so a hypergiant will swallow the orbits unless the system moves with it." />
                <Choice name="star-rescale" value={rescale} onChange={choose} options={options} />
                {preview && <p className="hint is-bad">{preview.impact.warning}</p>}
                <div className="scaleblk__go">
                  <Danger
                    label={busy ? "working…" : `make ${picked.name} the star`}
                    armedLabel="click again — this rewrites the sun and every planet"
                    size="md" onConfirm={() => void apply()}
                  />
                  <Btn onClick={() => { setPicked(null); setPreview(null); }}>cancel</Btn>
                </div>
              </>
            ) : (
              <p className="hint">Pick a star to see what it would do. Nothing is written until you confirm it.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
