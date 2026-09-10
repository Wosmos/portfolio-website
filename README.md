# wosmos.vercel.app — portfolio v3

Two ways into the same work. A visitor picks one at the door and can switch at any time.

- **Read** — the résumé as a site. Server-rendered pages, real content in the HTML, a page per project.
- **Fly** — a flight deck. The eight projects are a solar system you pilot; cut a planet open and its
  layers are that repository's GitHub language split, to scale.

**Live:** https://wosmos.vercel.app

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** in `strict` mode, no `any`
- **three.js** for the scene and the planets · **GSAP** (ScrollTrigger, SplitText) for motion
- Plain CSS with design tokens (`src/app/globals.css`); no utility framework
- **Resend** for the contact form (server route: honeypot, rate limit, escaped HTML)
- Vercel Analytics + Speed Insights · dynamic `next/og` social card

## Performance

Measured against `next start` on this machine, uncompressed:

| Route | JS on load | Total on load |
|---|---|---|
| `/` | 455 kB | 521 kB |
| `/read` desktop | 1206 kB | 1581 kB |
| `/read` mobile | 606 kB | 942 kB |
| `/read/contact` | 636 kB | 948 kB |

three.js is ~700 kB of that and is never in the first payload: the chunk is requested only when a
planet canvas comes within 700 px of the viewport. The decorative planet strip in the hero is skipped
entirely on coarse pointers, data saver, low-memory or low-core devices and under
`prefers-reduced-motion`, which is why mobile loads half as much. The ~1 MB ambient bed is fetched on
the first real interaction, never on load; the interface cuts are a few kB and load with the page.

## Routes

| Route | Rendering | What it is |
|---|---|---|
| `/` | static | the Read / Fly door; the choice is remembered in `localStorage` |
| `/read` | ISR, 1 h | summary, selected projects, experience, skills, education, testimonials, contact |
| `/read/projects` | ISR, 1 h | all eight projects |
| `/read/projects/[slug]` | SSG + ISR, 1 h | one project: hero, README from GitHub, facts, composition |
| `/read/contact` | static | the form on its own page |
| `/ship` | static shell | the flight deck (client-only WebGL); `?to=<id>` flies straight to a planet |
| `/api/contact` | dynamic | Resend handler |

Everything a recruiter needs is in the server-rendered HTML. WebGL, sound and motion are additive:
without them the reading site still works, and `prefers-reduced-motion` collapses the animation.

## Live data

`src/lib/github.ts` fetches on the server and caches for an hour: per-repo description, homepage,
topics, stars, `created_at`, `pushed_at`, the language split that drives the planet layers, and the
README (rendered by a small markdown subset that drops badges, tables, code fences and anchor lists).
Every call degrades to the static records in `src/data/portfolio.ts`, so a rate limit or a private
repository never breaks a page.

It also reads the account as a whole. `listRepos()` pages through every repository on `Wosmos`
(100 at a time, five pages at most) and feeds the admin's repo picker through
`GET /api/admin/github/repos`. `getRepoStars()` takes the repositories that are *not* one of the eight
projects — forks excluded — and returns `{ name, commits, stars, language, colour }` for the 24 most
recently pushed, which the deck draws as background constellations. `commits` is the sum of
`contributors?per_page=100&anon=1`: every commit GitHub attributes to a contributor on the default
branch. It therefore misses other branches, and one request per repository is the cheapest number
GitHub will give without walking the commit list.

**`GITHUB_TOKEN` now does four things.** It raises the API limit from 60 to 5000 requests an hour,
which the repo list and the commit counts need; it switches the repo list to `/user/repos`, so private
repositories appear in the picker; it is the only way to read a private repository's tree, which moon
detection needs (Learnity and DevToolsHQ are private); and without it the picker is public-only.
Nothing breaks without a token — the lists just come back short or empty and those two projects
detect no moons.

Three per-project switches decide who wins when both halves have an answer:
`useLiveLangs` (off: the stored language split drives the planet cutaway), `useLiveMeta` (off: the
stored description, live URL and stack stand) and `useLiveReadme` (off: the README is not fetched at
all). They live on the `projects` row and are edited in the admin.

