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

## Environment

```bash
RESEND_API_KEY=…    # required for the contact form
GITHUB_TOKEN=…      # optional: raises the API limit and reads private repos
CONTACT_TO=…        # optional: overrides the recipient
CONTACT_FROM=…      # optional: needs a domain verified at resend.com/domains
```

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
