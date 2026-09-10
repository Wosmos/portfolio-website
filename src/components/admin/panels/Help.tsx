"use client";
// The manual. Written for the one person who reads it: me, in six months, having forgotten why a
// control exists. Every number in here is read off the code it describes rather than remembered.
//
// The content is data rather than markup so the search box can filter on the real text of a section,
// and so a paragraph cannot say one thing while its heading says another.

import { useMemo, useState } from "react";
import { arrange, LIGHT_YEAR_AU, MAX_PLANET_FRACTION, REAL_BELT } from "@/lib/scale";
import { Btn, Chip, Count, Empty, Search, Toolbar, Tooltip } from "../kit";
import "@/styles/admin-help.css";

// The mode notes come from the arrangement itself, so this page cannot drift from the maths.
const NOTE = {
  stylised: arrange("stylised", { count: 8 }).note,
  relative: arrange("relative", { count: 8 }).note,
  real: arrange("real", { count: 8 }).note,
} as const;
const CAP_PCT = `${Math.round(MAX_PLANET_FRACTION * 100)}%`;
const LY_AU = LIGHT_YEAR_AU.toLocaleString("en-GB");

type Pair = readonly [string, string];
type Block =
  | { readonly k: "p"; readonly t: string }
  | { readonly k: "ul"; readonly items: readonly string[] }
  | { readonly k: "dl"; readonly rows: readonly Pair[] }
  | { readonly k: "table"; readonly head: Pair; readonly rows: readonly Pair[] }
  | { readonly k: "warn"; readonly t: string };

type GroupId = "how" | "panels" | "system" | "people" | "ops";
interface Sect {
  readonly id: string;
  readonly title: string;
  readonly group: GroupId;
  readonly note?: string;
  readonly blocks: readonly Block[];
}

const GROUPS: readonly { readonly id: GroupId; readonly label: string }[] = [
  { id: "how", label: "how the site is fed" },
  { id: "panels", label: "the panels" },
  { id: "system", label: "the solar system" },
  { id: "people", label: "visitors and secrets" },
  { id: "ops", label: "running it" },
];

