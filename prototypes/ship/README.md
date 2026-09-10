# Flight deck — the no-scroll variant

`prototypes/ship/` is a second prototype built on the same scene, data and audio as the page
version, with the page removed. There is no scroll, no navbar, no sections: the browser window
*is* the cockpit of a ship (WSF-01) parked above the system.

Run the same static server and open `http://localhost:4173/ship/`.

## How it plays

| Input | Does |
|---|---|
| **press start** | boot log, uplink handshake, cockpit fades in |
| drag | look around (yaw + a little pitch) |
| **wheel** | **throttle** — dolly in toward the system / out to the edge. This is what scroll does here. |
| **click a planet** (or a target in the left list · `1`–`8`) | jump to it — labels are tooltips only, hover shows the tagline (arc, star-stretch, distance-based duration, synced whoosh) |
| `← →` | next / previous planet |
| `0` · click the sun · "the sun · pilot" in the list | the CORE readout — you |
| `esc` | disengage and fly home (or close a panel) |
| `P` `M` `C` | **pilot** (about + skills), **mission log** (experience), **comms** (contact) — as HUD panels over the live scene |
| `T` | auto tour · `S` sound · `D` diagnostics · `B` black box · `9` next mission |
| `/` | **command line** — `help`, `status`, `whoami`, `scan`, `jump <name|n>`, `tour`, `sun`, `home`, `diag`, `bbox`, `next`, `flare`, `hyperdrive` |

### Easter eggs

Click the sun (CORE readout) · **long-press** the sun (solar flare) · `t` tour · Konami → hyperdrive ·
`/` command line · `d` **diagnostics** (real GPU, fps, heap, RTT, position) · `b` **black box**
(every flight this session, replayable from the panel) · `9` / a drifting **distress beacon** that
crosses the sky every minute or two → **orbit 09 · next mission** (this site itself) · the console note.

## The cockpit

A perspective canopy (converging A-pillars, overhead rail, deep dashboard hood with a lit lip,
rivets, glass tint, vignette) that **parallaxes** with the pointer (desktop) or the phone's tilt
(mobile, one tap to allow); the whole frame shakes gently in flight. A centre reticle that hides in
flight, a **target-lock** bracket that snaps to the hovered/current planet with its range, ship id
top-left with the **W glyph** (the W from the wordmark, white), a **radar** top-right (top-down map: orbits, planets, the ship's position and heading, a
sweep), a **targets** list left (numbered, current target lit), **telemetry** right (state,
range in au, throttle %, uplink RTT, last GitHub push, Karachi clock), and a bottom **console**
and the **wosmo wordmark** top-right. Three instrument screens set into the hood (scanlines, glass
reflection): **targets** · the **main instrument** (heading tape, artificial horizon from the
camera's pitch/roll, velocity, ETA, throttle and **energy** gauges with detents, fps) with five
warning lamps (uplink · belt · lock · hyper · fuel) · **radar + telemetry**. Energy drains per jump
by distance and recharges near the sun; below 8 % you cannot jump. Physical-looking console keys.

Both marks are used deliberately: the wordmark's own W glyph (white) is the ship insignia — boot,
ship id, panel bars, favicon — and the full wordmark is the maker's plate top-right.

Sun picking: a planet only wins the click if the ray hits its real body closer than the sun — the
inflated pick spheres that keep small planets clickable no longer shadow the sun.

## Cutaway — the planet's composition as geology

Holding at a planet, press **X** (or the `X cutaway` button in the readout, or `/cutaway`): a quarter
wedge of the planet opens toward you and the inside is the project's **GitHub language split** as
concentric layers — crust, then each language as a shell, largest share directly under the crust,
smallest at the core, in GitHub's own linguist colours. Each language's share is its share of the
sphere's **volume** (r = 0.94·∛cumulative), which is what a cross-section is read as — exactly the data,
and a 0.4 % language is still a visible band rather than a dot. The cut faces show
the bands like a textbook Earth cross-section. The readout carries the matching **composition bar +
legend**. Press X again to close; flying anywhere closes it.

While the cutaway is open the planet **holds still** (orbit and spin frozen, station-keeping paused,
atmosphere hidden) and **dragging orbits the camera around it** — yaw and pitch — so every side is
inspectable. Each layer gets a sci-fi **leader line** (dot on the cut face → diagonal → shelf → chamfered
label) with the exact GitHub percentage and a one-line role; labels stack left of the planet. Opening
plays the core chord, closing a click. Layer thickness is strictly the data — no visual rescaling.

Data is in `data.js` → `langs` per project — real numbers from the GitHub API for the public repos
(fetched 8 Sep 2026); Learnity and DevToolsHQ are private so those two are estimates. When this moves
into Next, `GET /repos/{owner}/{repo}/languages` replaces the hard-coded arrays.

## Every instrument does something

| Instrument | Tap / drag |
|---|---|
| heading tape | drag left/right to turn the ship |
| attitude ball | tap to level |
| THR gauge | drag to set throttle · NRG gauge: tap to recharge (throttle to the core) |
| lamps | uplink → re-ping · belt → hold at the belt · lock → jump to the locked planet (or disengage) · hyper → hyperdrive · fuel → recharge |
| radar | tap a dot → jump · tap the centre → the sun · tap empty space → turn to that bearing |
| telemetry | state → disengage · range → au ⇄ Mkm · uplink → re-ping · last push → open the repo · clock → pkt ⇄ local |

Holding at a planet is **station-keeping**: the camera drifts slowly around it instead of freezing.
The sun carries an anamorphic flare that widens on a solar flare.

## Files

- `index.html` · `ship.css` · `ship.js` — the deck
- `scene.js` — a copy of `../orbit.js` with the deck-specific changes: wheel throttle on the
  camera radius, drag pitch, labels no longer gated on page scroll, the return flight keeps its
  eyes on the departing planet, `heading()` for the radar
- imports `../data.js`, `../audio.js`, `../assets/`

## Deep link

`ship/?to=<project id>` (e.g. `?to=zcrypt`) auto-starts the deck and flies to that planet — used by the reading site's **fly there →** buttons. `read →` top-right returns to the reading site.
