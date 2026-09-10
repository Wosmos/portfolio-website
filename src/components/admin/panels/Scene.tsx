"use client";
// The solar system's global values. These used to be constants in the shader file; now they are a row.
//
// Every field is read back defensively: the row gains columns faster than the API does, so a value the
// endpoint has not learned to send yet falls back to the same default the database column carries.

import { useState } from "react";
import { LIGHT_YEAR_AU, arrange, isScaleMode, maxPlanetSize, type ScaleMode } from "@/lib/scale";
import {
  Btn, Choice, ColourRamp, Danger, Field, Fold, LogSlider, Num, Section, Skeleton, Slider, Swatches,
  Toggle, Tooltip, useSingle, useToast, type ChoiceOption,
} from "../kit";

// A type alias rather than an interface: it has to be assignable to the endpoint's loose record shape.
type Scene = {
  id: number;
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
  if (loading || !value) return <Skeleton rows={6} />;
  const row = fill(value);
  return <Form key={row.id} initial={row} save={save} refresh={refresh} />;
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