### Moons

A repository's meaningful top-level folders become the planet's moons: Zcrypt's `backend`, `frontend`,
`mobile` and `core`; Learnity's single `app`. One request per project —
`GET /repos/{owner}/{repo}/git/trees/HEAD`, not recursive, cached an hour, degrading to an empty list —
because the top level is all a moon is made of and a recursive tree on a monorepo is megabytes. `HEAD`
rather than a branch name so GitHub resolves the default branch itself, whatever it is called.

**Skipped**, because they are not parts of the product: everything beginning with a dot (`.github`
included), `node_modules`, `dist`, `build`, `out`, `target`, `vendor`, `public`, `assets`, `docs`,
`test`, `tests`, `__tests__`, `scripts`, `examples`, `coverage`, `tmp`. The list is `MOON_SKIP` in
`src/lib/github.ts`.

**Capped at six per planet** so a monorepo does not produce a swarm. The largest folders win, by entry
count when the tree reports one and alphabetically when it does not — a non-recursive tree usually
reports none.

Every value is derived from an FNV-1a hash of `"<project>/<folder>"`, never from `Math.random`, so the
same repository always produces the same moons and re-detecting never reshuffles the sky: `size` lands
in 0.12–0.3 of the planet's radius, `orbit` spreads evenly from 1.8 to 4.2 planet radii in folder
order (a lone moon sits mid-band, at 3.0), `speed` falls as `r^-1.5` — Kepler, so inner moons run
faster — `tilt` is within ±12°, and `phase` gets one `360/n` slot each, jittered inside it, so two
moons can never bunch. Type and colour come from `MOON_KINDS`, one editable table:

| Folder | Moon |
|---|---|
| `backend` `api` `server` `service` `services` `cmd` `gateway` `worker` | rocky, slate `0x8b95a3` |
| `frontend` `web` `app` `apps` `ui` `client` `www` `site` `dashboard` `admin` | liquid, blue `0x3b82f6` |
| `mobile` `android` `ios` `flutter` `native` `expo` | ice, pale `0xbfe3f2` |
| `core` `crypto` `lib` `libs` `packages` `engine` `kernel` `shared` `common` | lava, orange `0xd9542b` |
| anything else | muddy, brown `0x9c7a4b` |

A folder is matched lower-cased, exactly first and then token by token, so `mobile-app` and `core_lib`
still say what they are.

`GET /api/admin/github/tree?slug=<project>` previews: the folders that survived, the ones that were
skipped, the moons detection would write, and the moons the row carries now.
`POST /api/admin/projects/moons` with `{ slug?, all?, replace? }` applies it — one project by slug, or
every visible project whose `moonsAuto` is still set — and answers with what was added, kept and
removed per project.

**A hand-edited moon is never overwritten.** A stored moon with `auto: false` is kept exactly as it
is, and it also claims its `path`, so a detected folder that already has a hand-edited moon does not
come back as a second one; only `auto: true` moons are replaced by fresh detection, and hand edits sit
first in the list so the cap can never drop one in favour of a detected folder. Editing a moon in the
dashboard clears its `auto` flag, and clearing `moonsAuto` on the project takes it out of the sweep
altogether. `replace: true` is the explicit "throw mine away and re-detect" escape hatch. A detection
that comes back empty writes nothing at all, so a rate limit or a missing token cannot wipe a planet's
moons — and `bun run db:seed` only seeds moons on insert, so re-seeding never undoes a dashboard edit.

## Scale

`src/lib/scale.ts` holds the real solar system — JPL radii, semi-major axes, tilts and rotation
periods — and three ways of putting it on a screen:

| Mode | Sizes | Distances |
|---|---|---|
| `stylised` | the hand-picked values that shipped | the hand-picked orbits |
| `relative` | true ratios between the planets, the sun compressed | eased, square-root spacing |
| `real` | true to scale — specks | true to scale, normalised to the span |