const SECTIONS: readonly Sect[] = [
  // ── how the site is fed ─────────────────────────────
  {
    id: "flow",
    title: "content, cache and publish",
    group: "how",
    note: "start here",
    blocks: [
      { k: "p", t: "every public page reads the database first and falls back to the static records in `src/data/portfolio.ts`. a table that is empty, or a database that will not answer, means the site shows what shipped rather than nothing." },
      { k: "p", t: "each reader is cached for an hour and tagged twice — `content` for all of it, and `content:<key>` for its own slice. the nine keys are person, projects, experience, skills, education, testimonials, scene, posts and eggFacts." },
      { k: "p", t: "every write through an admin route drops the whole `content` tag on its way out, so saving is enough on its own. you do not have to publish after an edit." },
      { k: "p", t: "**publish**, in the header, posts to `/api/admin/revalidate`. it drops the content tag and rebuilds six paths: `/`, `/read`, `/read/projects`, `/read/contact`, `/read/blog` and `/ship`. the toast counts what it dropped." },
      { k: "p", t: "so publish is for the changes a save cannot know about: a push on github the site should pick up before the hour is out, or one page that looks stale." },
      { k: "p", t: "the same endpoint accepts an `x-revalidate-secret` header matching `REVALIDATE_SECRET` instead of a session, which is how a github action can call it. it can also take one `key` and one `path` in the body to rebuild a single thing." },
      { k: "p", t: "a project you add here reaches the public site whatever its slug — the reader used to drop any slug that was not one of the eight static ids, and no longer does. give it a planet in the projects panel or it will draw with the defaults." },
    ],
  },
  {
    id: "github",
    title: "what comes from github, not from here",
    group: "how",
    blocks: [
      { k: "p", t: "four things are read live from github on the server, cached for an hour, and every one of them degrades to nothing rather than to an error." },
      {
        k: "dl",
        rows: [
          ["language split", "the repository's language bytes, turned into percentages to one decimal and sorted largest first; a language with no colour in the table is folded into `Other`. these are the layers the planet cutaway is cut from, and the composition card on the project page."],
          ["the readme", "the raw readme, run through a restricted markdown renderer: at most ten blocks, and images, badges, raw html, tables, code fences and table-of-contents sections are dropped. it goes under your own copy on the project page."],
          ["repo facts", "stars, creation date, last push, description, homepage and topics. it fills the facts card and the meta line above it."],
          ["the last commit", "the newest push event on the account's public timeline — repository, how long ago, and the first line of the last commit message. it is the `last push` row on the reading site's status block, and reads `offline` when github says nothing."],
        ],
      },
      { k: "p", t: "three switches on each project decide who wins, and all three default to on: **live languages**, **live description and links**, **live readme**." },
      { k: "p", t: "off means the value stored here wins, empty or not. with live readme off the project page shows only your own heading and bullets, and says `readme switched off for this project` where the readme would have been." },
      { k: "p", t: "the repo facts are fetched whether or not their switch is on, because stars and push dates are facts the dashboard does not store. that switch only decides whether github's description, homepage and topics are allowed to fill in fields you left empty." },
      { k: "p", t: "without a `GITHUB_TOKEN` all of this is public-only and limited to 60 requests an hour, so the numbers come back short or missing. nothing breaks; the lists are just smaller." },
    ],
  },

  // ── the panels ──────────────────────────────────────
  {
    id: "p-overview",
    title: "overview",
    group: "panels",
    blocks: [
      { k: "p", t: "one request to `/api/admin/stats`, drawn as svg — traffic, attention, the path to a message, and where people came from. the range chips are 7, 30, 90 and 365 days." },
      { k: "p", t: "the funnel counts pageviews in the window, not one person walking the whole path; the tooltip says so. `here now` counts profiles last seen inside five minutes." },
      { k: "p", t: "the trend arrow on a tile compares the second half of the window with the first, and needs at least six days of data before it appears at all." },
      { k: "p", t: "easy to get wrong: your own visits are excluded from every figure, so an empty panel on a day you were the only visitor is correct. open the site in a private window to watch the pipeline work." },
    ],
  },
  {
    id: "p-inbox",
    title: "inbox",
    group: "panels",
    blocks: [
      { k: "p", t: "every message the contact form has sent, as a work queue rather than an archive. the five states are new, read, replied, archived and spam; opening a new message marks it read." },
      { k: "p", t: "the reply box sends through resend from the site's own address and moves the message to replied. the private note is stored on the row and goes nowhere." },
      { k: "p", t: "easy to get wrong: replying needs `RESEND_API_KEY`, and the fallback from-address `onboarding@resend.dev` only ever delivers to your own resend account — verify a domain and set `CONTACT_FROM` before trusting it. delete is two clicks, and it disarms after three seconds." },
    ],
  },
  {
    id: "p-visitors",
    title: "visitors",
    group: "panels",
    blocks: [
      { k: "p", t: "one row per profile with the intent score, and a detail view listing that profile's visits, everything it did, and the reasons behind the score." },
      { k: "p", t: "postgres does the filtering, sorting and paging, not the browser, because this is the one table that grows without a ceiling. 25 rows a page, or 50 or 100. sorting is limited to last seen, first seen, score, visits, pages and time; the other columns are display only." },
      { k: "p", t: "the `show mine` chip adds the rows flagged as yours back in, which is the only way to see them. if the paged endpoint cannot answer, the panel falls back to the twenty recent rows the stats endpoint carries and says so under the table." },
      { k: "p", t: "easy to get wrong: a row is a device on a network, not a person. the same laptop on a different wifi is a second profile, and there is no way to join them." },
    ],
  },
  {
    id: "p-projects",
    title: "projects",
    group: "panels",
    blocks: [
      { k: "p", t: "the content, the links, the repository and the planet, in one editor. it feeds `/read/projects`, each `/read/projects/<slug>` page, the featured strip on the reading home page, and the deck." },
      { k: "p", t: "featured decides the home strip; with nothing featured the page shows the first four in sort order. `visible` off removes the project from the public site entirely." },
      { k: "p", t: "the repository picker lists the account's repos and fills the title, slug, url and description from the one you choose. picking only fills the fields — nothing is written until you save the project." },
      { k: "p", t: "the planet editor writes a value only when you move the control, because an absent knob means \"whatever the scene has always done with this body\". reset puts a field back to absent rather than to zero." },
      { k: "p", t: "the moons come from the repository's folders and have their own section below. everything else about them is edited here." },
      { k: "warn", t: "**the slug is a url and one of eight known ids.** renaming it breaks the project's page, its position in the scene, and — if the new name is not a static project id — its presence on the site at all." },
    ],
  },
  {
    id: "p-scene",
    title: "solar system",
    group: "panels",
    blocks: [
      { k: "p", t: "the one row of global scene values: the scale mode, the span, the sun, the belt, the sky and the camera. the deck reads them on load, so a change shows on the next visit to `/ship`." },
      { k: "p", t: "the controls have the most to explain, so they have their own three sections below: scale and span, auto-arrange, and the sun, belt and sky." },
    ],
  },
  {
    id: "p-experience",
    title: "experience",
    group: "panels",
    blocks: [
      { k: "p", t: "jobs, dates and the bullets under each one. it renders as section 02 on the reading site, and the one-line note is what the flight deck's experience panel shows beside the job." },
      { k: "p", t: "dates are `YYYY-MM`. leave the end date empty and the site prints `present`. the arrows in the detail card move a row up or down the stored order — that is the ordering the site uses." },
      { k: "p", t: "easy to get wrong: `visible` off drops the job from the site but leaves it in the table, and the home page's \"since\" line is taken from the earliest start date it can see." },
    ],
  },
  {
    id: "p-skills",
    title: "skills",
    group: "panels",
    blocks: [
      { k: "p", t: "the groups the skills matrix renders as section 03. hovering a token lights the project cards that use it and dims the rest." },
      { k: "p", t: "the match is made against each project's stack plus its github languages, compared loosely: lower-cased, a trailing `(…)` or number dropped, a trailing `.js` dropped, then equal or one a prefix of the other. `react` also matches anything starting with `next`." },
      { k: "p", t: "easy to get wrong: a skill spelled differently from the project's stack entry lights nothing, and the matrix shows it as used by no project." },
    ],
  },
  {
    id: "p-education",
    title: "education",
    group: "panels",
    blocks: [
      { k: "p", t: "degrees, dates and grades, rendered as section 04. the dates are free text here, not `YYYY-MM`, so they print exactly as typed." },
      { k: "p", t: "easy to get wrong: there is no visible flag on this table. deleting is the only way to take an entry off the site." },
    ],
  },
  {
    id: "p-testimonials",
    title: "testimonials",
    group: "panels",
    blocks: [
      { k: "p", t: "quotes, rendered as section 05. `sample` marks an entry as a placeholder, and the page then labels it as a sample rather than passing it off as a real reference." },
      { k: "warn", t: "**this is the one table with no fallback.** the section only renders when at least one visible testimonial exists — hide or delete them all and the section disappears from the reading site rather than reverting to the samples that shipped." },
    ],
  },
  {
    id: "p-facts",
    title: "secrets",
    group: "panels",
    blocks: [
      { k: "p", t: "this panel does not edit the secrets themselves. it edits the lines the cockpit whispers when a visitor finds one — the table is `egg_facts`, and the panel is registered as `facts`." },
      { k: "p", t: "`kind` groups them so the deck can pick a fitting line: **space** trivia, a note about **me**, or **random** for anything unfiled. a line with visible off is never whispered, and an empty table leaves the deck on its built-in pool." },
      { k: "p", t: "a line is capped at 400 characters. keep the pool short: one of these is all a visitor gets per secret." },
    ],
  },
  {
    id: "p-posts",
    title: "blog",
    group: "panels",
    blocks: [
      { k: "p", t: "write in markdown, save as a draft, publish when it is ready. published posts appear on `/read/blog` and at `/read/blog/<slug>`, newest first, and drafts are invisible to everyone but you." },
      { k: "p", t: "the body is rendered with the same restricted markdown subset the readme uses, and is capped at 100,000 characters. the reading time is not yours to set — it is recounted from the body at 200 words a minute on every save." },
      { k: "p", t: "publishing for the first time stamps the publish date. unpublishing leaves that date alone, so a post can go back and forth without losing when it was first out." },
    ],
  },
  {
    id: "p-profile",
    title: "profile",
    group: "panels",
    blocks: [
      { k: "p", t: "the single row behind your name, contact details, both descriptions and the résumé link. it reaches nearly every page, including the og images and the structured data." },
      {
        k: "dl",
        rows: [
          ["full name", "goes into the structured data search engines read, not onto the page."],
          ["positioning", "the short claim; summary is the paragraph on the reading site."],
          ["meta description", "what google prints under the link. past 160 characters it gets cut off mid-sentence, and the field counts for you."],
          ["timezone", "an iana name such as `Asia/Karachi`. the site works your local time out from it, so a typo stops the clock."],
        ],
      },
    ],
  },

  // ── the solar system ────────────────────────────────
  {
    id: "scale",
    title: "the three scale modes",
    group: "system",
    blocks: [
      { k: "p", t: "true scale is unusable: the sun is 109 earths wide, and at a span where neptune fits on screen a true-size earth is a fifth of a pixel. so the arrangement comes in three modes and you pick one, rather than the code pretending there is a single right answer." },
      { k: "p", t: `**stylised** — ${NOTE.stylised} the eight sizes and orbits that shipped, kept verbatim, so switching back to stylised restores exactly what was there.` },
      { k: "p", t: `**relative** — ${NOTE.relative} each planet keeps its true size ratio to the others (scaled to a 2.6-unit largest, floored at 0.42), the sun is compressed so it does not swallow the frame, and orbits are spaced by the square root of distance so the inner planets separate.` },
      { k: "p", t: `**real** — ${NOTE.real} one measure of kilometres per scene unit for size and distance both, taken from the outermost orbit. it is in here because it is the truth; relative is the one to fly.` },
      { k: "p", t: "the mode also decides nothing about tilt and spin: those come from the real planet either way. spin is derived from the sidereal day, clamped to 0.02–6 turns a minute, and stays negative for venus and uranus because they really do turn the other way." },
      { k: "p", t: "beyond neptune the arrangement stops inventing bodies and steps outward on the same spacing instead. it will place at most 24." },
    ],
  },
  {
    id: "span",
    title: "the system span, and auto-arrange",
    group: "system",
    blocks: [
      { k: "p", t: `the **span** says what the outermost orbit is worth in real distance; everything else is placed inside it. it is the size of the system, not the size of the screen. the slider runs from 0.2 au to ${LY_AU} au — one light year — and 30 au, the default, is neptune.` },
      { k: "p", t: "**auto-arrange** recomputes size, orbit, tilt, spin and surface type for every visible project from the real planet it maps to — first project becomes mercury, second venus, outward in sort order — and writes them straight to the database." },
      { k: "warn", t: "**there is no undo.** auto-arrange overwrites whatever was stored, and it uses the mode and span shown in the form whether or not you have saved them. the values it replaces are gone. the button arms itself first for exactly this reason." },
      { k: "p", t: "with **apply to the projects too** off it writes only the scene row: the mode, the span, the sun's radius and the belt's radius and width. the planets are left alone and the response is a preview of where they would have gone." },
      { k: "p", t: "two things it deliberately will not do: it never removes a ring, only adds the ones the real body has; and leaving `real` for another mode resets the sun's radius to the default 6, because a radius the real mode computed is a fraction of a unit and would shrink every planet with it." },
      { k: "p", t: "running it twice with the same mode and span writes the same values, so it is safe to repeat — just not to undo." },
    ],
  },
  {
    id: "planets",
    title: "planets, the size cap and the six surfaces",
    group: "system",
    blocks: [
      { k: "p", t: `nothing may be as large as the star it orbits, so a planet's size is capped at **${CAP_PCT} of the sun's radius**. the panel prints the current cap next to the radius field, and both the projects endpoint and auto-arrange enforce the same number.` },
      { k: "p", t: "a size slightly over the cap is quietly clamped to it; a size more than 1.2× the cap is rejected with an error instead, so a typed 40 is reported rather than silently rewritten. the cap moves when the sun does, which means shrinking the sun can clamp every planet at once." },
      { k: "p", t: "there are six surface types, and each one owns a different set of knobs:" },
      {
        k: "dl",
        rows: [
          ["gas", "banded. bands and band sharpness apply; there is no ocean and no craters."],
          ["ice", "also banded, colder ramp."],
          ["rocky", "ocean and craters both apply."],
          ["muddy", "ocean and craters, warmer."],
          ["liquid", "ocean applies, craters do not."],
          ["lava", "neither; the glow channel is what makes the veins read at night."],
        ],
      },
      { k: "p", t: "the shared knobs are the four-colour ramp plus a rim colour, the noise seed (changes the terrain and nothing else), spin and tilt, the atmosphere shell and its opacity, the night-side glow, and an optional ring." },
      { k: "p", t: "spin accepts −20 to 20 and tilt −360 to 360, wide on purpose: venus is tipped 177° and turns backwards, and auto-arrange writes those real numbers." },
      { k: "p", t: "the preview is the real planet renderer, not an approximation, so what you set is what the deck draws." },
    ],
  },
  {
    id: "moons",
    title: "moons",
    group: "system",
    blocks: [
      { k: "p", t: "a planet's moons come from the meaningful top-level folders of its repository — zcrypt's backend, frontend, mobile and core; a single-app project gets one." },
      { k: "p", t: "build output, dependencies, docs and test scaffolding are not parts of a product, so `node_modules`, `dist`, `build`, `out`, `target`, `vendor`, `public`, `assets`, `docs`, `.github`, `test`, `tests`, `__tests__`, `scripts`, `examples`, `coverage`, `tmp` and every dot-directory are skipped." },
      { k: "p", t: "at most **six** survive per planet, biggest folders first. six is the cap because past that the labels collide and the moons hide the planet they orbit." },
      { k: "p", t: "detection is deterministic: every value is derived from a hash of `<project>/<folder>`, never from a random number, so the same repository always produces the same moons and re-running detection never reshuffles the sky." },
      {
        k: "dl",
        rows: [
          ["size", "0.12 to 0.3 of the planet's radius."],
          ["orbit", "1.8 to 4.2 planet radii, spread evenly; a lone moon sits mid-band."],
          ["speed", "turns a minute, 14 divided by the orbit to the power 1.5 — kepler's third law, so inner moons run faster."],
          ["tilt", "up to ±12°."],
          ["phase", "one slot each, jittered inside it, so two moons can never bunch together."],
          ["look", "the folder's name decides it: api and server folders are rocky, web and app folders liquid, mobile ice, core and lib lava, anything else muddy."],
        ],
      },
      { k: "warn", t: "**a hand-edited moon is never overwritten.** a detected moon carries `auto: true`; editing it clears that flag, and re-detection replaces only the moons that are still exactly what detection produced. a hand edit also claims its folder, so the same folder does not come back as a second moon beside it." },
      { k: "p", t: "detection runs against one project by slug, or sweeps every visible project whose `moonsAuto` is still on — a named project is detected whatever its flag says. `replace` is the escape hatch that does throw the hand edits away, and it is the only thing that will." },
      { k: "p", t: "a project with no repository url is skipped, and a detection that comes back empty writes nothing at all, so a rate limit or a missing token can never wipe a planet's moons. the toast says what was added, kept and removed." },
    ],
  },
  {
    id: "sky",
    title: "the sun, the belt and the sky",
    group: "system",
    blocks: [
      { k: "p", t: "the sun's radius and brightness set its presence; everything else is what its surface does. the colour ramp is three stops — core, mid, edge — and the shader ramps between them from the centre of the disc outward." },
      {
        k: "dl",
        rows: [
          ["granulation", "how strongly the convection cells show."],
          ["limb darkening", "how much the disc darkens towards its edge — the thing that makes a sphere read as a star rather than a circle."],
          ["spots", "how much cooler, darker mottling the surface carries."],
          ["differential spin", "how fast the surface turns, and how much faster the equator runs than the poles."],
          ["corona", "the size and brightness of the outer halo."],
          ["flare", "how hard the lens flare and the surface prominences hit."],
        ],
      },
      { k: "p", t: `the **belt** is one instanced mesh of rocks between the inner and outer planets. width spreads it inward and outward from its radius, thickness scatters the rocks above and below the orbital plane, tilt tips the whole thing out of the planets' plane, and rock size costs nothing because it multiplies instances. the arrangement places it honestly, at ${REAL_BELT.innerAu}–${REAL_BELT.outerAu} au.` },
      { k: "p", t: "**rocks** is the belt's entire cost — every one is an instance. the default is 1400, and the endpoint will take up to 200,000 if you want to find the frame budget." },
      { k: "p", t: "**stars** are point sprites drawn in one call, so thousands are cheap; the default is 3600, over two nebula colours." },
      { k: "p", t: "**constellations** are your other repositories. every repository on the account that is not one of the eight projects and not a fork becomes a background star, sized by its commit count, coloured by its language, and joined to the ones that share a language." },
      { k: "p", t: "only the 24 most recently pushed get one, because each commit count costs a request. the count is the sum of contributions on the default branch, which means it misses commits on other branches. **repo star gain** multiplies their brightness, so the sky can be a hint or a headline." },
      { k: "p", t: "the camera has two controls: field of view in degrees, where 42 is the default and higher feels wider and faster, and bloom, where 0 turns the post-processing glow off entirely." },
      { k: "warn", t: "**two sliders can go further than the endpoint will accept.** belt thickness slides to 12 but the api caps it at 10, and belt rock size slides down to 0.1 but the api floor is 0.2. a value outside those is refused on save with a message naming the field." },
    ],
  },

  // ── visitors and secrets ────────────────────────────
  {
    id: "profiles",
    title: "what a profile is, and why you are not in it",
    group: "people",
    blocks: [
      { k: "p", t: "there are no cookies and no consent banner because there is nothing to consent to. a profile is `sha-256(ip + user agent + accept-language + ANALYTICS_SALT)`, truncated to 40 characters. the raw address is never written, and without the salt the table cannot be turned back into addresses." },
      { k: "p", t: "changing `ANALYTICS_SALT` resets every profile, which is also how you wipe them deliberately." },
      { k: "p", t: "the honest limit: same person, same device, same network gives the same id. a new network or a new device starts a new profile, and nothing joins them." },
      { k: "p", t: "your own visits are excluded by three mechanisms, because each one alone has a hole:" },
      {
        k: "ul",
        items: [
          "the `wosmo_no_track` cookie. signing in sets it for a year and signing out deliberately leaves it alone, because you read the public site signed out far more than signed in. while it is there `/api/track` answers 204 and writes nothing at all.",
          "`ADMIN_VISITOR_HASHES` — a comma-separated list of visitor-id prefixes, at least six characters each, and a prefix rather than a whole id because the id changes with the network. any match is marked as yours for good. read the ids off the visitors table, or open a profile here and copy the first dozen characters.",
          "any session that touches an `/admin` path, plus — in development only — localhost and the private ip ranges. these are flagged rather than dropped, so local testing still writes rows you can look at, and `?include=owner` on the admin endpoints shows them.",
        ],
      },
      { k: "p", t: "crawlers are matched on the user agent and never stored at all. a client that merely looks scripted is stored and penalised instead, because a real person behind a hardened browser trips those checks routinely." },
      { k: "p", t: "the browser side reports as rarely as it can: one early batch at 2.5 seconds so a three-second visit still counts, then a single timer starting at 15 seconds and doubling to a two-minute ceiling, stopping itself when there is nothing new to say. it never fires while the tab is hidden, and sends what is left by beacon on hide or unload." },
      { k: "p", t: "a batch carries at most 30 events, and 30 batches a minute from one profile is the ceiling before the endpoint answers 429. thirty idle minutes ends a visit." },
    ],
  },
  {
    id: "intent",
    title: "the intent score",
    group: "people",
    blocks: [
      { k: "p", t: "a score out of 100 and a band, worked out only from what the analytics already collect. no extra tracking, no third party, no personal data. points are added and clamped to 0–100, so the ceiling is reached by a combination rather than by any single act except a message." },
      {
        k: "table",
        head: ["signal", "points"],
        rows: [
          ["sent a message", "45"],
          ["started the contact form", "20"],
          ["opened the contact page", "12"],
          ["opened the résumé", "16"],
          ["clicked the email address", "14"],
          ["clicked through to linkedin", "8"],
          ["clicked through to github", "6"],
          ["read past 75% of a page", "8"],
          ["attention, full marks at 180s per visit", "up to 12"],
          ["three or more pages in one visit", "6"],
          ["each visit after the first", "5, capped at 12"],
          ["still coming back two days later", "7"],
          ["opened a project", "8"],
          ["opened more than one project", "6"],
          ["opened the cutaway", "7"],
          ["flew to a planet", "5"],
          ["arrived from a job board, or from linkedin", "10"],
          ["landed straight on experience, skills or the résumé", "8"],
          ["one page, gone in under 10 seconds", "−12"],
          ["looks scripted", "−60"],
        ],
      },
      { k: "p", t: "the bands are inclusive at the bottom: **hot** from 70, **warm** from 45, **curious** from 18, **passing** below that. **bot** is not a band the score reaches — it is what a crawler, you, or a scripted client with nothing left is called." },
      { k: "p", t: "the job board and linkedin points are the same 10 and do not stack; a job board wins when both are true. `landed straight on` means the very first page asked for, not one wandered into later." },
      { k: "p", t: "the score ratchets: signals only ever accumulate in real life — someone who opened the contact form last week still opened it — so the engine never scores a profile below the score it last gave." },
      { k: "p", t: "the same two functions run on ingest and again when you open a profile, over the full history, which is why the reasons list under a profile always says exactly which signals earned the number." },
    ],
  },
  {
    id: "secrets",
    title: "the twenty secrets",
    group: "people",
    blocks: [
      { k: "p", t: "the flight deck hides twenty of them. the manifest — press `?` on the deck — lists all twenty with a hint each, and reveals a name only once that one has been found. the found set lives in the visitor's own localStorage, not in the database." },
      { k: "p", t: "finding one shows `secret NN of 20`, its name, and one of the lines from the secrets panel. that is the whole relationship between the panel and the secrets: the panel writes what they say, never what they are." },
      { k: "p", t: "the list of triggers is in code, in `SECRETS` in `src/lib/ship/deck.ts`, next to the handlers that fire them. adding one means editing that file, not this panel." },
      { k: "p", t: "a few, so the manifest is not the only record: the command line, diagnostics and the black box are single keys; the konami code turns on hyperdrive; holding the sun makes it flare; typing the callsign anywhere; three knocks on the nameplate; clicking the wordmark; a right-click on open space; ninety seconds of touching nothing; and flying between midnight and five in the morning." },
    ],
  },

  // ── running it ──────────────────────────────────────
  {
    id: "signing-in",
    title: "getting in",
    group: "ops",
    blocks: [
      { k: "p", t: "the panel answers on `/<ADMIN_PATH>/admin` and is rewritten to the real `/admin` routes by the middleware, so no route file moves and the secret never appears in a bundle. a bare `/admin` answers 404 to everyone else." },
      { k: "p", t: "if you have forgotten the path: **three clicks on the footer wordmark** of the reading site, inside a second and a half, and the browser goes there. that is a plain `<img>` with no cursor and no hover — a stray single click does nothing." },
      { k: "p", t: "the knock hands back the path, so it is not a secret from anyone who finds the knock; the password is the gate. it is throttled to five knocks per source per ten minutes so it cannot be swept for, and the login itself to five attempts per ten minutes." },
      { k: "p", t: "the session is an hmac-signed cookie carrying only an expiry, good for seven days. signing out sets a ten-minute signed cookie so the panel's own post-logout navigation lands on the secret url instead of a 404 — and deliberately leaves `wosmo_no_track` in place." },
      { k: "p", t: "every attempt, successful or not, is recorded with a hashed source and the user agent, so a burst is visible." },
      { k: "p", t: "`/api/admin/*` is guarded by the session cookie, not by the secret segment. the secret hides the panel; the password protects it." },
    ],
  },
  {
    id: "env",
    title: "the environment, and what breaks without each",
    group: "ops",
    blocks: [
      {
        k: "dl",
        rows: [
          ["DATABASE_URL", "the pooled neon connection. without it every reader falls back to the static records, and every admin write answers 503 — the public site looks fine and nothing can be edited. `DATABASE_URL_UNPOOLED` is for migrations only."],
          ["SESSION_SECRET", "32+ characters; signs the session cookie. without it nothing can sign in. rotating it signs everyone out."],
          ["ADMIN_PATH", "16+ url-safe characters, the segment the panel hides behind. missing in production means the panel is unreachable and the knock answers 404. in development it falls back to `/admin-dev/admin` with a warning. never prefix it with `NEXT_PUBLIC_`."],
          ["ADMIN_USERNAME", "the one user. missing, together with the hash, makes login report itself unconfigured."],
          ["ADMIN_PASSWORD_HASH", "the bcrypt hash. see the trap below."],
          ["ANALYTICS_SALT", "salts the visitor hash. without it the ids are computed with a development default, so profiles are still written but the table is no longer safe from a rainbow of guessed addresses."],
          ["RESEND_API_KEY", "sends the contact form and your replies. without it the form fails and the reply box answers 500."],
          ["CONTACT_FROM / CONTACT_TO", "optional. the fallback from-address only delivers to your own resend account; to means your profile email unless set."],
          ["GITHUB_TOKEN", "optional but the one worth having. it lifts the api limit from 60 to 5000 requests an hour, switches the repo list to the endpoint that includes private repositories, and is why the constellations come back full rather than short."],
          ["BLOB_READ_WRITE_TOKEN", "optional. without it `/api/admin/upload` answers 501 and every cover image has to be a url you host elsewhere."],
          ["REVALIDATE_SECRET", "optional. only a webhook needs it; without it the revalidate endpoint accepts nothing but a signed-in session."],
          ["NTFY_TOPIC", "optional. pushes each contact submission to your phone through ntfy.sh."],
          ["ADMIN_VISITOR_HASHES", "optional. the visitor-id prefixes that count as you."],
        ],
      },
      { k: "warn", t: "**the dollar trap.** in a local `.env.local`, escape every dollar sign in the bcrypt hash — `\\$2b\\$12\\$…`. next's dotenv expands `$2b` and `$12` as variable references, the hash reaches bcrypt truncated, and every correct password is rejected. vercel's dashboard needs the **raw**, unescaped value." },
      { k: "p", t: "to change the password: `bun run admin:hash '<your password>'` prints a bcrypt hash at cost 12. put it in `ADMIN_PASSWORD_HASH` — escaped locally, raw on vercel — and sign in again." },
      { k: "p", t: "when github starts rate-limiting: the symptom is language splits, readmes, repo facts and constellations quietly going missing while every page still renders. the fix is a `GITHUB_TOKEN` — a classic token with `repo`, or a fine-grained one with read access to contents and metadata." },
    ],
  },
  {
    id: "keys",
    title: "keyboard",
    group: "ops",
    blocks: [
      { k: "p", t: "in this panel:" },
      {
        k: "dl",
        rows: [
          ["⌘K / ctrl-K", "opens the jump-to palette, and closes it again. type to filter panels by name or blurb; enter takes the first hit."],
          ["escape", "closes the palette and the mobile menu. inside a list panel it also closes the open detail card."],
          ["the hash", "the open panel lives in the url as `#projects`, `#scene`, `#visitors` and so on, so a reload, a bookmark and the back button all land where you were. changing the hash in another tab moves this one."],
          ["search boxes", "settle 200ms after you stop typing; escape clears the box rather than closing the panel."],
          ["delete", "always two clicks. the button arms, then acts, and disarms itself after three seconds or on blur."],
        ],
      },
      { k: "p", t: "and in the cockpit, since the manual should be in one place:" },
      {
        k: "dl",
        rows: [
          ["1–8", "fly to that project. 9 is project 09, 0 is the sun."],
          ["arrows", "step to the next or previous planet. x cuts the current one open."],
          ["p m c", "the pilot, experience and contact panels. d is diagnostics, b the black box, f a fact, ? the secrets manifest."],
          ["t", "the grand tour, all eight in one go. s toggles the sound."],
          ["/", "the command line. `help` lists what it takes; escape closes it."],
          ["escape", "backs out one level: a panel, then the tour, then the focused planet."],
        ],
      },
    ],
  },
];

