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

`/admin` (never indexed) edits everything the site renders and shows what visitors do. One password,
checked with bcrypt, then an HMAC-signed cookie; five wrong attempts in ten minutes throttles the
source and every attempt is recorded.

| Panel | What it does |
|---|---|
| Overview | traffic per day, top pages, referrers, countries, devices, read-or-fly split, what got clicked |
| Inbox | every contact submission, with new / read / replied / archived / spam, a private note, and a reply that sends through Resend |
| Visitors | one row per profile: return visits, pages, attention, and a per-profile history of visits and clicks |
| Projects | content, links, and **each project's planet** — type, size, the four-colour ramp, atmosphere rim, surface sliders, ring, and the orbit it sits on, with a live preview using the real renderer |
| Solar system | the sun's radius, colours and brightness, orbit scale, the belt, the starfield, the nebula, bloom and field of view |
| Experience · Skills · Education · Testimonials | drag to reorder, edit in place, hide without deleting |
| Blog | write markdown, save a draft, publish |
| Profile | name, contact details, both descriptions, the résumé link |

Content is read database-first with the records in `src/data/portfolio.ts` as the fallback, so an
empty table or an unreachable database never blanks a page. `bun run db:seed` copies those records in
and is safe to re-run.

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

```bash
RESEND_API_KEY=…    # required for the contact form
GITHUB_TOKEN=…      # optional: raises the API limit and reads private repos
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