`POST /api/admin/scene/arrange` with `{ mode, spanAu?, apply }` computes an arrangement and writes it:
`apply: "scene"` writes the mode, the span, the sun radius and the belt onto `scene_config`,
`apply: "all"` also gives every visible project the body it stands in for, in order — Zcrypt becomes
Mercury, outward. `spanAu` says what the outermost orbit means: 30 au is Neptune, 63241.1 is a light
year. Running it twice writes the same values, and switching back to `stylised` restores the sizes and
orbits that shipped.

Whatever the mode, no planet may be as large as the star it orbits: the projects endpoint clamps
`planet.size` to 72% of the sun's radius, and rejects a size more than 20% over that cap rather than
quietly rewriting it.

## Analytics

Vercel Web Analytics gives page views, referrers, countries and devices; Speed Insights gives Core
Web Vitals. `src/lib/analytics.ts` adds the events the dashboard cannot infer, all of them anonymous
— no names, no message text, no addresses, only the shape of the visit:

| Event | Answers |
|---|---|
| `door` | do people read or fly, and which project they jumped to |
| `read_depth` | how far down a page they actually got (25 / 50 / 75 / 100) |
| `project_open`, `cutaway`, `planet_drag` | which projects get opened and explored |
| `resume` | résumé downloads, and from where |
| `contact_submit` | whether the form completes or fails |
| `deck_start`, `deck_flight`, `deck_panel`, `easter_egg` | what people do inside the flight deck |

Enable Web Analytics and Speed Insights once per project in the Vercel dashboard; the scripts 404 in
local production, which is expected.

## Admin panel

The panel edits everything the site renders and shows what visitors do. One password, checked with
bcrypt, then an HMAC-signed cookie (`httpOnly`, `secure` in production, `sameSite=lax`, seven days);
five wrong attempts in ten minutes throttles the source and every attempt is recorded.

**It is not at `/admin`.** It answers on `<domain>/<ADMIN_PATH>/admin`, where `ADMIN_PATH` is a random
segment from the environment. `src/middleware.ts` rewrites that URL onto the real `/admin` routes, so
nothing moved and the secret is never in a bundle; a direct request to `/admin` returns the site's own
404. The value is server-only — set it in `.env.local` and in Vercel's project settings, or the panel
has no door. `/api/admin/*` is unaffected: it is guarded by the session cookie, not by the path.

Signing in also drops `wosmo_no_track=1` for a year, so `/api/track` never counts the owner's own
visits. Signing out leaves it: the owner reads the public site signed out far more than signed in.

**The knock.** Three clicks on the footer wordmark within a second and a half `POST /api/admin/knock`,
which answers with the path — five knocks per source per ten minutes, never cached. It is a shortcut
for the owner, not a lock: the password is the only thing that actually keeps anyone out.

| Panel | What it does |
|---|---|
| Overview | traffic per day, top pages, referrers, countries, devices, read-or-fly split, what got clicked |
| Inbox | every contact submission, with new / read / replied / archived / spam, a private note, and a reply that sends through Resend |
| Visitors | one row per profile: return visits, pages, attention, and a per-profile history of visits and clicks |
| Projects | content, links, and **each project's planet** — type, size, the four-colour ramp, atmosphere rim, surface sliders, ring, the orbit it sits on, and its **moons** (detected from the repository's folders, then editable), with a live preview using the real renderer |
| Solar system | the sun's radius, colours and brightness, orbit scale, the belt, the starfield, the nebula, bloom and field of view |
| Experience · Skills · Education · Testimonials | drag to reorder, edit in place, hide without deleting |
| Secrets | the lines the flight deck whispers when a visitor finds one of its twenty hidden things |
| Blog | write markdown, save a draft, publish |
| Profile | name, contact details, both descriptions, the résumé link |

Content is read database-first with the records in `src/data/portfolio.ts` as the fallback, so an
empty table or an unreachable database never blanks a page. `bun run db:seed` copies those records in
and is safe to re-run.

## Hidden things

