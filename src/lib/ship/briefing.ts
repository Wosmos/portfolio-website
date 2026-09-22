// The first-flight briefing: three coachmarks, each pinned to the control it teaches, each stepped
// on by the thing it teaches actually happening. Nothing here knows what the steps say or what they
// point at — the deck decides that — only how to place a card beside an anchor, when to show the
// next one, and how to get out of the way.

export interface BriefStep {
  /** What the card says. Plain text; the deck escapes nothing because it writes nothing dynamic here. */
  text: string;
  /** The control this step points at; `null` (or a hidden element) means wait until `reached` is called. */
  anchor: () => HTMLElement | null;
  /** Which side of the anchor the card sits on. */
  side: "top" | "bottom" | "left" | "right";
  /** A button that completes the step by hand; `null` when only the action itself can. */
  cta: string | null;
  /** How long after becoming due the card waits, so it lands after whatever animation just started. */
  delay: number;
}

export interface Briefing {
  /** Start from the first step. `force` replays it for a pilot who has already been briefed. */
  begin(force?: boolean): void;
  /** The thing step `i` teaches has happened: complete it and make the next one due. */
  reached(i: number): void;
  /** Dismiss the whole briefing, remembering it as seen. */
  skip(): void;
  /** Re-place the visible card — the anchor moved or the window was resized. */
  place(): void;
  readonly open: boolean;
  dispose(): void;
}

export interface BriefingOptions {
  el: HTMLElement;
  steps: readonly BriefStep[];
  /** True once the pilot has seen it all; `begin()` without `force` is then a no-op. */
  seen: () => boolean;
  onShow?: (i: number) => void;
  onDone?: (skipped: boolean) => void;
  /** The deck's own timer, so a pending card dies with the deck. */
  timer: (fn: () => void, ms: number) => number;
  clear: (id: number) => void;
}

const visible = (el: HTMLElement | null): el is HTMLElement => {
  if (!el || el.hidden) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && el.offsetParent !== null;
};

export function createBriefing({ el, steps, seen, onShow, onDone, timer, clear }: BriefingOptions): Briefing {
  const nEl = el.querySelector<HTMLElement>(".brief__n"), tEl = el.querySelector<HTMLElement>(".brief__t");
  const ctaBtn = el.querySelector<HTMLButtonElement>("[data-next]"), skipBtn = el.querySelector<HTMLButtonElement>("[data-skip]");
  let cur = -1, due = -1, pending = 0, finished = false, open = false;
  const GAP = 14, PAD = 12;

  function place(): void {
    const step = steps[cur];
    if (!open || !step) return;
    const a = step.anchor();
    if (!visible(a)) { hide(); return; }
    const r = a.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const vw = innerWidth, vh = innerHeight;
    let x = 0, y = 0;
    switch (step.side) {
      case "top": x = r.left + r.width / 2 - w / 2; y = r.top - h - GAP; break;
      case "bottom": x = r.left + r.width / 2 - w / 2; y = r.bottom + GAP; break;
      case "left": x = r.left - w - GAP; y = r.top + r.height / 2 - h / 2; break;
      case "right": x = r.right + GAP; y = r.top + r.height / 2 - h / 2; break;
    }
    x = Math.max(PAD, Math.min(vw - w - PAD, x)); y = Math.max(PAD, Math.min(vh - h - PAD, y));
    el.style.left = `${x.toFixed(0)}px`; el.style.top = `${y.toFixed(0)}px`;
    el.dataset.side = step.side;
    // the arrow points at the anchor's centre, wherever the clamp left the card
    const ax = step.side === "left" || step.side === "right" ? (step.side === "left" ? w : 0) : r.left + r.width / 2 - x;
    const ay = step.side === "top" || step.side === "bottom" ? (step.side === "top" ? h : 0) : r.top + r.height / 2 - y;
    el.style.setProperty("--ax", `${Math.max(10, Math.min(w - 10, ax)).toFixed(0)}px`);
    el.style.setProperty("--ay", `${Math.max(10, Math.min(h - 10, ay)).toFixed(0)}px`);
  }
  function hide(): void { open = false; el.classList.remove("is-on"); el.setAttribute("aria-hidden", "true"); }
  function show(i: number): void {
    const step = steps[i];
    if (!step || finished) return;
    cur = i;
    if (nEl) nEl.textContent = `${i + 1} / ${steps.length}`;
    if (tEl) tEl.textContent = step.text;
    if (ctaBtn) { ctaBtn.hidden = step.cta === null; ctaBtn.textContent = step.cta ?? ""; }
    if (skipBtn) skipBtn.textContent = i === steps.length - 1 ? "close" : "skip the briefing";
    open = true; el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    place();
    // the card needs one laid-out frame before its own size is right; place again once it has it
    requestAnimationFrame(() => { place(); el.classList.add("is-on"); });
    onShow?.(i);
  }
  function finish(skipped: boolean): void {
    if (finished) return;
    finished = true; clear(pending); hide();
    onDone?.(skipped);
  }
  /** Step `i` is due: wait its delay, then show it if its anchor is on screen. Otherwise it stays due. */
  function schedule(i: number): void {
    if (finished) return;
    if (i >= steps.length) { finish(false); return; }
    due = i; clear(pending);
    pending = timer(() => { if (due === i && !finished && visible(steps[i].anchor())) show(i); }, steps[i].delay);
  }
  const complete = (): void => { if (cur < 0) return; const next = cur + 1; hide(); cur = -1; schedule(next); };

  ctaBtn?.addEventListener("click", complete);
  skipBtn?.addEventListener("click", () => finish(cur < steps.length - 1));
  const onResize = (): void => place();
  addEventListener("resize", onResize);

  return {
    begin(force = false) {
      if (!force && seen()) return;
      finished = false; cur = -1; hide();
      schedule(0);
    },
    reached(i) {
      if (finished) return;
      // the taught thing happened while its card was up, or before the card had even landed
      if (cur === i) { complete(); return; }
      if (due === i && cur < 0) { schedule(i + 1); return; }
      // a later step's anchor just appeared: try again now that it is visible
      if (due > i && cur < 0 && visible(steps[due]?.anchor() ?? null)) schedule(due);
    },
    skip() { finish(true); },
    place,
    get open() { return open; },
    dispose() { clear(pending); removeEventListener("resize", onResize); hide(); el.hidden = true; },
  };
}
