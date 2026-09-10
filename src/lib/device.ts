// One place to decide how much decoration a device should be asked to render, so the motion pass and
// both planet mounts judge a phone the same way instead of each keeping its own guess.

interface NetworkInformation { saveData?: boolean; effectiveType?: string }
type CapableNavigator = Navigator & { connection?: NetworkInformation; deviceMemory?: number };

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = (): boolean => matchMedia("(pointer: fine)").matches;

/** Data saver, a 2G link, or a device with very little to spare. Deliberately conservative: this turns
 *  decoration off, so a false positive costs the visitor the look of the site. */
export function lowPower(): boolean {
  const nav: CapableNavigator = navigator;
  if (nav.connection?.saveData) return true;
  if (/2g/.test(nav.connection?.effectiveType ?? "")) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return true;
  return (nav.hardwareConcurrency ?? 8) <= 2;
}

/** Whether a WebGL planet is worth ~170 kB over the wire and a shader compile on this device. */
export const worthWebgl = (): boolean => !reducedMotion() && !lowPower();

/** Per-character text decoding shifts layout as the glyph spans reflow and cannot be appreciated
 *  without a hover, so it is spent only where there is a real pointer and headroom for it. */
export const worthDecoding = (): boolean => !reducedMotion() && !lowPower() && finePointer();

/** Runs `fn` once the page has stopped loading and the main thread is idle, so decoration never
 *  competes with content for a slow connection's bandwidth or a slow phone's first seconds. */
export function whenQuiet(fn: () => void, timeout = 3000): () => void {
  let idle = 0;
  let timer = 0;
  const schedule = (): void => {
    const ric = window.requestIdleCallback;
    if (ric) idle = ric(() => fn(), { timeout });
    else timer = window.setTimeout(fn, 200);
  };
  if (document.readyState === "complete") {
    schedule();
    return () => { if (idle) window.cancelIdleCallback?.(idle); clearTimeout(timer); };
  }
  addEventListener("load", schedule, { once: true });
  return () => {
    removeEventListener("load", schedule);
    if (idle) window.cancelIdleCallback?.(idle);
    clearTimeout(timer);
  };
}