The flight deck hides twenty of them. Each one is remembered in `localStorage` and shows a line from
the **Secrets** admin table; `?` opens the manifest, which lists what is left as a hint rather than an
answer. In order: the command line (`/`), diagnostics (`d`), the black box (`b`), a fact (`f`), the
manifest itself (`?`), the konami code, a long press on the sun, the drifting distress beacon, project
09 (`9`), three knocks on the nameplate, typing the callsign, standing on all eight worlds in one
visit, cutting three planets open, three returns to the sun, five flips of the sound switch, the zoom
rocker at its stop, the wordmark's npm card, a right-click on open space, ninety seconds of silence,
and flying between midnight and five.

## Analytics and visitor profiles

Alongside Vercel's own dashboard, the site keeps its own tables. A profile is a salted SHA-256 of
IP + user agent + language: the same person on the same device and network is one profile, the raw IP
is never stored, and without `ANALYTICS_SALT` the table cannot be turned back into addresses. No
cookies, so no consent banner. Bots are dropped at the door.

The browser batches events, measures **engaged** time rather than wall time, records scroll depth, and
flushes 2.5 s after the first event, then every 12 s, on tab hide and on unload. Sessions roll over
after a 30-minute gap; daily counters are rolled up so the dashboard never scans the events table.

```bash
bun run db:push        # apply the schema
bun run db:seed        # load the current content
bun run admin:hash pw  # print a bcrypt hash for ADMIN_PASSWORD_HASH
```

## Environment

`.env.example` is the full list with notes; copy it to `.env.local`.

```bash
RESEND_API_KEY=…    # required for the contact form
GITHUB_TOKEN=…      # optional: 5000/hour instead of 60, private repos in the picker, commit counts
CONTACT_TO=…        # optional: overrides the recipient
CONTACT_FROM=…      # optional: needs a domain verified at resend.com/domains
NTFY_TOPIC=…        # optional: pushes each submission to your phone via ntfy.sh
NTFY_URL=…          # optional: a self-hosted ntfy server instead of ntfy.sh
NTFY_TOKEN=…        # optional: for a protected ntfy topic

DATABASE_URL=…            # Neon, pooled — the app
DATABASE_URL_UNPOOLED=…   # Neon, direct — migrations only
SESSION_SECRET=…          # 32+ characters, signs the admin cookie
ANALYTICS_SALT=…          # salts the visitor hash; changing it resets every profile
ADMIN_USERNAME=…
ADMIN_PASSWORD_HASH=…     # bcrypt; see the warning below
ADMIN_PATH=…              # 16+ URL-safe chars; the panel is at /<ADMIN_PATH>/admin
BLOB_READ_WRITE_TOKEN=…   # Vercel Blob, for uploads
```

**A bcrypt hash needs escaping in `.env.local`.** Next expands `$2b` and `$12` as variables, so the
hash arrives truncated and every correct password fails. Write it as `\$2b\$12\$…` locally. Vercel's
dashboard takes the raw, unescaped value.

A contact submission emails you through Resend and, when `NTFY_TOPIC` is set, also pushes to your
phone: install the ntfy app, subscribe to that topic, done. The push never blocks the email.

## Run

```bash
bun install
bun dev              # http://localhost:3000
bun run check        # typecheck + lint + production build
```

## Layout

```
src/middleware.ts   hides the admin panel behind ADMIN_PATH
src/app/            routes, metadata, sitemap, robots, OG image
src/components/     read/ (reading site) · ship/ (deck) · gate/ (the door)
src/data/           portfolio.ts — the single content source of truth
src/lib/            github.ts · audio.ts · motion.ts · text.ts
src/lib/three/      scene.ts (the system) · planet-view.ts (single planets + the strip)
src/lib/ship/       deck.ts — the flight deck controller
src/styles/         read.css · ship.css · gate.css
prototypes/         the standalone HTML prototypes this was ported from (see its README)
```

## Content

`src/data/portfolio.ts` is the only place to edit content. The résumé PDF in `public/resume/` is the
source of truth for the summary, the experience bullets, the skill groups and education.
`testimonials` currently holds two **sample** entries, tagged as samples on the page — replace them
with real quotes or empty the array to hide the section.
