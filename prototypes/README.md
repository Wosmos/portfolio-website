# v3 prototype

High-fidelity, running prototype of the v3 redesign. Standalone — no build step.
The whole page lives inside one fixed three.js scene: a gate, a hero over black, then the
cosmos **opens as a chamfered window and grows to the full viewport** as you scroll (pinned
while you explore), and the about / experience / contact panels float over the live system
with the camera drifting to a new vantage point for each. Sound is synthesised, no assets.

## Run

```sh
# from the repo root — any static server works
python3 -m http.server 4173 --directory prototypes
# → http://localhost:4173/
```

Query params: `?mode=list` starts in list view · `?ws=wss://your-server` points "go live"
at a different WebSocket endpoint.

## What is real vs. placeholder

| Piece | Status |
|---|---|
| Gate (one `INITIATE UPLINK →`) → sweep → hero reveal (SplitText chars) | real |
| Uplink | the gate opens a real WebSocket in the background and measures real round-trip. Points at `wss://echo.websocket.org` until the Go presence service exists. |
| Status strip · last push / repo years | real, unauthenticated GitHub API (60 req/h), falls back to static text |
| Status strip · `npx wasif-malik` runs | real, `api.npmjs.org` |
| **The system** | real three.js + bloom, at **real-feeling scale**: sun radius 6, orbits 17→110 (2.3× the previous), camera low and far so the outer orbit fills the frame; small planets carry an invisible pick sphere so they stay clickable. One planet per orbit, Kepler-ish speeds, rotating planets, pulsing corona, drifting nebula, 4200 twinkling stars, a 2200-rock asteroid belt with its own **debris rumble that rises as the camera nears it**, a comet. Procedural shader worlds; **Zcrypt and Learnity carry Saturn-class rings** — a generated 2048-sample profile (C/B/Cassini/A regions, ~40 ringlet frequencies, two dozen gaps, Encke), polar-mapped, planet shadow on the ring and ring shadow on the planet, forward scatter from the unlit face. Drag to orbit. |
| **Flights** | **the sky itself stretches.** Every star in the starfield is also a line segment whose tail is pushed away from the vanishing point in screen space in proportion to speed — so the streaks are the real stars elongating (the actual Star Wars technique), and the system stays visible under motion blur; no dust, no black-out, no flash. The camera flies a **curved arc** lifted above the plane and bowed away from the sun, turns into the direction of travel as speed builds and settles onto the destination as it brakes. One smooth symmetric speed curve; **flight time scales with distance** (1.5 s for a neighbouring orbit → 4.6 s across the system) and the whoosh is re-timed to the flight so the sound peak lands on the speed peak. The return uses the same curve, arc and sound (pitched slightly down) — a true mirror. `← →` between planets, `esc` returns. |
| **Readout** | chamfered HUD on arrival: scramble-decode title, typewriter description, module bars, uplink, links, range. |
| **Sound** | real files from **Mixkit** (free, no attribution) chosen by spectral measurement — bed *Echoes* as a seamless 120 s loop, plus hover / click / type / warp / retro / arrive / core / thud / belt-hit / belt rumble. `assets/audio/manifest.json` maps the slots; swap any file without touching code. See `assets/audio/README.md`. |
| **Easter eggs** | click the **sun** (CORE readout — you), `t` auto tour, Konami → hyperdrive, a console note. |
| Experience — mission log | a timeline **ribbon** (year scale, one span per station, a ship riding your scroll, a live **mission clock** for the active post), then chamfered mission cards — scramble-decoded station names, telemetry row, duration bars, systems chips, a per-station **constellation** drawn from its name, a scan sweep on activation; hovering a card lights its span and vice versa. |
| System ⇄ list toggle (`s` / `l`) | real; the recruiter path never depends on WebGL |
| Scroll-opened cosmos | desktop: works pins for 170vh; the window opens over the first 42% then holds. Mobile: no pin, cosmos simply full behind works onward. |
| Scroll text | SplitText line-mask reveals on `[data-split]`, fade-ups on `[data-reveal]` |
| Cursor phosphor trail · film grain | real; trail off on touch and under `prefers-reduced-motion` |
| Demo video slot | **placeholder** for furniZsh and NetLink (no public deployment) |

