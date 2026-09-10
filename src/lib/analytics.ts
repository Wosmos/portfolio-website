// Custom events on top of Vercel Web Analytics. Page views, referrers, countries and devices come for
// free; these answer the questions the dashboard cannot: which door people pick, what they open, how
// far they read, and whether the contact form actually completes.
//
// Rules: no personal data ever leaves the page — no names, no message text, no email addresses. Only
// the shape of the visit. Values must be strings, numbers or booleans (Vercel's limit).

import { track } from "@vercel/analytics";

export type EventName =
  | "door"              // { door: "read" | "fly" }
  | "resume"            // { from: string } — the résumé PDF was opened
  | "project_open"      // { id, from }
  | "cutaway"           // { id, where: "read" | "deck" }
  | "moon_open"         // { id, folder } — a moon was clicked, opening that folder on github
  | "planet_drag"       // { id }
  | "read_depth"        // { path, depth: 25 | 50 | 75 | 100 }
  | "contact_submit"    // { ok: boolean }
  | "deck_start"        // {}
  | "deck_flight"       // { id }
  | "deck_panel"        // { panel }
  | "easter_egg";       // { egg }

type Value = string | number | boolean | null;

export function ev(name: EventName, props?: Record<string, Value>): void {
  try { track(name, props); } catch { /* analytics must never break a page */ }
}
