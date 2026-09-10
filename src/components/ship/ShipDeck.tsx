"use client";
// The flight deck's DOM. All behaviour lives in @/lib/ship/deck (mountDeck), which is imported
// dynamically so three.js and the scene stay out of every other route's bundle.

import { useEffect, useRef } from "react";
import type { DeckOptions } from "@/lib/ship/deck";
import "@/styles/ship.css";
import { WMark, Wordmark } from "@/components/Mark";

export type ShipDeckProps = DeckOptions;

export default function ShipDeck({ initialTarget, lastPush = null }: ShipDeckProps) {
  const root = useRef<HTMLDivElement>(null);
  // `?to=<id>` deep links from the reading site; read here so /ship can be prerendered
  const target = initialTarget ?? new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("to") ?? undefined;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("@/lib/ship/deck").then(({ mountDeck }) => {
      if (cancelled) return;
      cleanup = mountDeck(el, { initialTarget: target, lastPush });
    });
    return () => { cancelled = true; cleanup?.(); };
  }, [target, lastPush]);

  return (
    <div ref={root}>
      <div id="cosmos" className="cosmos" aria-hidden="true"><canvas id="orbit-canvas" /></div>
      <div className="grain" aria-hidden="true" />

      {/* boot */}
      <section id="boot" className="boot" aria-label="Start">
        <WMark className="boot__w" width={248} height={160} />
        <Wordmark className="boot__mark" width={180} height={28} />
        <p className="boot__role">software engineer</p>
        <pre id="boot-log" className="boot__log" aria-live="polite" />
        <button id="start" className="sf sf--cta boot__btn" type="button"><span className="sf__in">press start</span></button>
        <a className="switch" href="/read" data-door="read">prefer to read? · résumé site →</a>
      </section>

      {/* cockpit */}
      <div id="deck" className="deck" aria-hidden="true">
        {/* physical frame: layered so it can parallax on tilt */}
        <div className="frame" aria-hidden="true">
          <svg className="frame__svg" viewBox="0 0 1440 900" preserveAspectRatio="none">
            <defs>
              <linearGradient id="strut" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#06070b" /><stop offset=".35" stopColor="#1a1e28" /><stop offset=".5" stopColor="#262b38" /><stop offset=".65" stopColor="#1a1e28" /><stop offset="1" stopColor="#06070b" /></linearGradient>
              <linearGradient id="hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c0f16" /><stop offset=".55" stopColor="#151925" /><stop offset="1" stopColor="#090b10" /></linearGradient>
              <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fd8ff" stopOpacity=".07" /><stop offset=".3" stopColor="#9fd8ff" stopOpacity="0" /><stop offset=".75" stopColor="#9fd8ff" stopOpacity="0" /><stop offset="1" stopColor="#9fd8ff" stopOpacity=".05" /></linearGradient>
            </defs>
            {/* windshield tint */}
            <rect x="0" y="0" width="1440" height="900" fill="url(#glass)" />
            {/* A-pillars, slim, converging toward the vanishing point above the horizon */}
            <polygon points="0,0 54,0 118,900 0,900" fill="url(#strut)" />
            <polygon points="1440,0 1386,0 1322,900 1440,900" fill="url(#strut)" />
            <polyline points="54,0 118,900" fill="none" stroke="#00e5ff" strokeOpacity=".28" strokeWidth="1.2" />
            <polyline points="1386,0 1322,900" fill="none" stroke="#00e5ff" strokeOpacity=".28" strokeWidth="1.2" />
            {/* overhead rail */}
            <polygon points="54,0 1386,0 1374,16 66,16" fill="url(#hood)" />
            <line x1="66" y1="16" x2="1374" y2="16" stroke="#00e5ff" strokeOpacity=".2" />
            {/* dashboard hood */}
            <polygon points="118,900 1322,900 1336,748 104,748" fill="url(#hood)" />
            <polygon points="104,748 1336,748 1332,736 108,736" fill="#1d2230" />
            <line x1="108" y1="736" x2="1332" y2="736" stroke="#00e5ff" strokeOpacity=".35" />
            {/* rivets */}
            <g fill="#2a3040">
              <circle cx="30" cy="120" r="2.5" /><circle cx="42" cy="360" r="2.5" /><circle cx="58" cy="600" r="2.5" /><circle cx="76" cy="840" r="2.5" />
              <circle cx="1410" cy="120" r="2.5" /><circle cx="1398" cy="360" r="2.5" /><circle cx="1382" cy="600" r="2.5" /><circle cx="1364" cy="840" r="2.5" />
            </g>
          </svg>
          <div className="frame__vignette" />
        </div>

        {/* instrument screens in the hood */}
        <div className="dash">
          <div className="screen screen--left">
            <span className="screen__k">targets · <i id="tgt-count" /></span>
            <ol id="targets" className="targets" />
            <button className="tgt tgt--sun" type="button" data-sun><span className="tgt__n">★</span><span className="tgt__name">the sun<small>pilot · core</small></span></button>
          </div>

          <div className="screen screen--mid">
            <canvas id="dash" width="640" height="150" aria-hidden="true" />
            <div className="lamps" aria-hidden="true">
              <i id="lamp-link" className="lamp" data-l="uplink" /><i id="lamp-belt" className="lamp" data-l="belt" /><i id="lamp-lock" className="lamp" data-l="lock" /><i id="lamp-hyper" className="lamp" data-l="hyper" /><i id="lamp-fuel" className="lamp" data-l="fuel" />
            </div>
          </div>

          <div className="screen screen--right">
            <canvas id="radar" width="200" height="200" />
            <div className="tele">
              <div className="tele__row" data-act="state" title="disengage"><span>state</span><b id="tl-state">orbiting</b></div>
              <div className="tele__row" data-act="range" title="au / km"><span>range</span><b id="tl-range">—</b></div>
              <div className="tele__row"><span>eta</span><b id="tl-eta">—</b></div>
              <div className="tele__row" data-act="uplink" title="re-ping"><span>uplink</span><b id="tl-link">static</b></div>
              <div className="tele__row" data-act="push" title="open on github"><span>last push</span><b id="tl-push">…</b></div>
              <div className="tele__row" data-act="clock" title="pkt / local"><span>clock</span><b id="tl-clock">—</b></div>
            </div>
          </div>
        </div>

        {/* top: ship id + wordmark */}
        <div className="deck__id"><WMark className="deck__w" width={34} height={22} /><div><b>WSF-01 · flight deck</b><span>pilot · wasif malik · software engineer</span></div></div>
        <Wordmark className="deck__mark" width={84} height={13} />
        <a className="switch switch--deck" href="/read" data-door="read" title="The same content as a plain site">read →</a>

        {/* reticle + lock */}
        <div className="reticle" aria-hidden="true"><i /><i /><i /><i /></div>
        <div id="lock" className="lock" aria-hidden="true"><i /><i /><i /><i /><span className="lock__t" /></div>
        <svg id="callouts" className="callouts" aria-hidden="true" />
        <div id="callout-labels" className="callout-labels" aria-hidden="true" />

        {/* console keys */}
        <div className="keys">
          <button className="key" type="button" data-panel="pilot"><b>P</b> pilot</button>
          <button className="key" type="button" data-panel="log"><b>M</b> log</button>
          <button className="key" type="button" data-panel="comms"><b>C</b> comms</button>
          <button className="key" type="button" data-tour><b>T</b> tour</button>
          <button className="key" type="button" data-cmd><b>/</b> cmd</button>
          <button id="snd" className="key" type="button" aria-pressed="true"><b>S</b> snd</button>
          <button id="gyro" className="key key--gyro" type="button" hidden><b>◎</b> tilt</button>
        </div>
        <span className="hint">drag · look &nbsp; wheel · throttle &nbsp; click a planet · jump &nbsp; every gauge is live: tap it</span>

        {/* readout */}
        <aside id="hud" className="hud sf" aria-label="Readout" aria-hidden="true">
          <div className="sf__in">
            <div className="hud__bar"><span className="hud__sys"><WMark className="logo--hud" width={18} height={12} /> target // <b className="hud__idx">01 / 08</b></span><button className="hud__close" type="button">disengage · esc</button></div>
            <div className="hud__body">
              <div className="hud__meta" />
              <h2 className="hud__title" />
              <p className="hud__tag" />
              <p className="hud__desc" />
              <div className="hud__comp" />
              <div className="hud__mods" />
              <div className="hud__demo sf sf--thin"><div className="sf__in" /></div>
              <div className="hud__links" />
            </div>
            <div className="hud__nav"><button className="hud__prev" type="button">← prev</button><button className="hud__cut" type="button" data-cut><b>X</b> cutaway</button><span className="hud__range" /><button className="hud__next" type="button">next →</button></div>
          </div>
        </aside>

        {/* panels */}
        <aside id="panel" className="panel sf" aria-hidden="true">
          <div className="sf__in">
            <div className="hud__bar"><span className="hud__sys"><WMark className="logo--hud" width={18} height={12} /> <b id="panel-title">pilot</b></span><button className="panel__close" type="button">close · esc</button></div>
            <div id="panel-body" className="panel__body" />
          </div>
        </aside>

        {/* command line */}
        <form id="cmd" className="cmd" hidden autoComplete="off"><span className="cmd__ps">wsf-01 ›</span><input id="cmd-in" type="text" spellCheck={false} aria-label="command" /><pre id="cmd-out" className="cmd__out" /></form>

        {/* beacon (drifts by, rarely) */}
        <button id="beacon" className="beacon" type="button" hidden aria-label="distress beacon"><i /><span>· · · — — — · · ·</span></button>

        <div id="toast" className="toast" role="status" aria-live="polite" />
      </div>
    </div>
  );
}