## Files

- `orbit.html` — markup only (was `index.html`; `index.html` is now the Read / Fly gate)
- `styles.css` — tokens + all styling
- `data.js` — the 8 projects with their `planet` shader config, experience, skills
- `orbit.js` — the system (sun, nebula, twinkle stars, belt, comet, planet/atmosphere/ring shaders, warp streaks, RGB-shift pass, spherical drag camera, page poses, flights), framework-free, written to port 1:1 into R3F
- `app.js` — gate, socket, status strip, scroll-opened cosmos, toggle, list, flights + HUD, sound wiring, mission log, reveals, trail, easter eggs
- `audio.js` — file-based sound loader (slots from `assets/audio/manifest.json`)
- `assets/` — `wosmo.svg` (the mark, rebuilt from `public/w.svg`), resume PDF

## Known gaps

- `DevToolsHQ` is not a public repo, so its year stays `—` until added by hand in `data.js`.
- `github.com/Wosmos/Learnity` is not in the public repo list — check the link.
- Presence ("who else is here") needs the Go service; the door copy already promises it.
- `public/w.svg` itself is broken as shipped (junk before `<?xml`, shapes inside `<defs>`) — the
  live site should use the rebuilt `assets/wosmo.svg`.
- Check frame rate on a real phone; drop belt count or dpr if it stutters.

## Round 11 — the reading site + the gate (10 Sep 2026)

- `index.html` — the **Read / Fly gate**. Two equal doors; the choice is kept in `localStorage`
  (`v3-door`) so a returning visitor lands straight on their side. `?gate=1` forces the gate
  (the "read / fly" link in the reading site's footer and the ship's `read →` pill use it).
- `read/` — the recruiter site: `index.html` (summary, proof numbers computed from the data,
  8 projects, 5 roles with the résumé bullets, 7 skill groups, education, contact form),
  `project.html?id=<id>` (one page per project: résumé bullets where the PDF has them, the
  GitHub language composition — the same numbers as the planet cutaway — stack, links, and
  **fly there →** which opens `ship/?to=<id>`), `contact.html`. Shared runtime in `read.js`,
  styles in `read.css`. Same tokens, chamfers, type and sounds as the deck; the ambient bed at
  half level; the sound toggle shares `v3-muted` with the ship.
- `dev-server.mjs` — replaces `python3 -m http.server`: static files **plus** `POST /api/contact`,
  which sends through Resend exactly like `src/app/api/contact/route.ts` (honeypot, 5/hour/IP,
  escaped HTML, `onboarding@resend.dev` → owner inbox). Reads `RESEND_API_KEY` from the repo's
  `.env.local`; without it the endpoint answers 500 and the form shows the failure state.
  Run: `node prototypes/dev-server.mjs` → http://localhost:4173/
- `ship/?to=<id>` — the deck skips the press-start wait and jumps to that planet.
- Content source: `public/resume/Wasif_Malik_Resume_SoftwareEngineer.pdf` → `data.js`
  (`person.summary`, `experience[].bullets`, `skills` as the seven résumé groups, `education`,
  `highlights` for Zcrypt / Learnity / NetLink). The PDF has no certifications, so the site has none.

### Round 11b — motion pass on the reading site (10 Sep 2026)

Owner: *"so vanilla, so thin, add GSAP animations, cipher text, make it more aesthetic, both sides
need the bg music."* Column widened to 1160 px with two-column layouts (hero + at-a-glance panel,
2-up project cards, dates-left experience timeline, 2-up skills/education, contact copy + form).
GSAP 3.13 + ScrollTrigger + SplitText: **cipher decode** on the name, every section title, role
titles and card labels (`cipher()` in `read.js`; project titles re-cipher on hover), summary words
blur in, curtain page transitions on every internal link, scroll progress bar under the header,
counters, composition bars grow, **2D cutaway dials** per project (concentric rings by volume share,
same rule as the 3D cutaway) draw on scroll and slowly rotate, timeline line draws with scroll,
pointer tilt + spotlight on cards, magnetic buttons, star parallax on scroll. Live "last push" from
the GitHub events API. Ambient bed now starts on load at 0.7 (Chrome allows it after the gate click
on the same origin) and falls back to the first gesture.