const textOf = (s: Sect): string => {
  const parts: string[] = [s.title];
  for (const b of s.blocks) {
    if (b.k === "p" || b.k === "warn") parts.push(b.t);
    if (b.k === "ul") parts.push(...b.items);
    if (b.k === "dl") for (const [a, c] of b.rows) parts.push(a, c);
    if (b.k === "table") for (const [a, c] of b.rows) parts.push(a, c);
  }
  return parts.join(" ").toLowerCase();
};
const HAYSTACK: ReadonlyMap<string, string> = new Map(SECTIONS.map((s) => [s.id, textOf(s)]));

/** Backticks become code, double asterisks bold — enough markup for a reference, no library. */
function Inline({ t }: { t: string }) {
  const parts = t.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        if (part.startsWith("**") && part.endsWith("**")) return <b key={i}>{part.slice(2, -2)}</b>;
        return part;
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="hlp__blocks">
      {blocks.map((b, i) => {
        if (b.k === "p") return <p key={i}><Inline t={b.t} /></p>;
        if (b.k === "warn") return <p key={i} className="hlp__warn"><Inline t={b.t} /></p>;
        if (b.k === "ul") {
          return (
            <ul key={i} className="hlp__ul">
              {b.items.map((item) => <li key={item}><Inline t={item} /></li>)}
            </ul>
          );
        }
        if (b.k === "dl") {
          return (
            <dl key={i} className="hlp__dl">
              {b.rows.map(([term, def]) => (
                <div key={term} style={{ display: "contents" }}>
                  <dt><Inline t={term} /></dt>
                  <dd><Inline t={def} /></dd>
                </div>
              ))}
            </dl>
          );
        }
        return (
          <div key={i} className="hlp__tw">
            <table className="hlp__tbl">
              <thead><tr><th>{b.head[0]}</th><th>{b.head[1]}</th></tr></thead>
              <tbody>
                {b.rows.map(([signal, points]) => <tr key={signal}><td>{signal}</td><td>{points}</td></tr>)}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function HelpPanel() {
  const [term, setTerm] = useState("");
  const [group, setGroup] = useState<GroupId | "all">("all");
  const [shut, setShut] = useState<readonly string[]>([]);
  const [at, setAt] = useState("");
  const [navOpen, setNavOpen] = useState(true);

  const needle = term.trim().toLowerCase();
  const hits = useMemo(
    () => SECTIONS.filter((s) => (group === "all" || s.group === group) && (needle === "" ? true : (HAYSTACK.get(s.id) ?? "").includes(needle))),
    [needle, group],
  );

  // A search is a request to read, so a match opens regardless of what was collapsed by hand.
  const isOpen = (id: string): boolean => needle !== "" || !shut.includes(id);
  const toggle = (id: string, open: boolean): void => {
    // While searching every match is forced open, so a collapse then would be recorded and never seen.
    if (needle !== "") return;
    setShut((list) => (open ? list.filter((x) => x !== id) : list.includes(id) ? list : [...list, id]));
  };

  const jump = (id: string): void => {
    setShut((list) => list.filter((x) => x !== id));
    setAt(id);
    const el = document.getElementById(`hlp-${id}`);
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="hlp">
      <details className="hlp__nav" open={navOpen} onToggle={(e) => setNavOpen(e.currentTarget.open)}>
        <summary>contents</summary>
        {GROUPS.map((g) => {
          const rows = hits.filter((s) => s.group === g.id);
          if (!rows.length) return null;
          return (
            <div key={g.id}>
              <p className="hlp__navg">{g.label}</p>
              <ul>
                {rows.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={s.id === at ? "is-on" : undefined} onClick={() => jump(s.id)}>{s.title}</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </details>

      <div>
        <Toolbar>
          <Search value={term} onChange={setTerm} placeholder="search the manual…" />
          <div className="tbar__chips">
            <Chip on={group === "all"} onClick={() => setGroup("all")}>all</Chip>
            {GROUPS.map((g) => (
              <Chip key={g.id} on={group === g.id} onClick={() => setGroup(g.id)} count={SECTIONS.filter((s) => s.group === g.id).length}>{g.label}</Chip>
            ))}
          </div>
          <Count shown={hits.length} total={SECTIONS.length} noun="sections" />
          <div className="hlp__acts">
            <Btn onClick={() => setShut([])}>expand all</Btn>
            <Btn onClick={() => setShut(SECTIONS.map((s) => s.id))}>collapse all</Btn>
            <Tooltip text="every number on this page is read off the code it describes. if a control disagrees with what you read here, the code is right and this page is stale." />
          </div>
        </Toolbar>

        {hits.length === 0 ? (
          <Empty icon="◌" text="Nothing in the manual matches that." action="clear the search" onAction={() => { setTerm(""); setGroup("all"); }} />
        ) : (
          <div className="hlp__body">
            {hits.map((s) => (
              <details
                key={`${s.id}-${needle === "" ? "read" : "find"}`} id={`hlp-${s.id}`} className="hlp__sec"
                open={isOpen(s.id)} onToggle={(e) => toggle(s.id, e.currentTarget.open)}
              >
                <summary><b>{s.title}</b>{s.note && <small>{s.note}</small>}</summary>
                <Blocks blocks={s.blocks} />
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