### Round 11c — real planets on the reading site (10 Sep 2026)

Owner: hover tick fired while scrolling ("unnatural"); too many projects on the home page — use a bento of
3–4 highlights and a dedicated projects page; and use the *actual* planets everywhere, interactive.

- **Hover sound** only after a deliberate hover: the pointer must have moved onto the element (not the
  page scrolling under a still cursor) and stayed 500 ms. Section-title ciphers no longer tick.
- **Home** shows a bento of the four `featured` projects (`data.js`): Zcrypt across the row with a big
  planet, Learnity / NetLink / furniZsh below. **`read/projects.html`** lists all eight with planets.
- **Planets**: `planet-view.js` renders the flight deck's own shader bodies in small transparent
  canvases — drag to turn (inertia), hover glow, rings, and on the project page **click / "cut it open"**
  runs the same volume-share cutaway with a callout list that highlights layers in 3D. To share the
  code, `ship/scene.js` now exports `makeBody(p, i)` (planet + atmosphere + ring + cutaway group) and
  the cutaway builders moved to module scope; the deck itself is unchanged (regression-checked).
  Views mount lazily — one per frame, only when the canvas nears the viewport — and pause off-screen.

### Round 11d — polish from the owner's pass (10 Sep 2026)

- Project page: the planet left the side card for a **full-width stage** (drag, click / button to cut,
  callouts appear only while cut); the duplicated composition card is gone, stack + links moved beside
  the text. Card **tilt removed** (spotlight stays). The eight dials in the status panel are now **one
  canvas of real mini planets** (`createPlanetStrip`, one renderer, hover names them, click opens).
- Experience: the line is grey and a glowing cyan head draws down with scroll; each station **lights
  up** (diamond, title glow, full opacity) as it is reached and dims again on the way back.
- Skills: a **console matrix** (`skills --list`, numbered tokens per group) with a sticky readout —
  hovering a token shows which projects use it (stack + GitHub languages) and lights those bento cards,
  dimming the rest; click pins. Tokens type in as the section enters.
- **Testimonials** section, data-driven from `testimonials` in `data.js`. The two entries are SAMPLES
  (flagged `placeholder: true`, rendered with an amber "sample · replace" tag); replace or delete.
- Not built on purpose: dedicated pages per job — that is LinkedIn's pattern, not a portfolio's; the
  timeline already carries every résumé bullet.
- GSAP `lagSmoothing(0)` so shader compiles (long frames) never stall the decode animations; the strip
  and every planet view compile one body per frame.

### Round 11e — project page as hero + about, live from GitHub (10 Sep 2026)

Owner: strip order was reversed; the planet did not work inside the card — heading and meta as a hero
with the planet on the right, then the description below, more polished.

- Strip fixed (camera looks along +z, so world −x is screen-right).
- **Project page**: hero = k-line, title, résumé heading, live/since/pushed/stars meta, one-line
  description, action buttons (source · live · TUI · fly there) on the left; the planet on the right
  with "cut it open" under it and the layer callouts in a 2-up grid when cut. Below: **01 About** —
  the résumé bullets (where the PDF has them) followed by the repo **README rendered live from
  GitHub** (`readmeHtml` + `mdLite` in `read.js`: headings, paragraphs, lists, inline code/links; drops
  images, badges, tables, code fences, TOC sections, anchor-only lists, empty headings) with a
  **facts** card (status, category, repo, created, last push, stars from `repoMeta`, top language);
  **02 Built with** — composition bar + stack. Failures are reported honestly (`ghReason`: private
  repo · rate limit · unreachable) — unauthenticated GitHub allows 60 requests/hour, which the
  prototype can exhaust while testing; the Next port fetches server-side with a token and caches.
- Bug caught by the frame pass: an earlier CSS slice replacement had deleted the bento / planet-canvas /
  callout rules (planets rendered at 2× and off-centre) — restored.
