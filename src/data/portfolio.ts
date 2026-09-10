// Portfolio content — the single source of truth for both the reading site and the flight deck.
// What GitHub can know (description, homepage, languages, pushed_at, stars, README) is fetched live in
// src/lib/github.ts and layered over these records at request time; what it cannot (planet shader
// configuration, taglines, résumé bullets) lives here. Mirrors the prototype's data.js.

export type PlanetType = "gas" | "rocky" | "lava" | "ice" | "liquid" | "muddy";
export interface RingConfig { ca: number; cb: number; inner: number; outer: number; tilt: number }
export interface PlanetConfig {
  type: PlanetType; size: number; c0: number; c1: number; c2: number; c3: number; rim: number;
  ocean?: number; cloud?: number; crater?: number; vein?: number; ring?: RingConfig;
}
export type LangShare = readonly [name: string, percent: number];
export type ProjectId = "zcrypt" | "learnity" | "furnizsh" | "netlink" | "docxo" | "devtoolshq" | "scrappo" | "resumeright";
export interface Project {
  id: ProjectId; title: string; year: number | null; weight: number; tagline: string; description: string;
  stack: readonly string[]; context: string; category: string; status?: string;
  github: string; live: string | null; langs: readonly LangShare[]; planet: PlanetConfig;
}
export interface Experience {
  company: string; title: string; location: string; start: string; end: string | null;
  stack: readonly string[]; note: string; bullets: readonly string[];
}
export interface SkillGroup { group: string; items: readonly string[] }
export interface Education { school: string; degree: string; start: string; end: string; grade: string }
export interface Highlight { heading: string; tech: readonly string[]; bullets: readonly string[]; extraLinks?: readonly (readonly [label: string, url: string])[] }
export interface Testimonial { placeholder?: boolean; quote: string; name: string; role: string; company: string; link: string | null }
export interface Person {
  name: string; role: string; line: string; positioning: string; location: string; tz: string; tzLabel: string;
  email: string; phone: string; fullName: string; metaDescription: string; summary: string; cv: string;
  github: string; linkedin: string; hashnode: string; npmCard: string;
}

export const person: Person = {
  name: "Wasif Malik",
  role: "software engineer",
  line: "go · systems · next.js",
  positioning:
    "Building production web applications and systems-level software end-to-end — concurrent Go backends, modern Next.js frontends, and security-first architecture.",
  location: "Karachi, Pakistan",
  tz: "Asia/Karachi",
  tzLabel: "UTC+5",
  email: "m.wasifmalik17@gmail.com",
  phone: "+92 306 224 8224",
  fullName: "Muhammad Wasif Malik",
  // Search engines truncate around 160 characters, so meta descriptions use this, not `summary`.
  metaDescription:
    "Software engineer in Karachi, open to remote work. Concurrent Go backends, Next.js frontends, security-first architecture. Eight shipped projects, all on GitHub.",
  // Professional summary, verbatim from the résumé PDF.
  summary:
    "Software Engineer building production web applications and systems-level software end-to-end. Specialised in concurrent backends with Go, modern frontends with Next.js, and security-first architecture. Have shipped a zero-knowledge encrypted cloud platform across web, desktop, and terminal clients, a real-time chat system across web and mobile, and a range of client products spanning e-commerce, POS, HRMS, and real-estate. Comfortable owning every layer: schema design, backend services, client implementations, and deployment. Open to remote opportunities globally.",
  cv: "/resume/Wasif_Malik_Resume_SoftwareEngineer.pdf",
  github: "https://github.com/Wosmos",
  linkedin: "https://www.linkedin.com/in/wasif-malik-79205a1bb",
  hashnode: "https://hashnode.com/@Wosmo",
  npmCard: "wasif-malik",
};

// One planet per orbit, ordered outward from the sun. `planet` drives the shader:
//   type   gas | rocky | lava | ice
//   c0..c3 colour ramp (gas: band colours · rocky: ocean, lowland, highland, snow · lava: rock dark/light, unused, vein glow · ice: base, band, storm)
//   rim    atmosphere colour · size: radius in scene units (sun is 3.6)
// `langs` — GitHub language split (bytes %), fetched 8 Sep 2026 for the public repos; learnity and
// devtoolshq are private so those two are estimates. Drives the cutaway layers in the flight deck.
export const projects: readonly Project[] = [
  {
    id: "zcrypt", title: "Zcrypt", year: 2026, weight: 1.0,
    tagline: "zero-knowledge encrypted cloud storage",
    description:
      "Files are encrypted client-side with AES-256-GCM before upload, so the server can never read them. One Go backend, three clients: web, desktop (Tauri), and terminal (TUI).",
    stack: ["Go", "Next.js", "Tauri", "WebAssembly"],
    context: "product", category: "security",
    github: "https://github.com/Wosmos/zcrypt", live: "https://zcrypt.cloud",
    langs: [["TypeScript", 71.5], ["Go", 20.3], ["Rust", 5.5], ["Shell", 1.4], ["CSS", 0.7], ["JavaScript", 0.4], ["Other", 0.2]],
    planet: { type: "gas", size: 1.6, c0: 0x160536, c1: 0x5b21b6, c2: 0xc026d3, c3: 0xf0abfc, rim: 0xff4de0,
      ring: { ca: 0xa78bfa, cb: 0xf3e8ff, inner: 1.3, outer: 2.5, tilt: 0.44 } },
  },
  {
    id: "learnity", title: "Learnity", year: 2025, weight: 0.85,
    tagline: "tutoring platform with a gamification engine",
    description:
      "Connects students with verified tutors — custom gamification engine (XP, streaks, progression), real-time HD video via GetStream, and role-based access control. Final Year Project, shipped solo.",
    stack: ["Next.js 15", "PostgreSQL", "GetStream", "Firebase"],
    context: "university", category: "web",
    github: "https://github.com/Wosmos/Learnity", live: "https://learnity-app.vercel.app",
    langs: [["TypeScript", 88.0], ["CSS", 7.5], ["JavaScript", 3.0], ["SQL", 1.5]],
    planet: { type: "rocky", size: 1.15, c0: 0x0b3d91, c1: 0x1f8a5b, c2: 0x7a9a3c, c3: 0xf2f5ff, rim: 0x6fc3ff, ocean: 0.55, cloud: 0.9,
      ring: { ca: 0xcfe3ff, cb: 0xffffff, inner: 1.38, outer: 2.3, tilt: -0.32 } },
  },
  {
    id: "furnizsh", title: "furniZsh", year: 2026, weight: 0.75,
    tagline: "a neon terminal in one command",
    description:
      "Ghostty + zsh + Starship with four themes and 24 commands. Distributed via Homebrew, npm, and Scoop with a provenance-attested release pipeline.",
    stack: ["Shell", "GitHub Actions", "Homebrew", "npm"],
    context: "product", category: "backend",
    github: "https://github.com/Wosmos/furnizsh", live: null,
    langs: [["Shell", 42.4], ["PowerShell", 24.2], ["HTML", 20.5], ["CSS", 8.3], ["JavaScript", 3.6], ["Ruby", 1.0]],
    planet: { type: "lava", size: 0.9, c0: 0x07070c, c1: 0x2a2a38, c2: 0x3c3c4a, c3: 0x00e5ff, rim: 0x00e5ff, vein: 1.0 },
  },
  {
    id: "netlink", title: "NetLink", year: 2025, weight: 0.8,
    tagline: "concurrent Go WebSocket chat",
    description:
      "A concurrent Go WebSocket server (goroutines + channels) fanning out to Next.js web and React Native mobile clients over a shared protocol, with persistent PostgreSQL history.",
    stack: ["Go", "WebSockets", "React Native", "PostgreSQL"],
    context: "product", category: "backend",
    github: "https://github.com/Wosmos/netlink", live: null,
    langs: [["TypeScript", 61.3], ["Go", 35.4], ["CSS", 1.4], ["HTML", 1.4], ["Other", 0.5]],
    planet: { type: "ice", size: 1.05, c0: 0x0a4fd6, c1: 0x00e5ff, c2: 0xd6f3ff, c3: 0xffffff, rim: 0x7ff0ff },
  },
  {
    id: "docxo", title: "DocXO", year: null, weight: 0.6,
    tagline: "real-time collaborative editor",
    description:
      "Google Docs-inspired editor with real-time collaboration, inline comments, and version history using Liveblocks and Lexical.",
    stack: ["Next.js", "Liveblocks", "Lexical"],
    context: "product", category: "web",
    github: "https://github.com/Wosmos/DocXO", live: "https://doc-xo.vercel.app",
    langs: [["TypeScript", 80.7], ["CSS", 11.3], ["Python", 7.9], ["JavaScript", 0.2]],
    planet: { type: "gas", size: 0.95, c0: 0x8b5e3c, c1: 0xe8d3a3, c2: 0xb9925a, c3: 0xf6ebd0, rim: 0xffd9a0 },
  },
  {
    id: "devtoolshq", title: "DevToolsHQ", year: null, weight: 0.55,
    tagline: "developer utilities dashboard",
    description: "Unified dashboard of developer utility tools — formatters, testers, generators — optimized for DX.",
    stack: ["Next.js", "TypeScript", "Firebase"],
    context: "product", category: "web",
    github: "https://github.com/Wosmos/DevToolsHQ", live: "https://dev-tools-hq-pi.vercel.app",
    langs: [["TypeScript", 92.0], ["CSS", 6.5], ["JavaScript", 1.5]],
    planet: { type: "rocky", size: 0.6, c0: 0x2f3440, c1: 0x5b6270, c2: 0x9aa3b2, c3: 0xe5e7eb, rim: 0x9fb4ff, ocean: 0.0, cloud: 0.0, crater: 1.0 },
  },
  {
    id: "scrappo", title: "Scrappo", year: null, weight: 0.5,
    tagline: "scheduled web scraper",
    description: "Dual-mode web scraper with scheduled jobs, email reporting, and multi-format exports (CSV, PDF, Excel).",
    stack: ["Python", "FastAPI", "Trafilatura"],
    context: "product", category: "backend",
    github: "https://github.com/Wosmos/WebScrapingTool", live: "https://scrappo.vercel.app",
    langs: [["Python", 63.7], ["TypeScript", 35.2], ["CSS", 0.7], ["Other", 0.4]],
    planet: { type: "rocky", size: 0.7, c0: 0x7a2e1a, c1: 0xa8471f, c2: 0xd98a5a, c3: 0xf3e9dc, rim: 0xff9a6b, ocean: 0.0, cloud: 0.15, crater: 0.4 },
  },
  {
    id: "resumeright", title: "ResumeRight", year: null, weight: 0.5,
    tagline: "ATS resume optimiser",
    description: "AI-powered resume optimization tool with ATS compatibility checks, keyword analysis, and improvement suggestions.",
    stack: ["Next.js", "TypeScript", "Firebase", "Google AI"],
    context: "product", category: "ai", status: "in development",
    github: "https://github.com/Wosmos/AI-Resume-checker", live: "https://ai-resume-checker-peach.vercel.app/",
    langs: [["TypeScript", 95.1], ["CSS", 4.4], ["Other", 0.5]],
    planet: { type: "gas", size: 0.55, c0: 0x9a2a0a, c1: 0xff6a2b, c2: 0xc2185b, c3: 0xffc7a0, rim: 0xffa26b },
  },
];

// `bullets` are the résumé lines verbatim; `note` is the one-line version the flight deck shows.
export const experience: readonly Experience[] = [
  { company: "Avialdo Solutions", title: "Software Engineer", location: "Karachi, Pakistan", start: "2025-01", end: null, stack: ["Next.js 15", "NestJS", "Django", "PostgreSQL"],
    note: "Production web apps on the App Router; NestJS and Django services; complex PostgreSQL schemas and query tuning in Agile sprints.",
    bullets: [
      "Build production web applications using Next.js 15 (App Router, SSR, ISR) with optimised data-fetching for enterprise-grade systems.",
      "Develop backend services across NestJS (TypeScript) and Django (Python), maintaining REST APIs that power client-facing dashboards and internal tooling.",
      "Design complex PostgreSQL schemas, author performance-optimised queries, and drive technical decisions in Agile sprints (Jira, Confluence).",
    ] },
  { company: "Nexsoft", title: "MERN Stack Developer · part-time", location: "Karachi, Pakistan", start: "2025-05", end: "2025-10", stack: ["MongoDB", "Express", "React", "Node"],
    note: "Brand site, full e-commerce with catalogue, cart and orders, and an internal HRMS with role-based modules — delivered end-to-end.",
    bullets: [
      "Delivered multiple client products end-to-end in a part-time role: the company brand site, a full e-commerce platform, and an internal HRMS (Human Resource Management System).",
      "Built the e-commerce platform on the MERN stack (MongoDB, Express.js, React, Node.js) with product catalogue, cart, and order flows backed by MongoDB schemas.",
      "Designed and shipped the HRMS with role-based modules for employee records and HR workflows, using Express.js REST APIs and a React frontend.",
    ] },
  { company: "Softechbar", title: "Next.js Developer", location: "Remote", start: "2024-01", end: "2024-12", stack: ["Next.js", "TypeScript", "SSR/SSG"],
    note: "Client brand sites, point-of-sale systems and real-estate listings with SSR/SSG-optimised fetching for SEO and load speed.",
    bullets: [
      "Delivered a range of client projects: multiple brand websites, point-of-sale (POS) systems, and real-estate web solutions.",
      "Built the POS systems with Next.js and TypeScript, covering product, transaction, and inventory interfaces with server-rendered pages for performance.",
      "Developed real-estate solutions with property listings, search, and detail flows, using optimised data-fetching (SSR / SSG) for SEO and load speed.",
    ] },
  { company: "Liftup AI", title: "Frontend Engineer · AI products", location: "Jamshoro, Pakistan", start: "2024-01", end: "2024-03", stack: ["React", "Redux", "Tailwind"],
    note: "React + Redux analytics dashboards; a reusable Tailwind component library that cut new-feature time by ~30%.",
    bullets: [
      "Engineered responsive, production-grade React + Redux interfaces for AI-driven analytics dashboards used by internal teams.",
      "Architected a reusable Tailwind CSS component library that reduced new-feature development time by approximately 30%.",
      "Achieved 60fps UI animations and sub-2-second page loads through code-splitting, asset optimisation, and aggressive caching.",
    ] },
  { company: "Interns Pakistan", title: "Web Developer · intern", location: "Remote, Pakistan", start: "2022-10", end: "2022-12", stack: ["React", "Vue", "ES6+"],
    note: "Responsive components, DOM APIs, semantic markup, WCAG, Git workflows — the fundamentals, done properly.",
    bullets: [
      "Built responsive web pages and components using React, Vue.js, HTML5, CSS3, and modern JavaScript (ES6+).",
      "Strengthened core web fundamentals: DOM APIs, semantic markup, web accessibility (WCAG), and responsive design.",
      "Adopted Git-based collaboration workflows (feature branches, pull requests, code review) used in real-world software teams.",
    ] },
];

// Technical skills — the seven groups on the résumé, in its order and wording.
export const skills: readonly SkillGroup[] = [
  { group: "languages", items: ["TypeScript", "JavaScript", "Go", "Python", "SQL"] },
  { group: "frontend", items: ["Next.js (App Router, SSR, ISR, RSC)", "React", "React Native", "Redux Toolkit", "Vue.js", "Tailwind CSS", "Framer Motion", "SCSS", "Bun"] },
  { group: "backend", items: ["Go (stdlib net/http, Goroutines, Channels)", "Node.js", "NestJS", "Express.js", "Django", "FastAPI", "REST APIs", "WebSockets", "JWT"] },
  { group: "databases", items: ["PostgreSQL", "MongoDB", "MySQL", "SQLite", "Firebase", "Amazon RDS"] },
  { group: "cloud & devops", items: ["Vercel", "Docker", "Git", "GitHub Actions", "CI/CD"] },
  { group: "security", items: ["AES-256-GCM", "PBKDF2", "Web Crypto API", "WebAssembly", "Zero-Knowledge Architecture"] },
  { group: "tools", items: ["Jira", "Confluence", "Postman", "Clerk Auth", "Liveblocks", "Lexical Editor", "Zod", "GetStream"] },
];

export const education: readonly Education[] = [
  { school: "University of Sindh", degree: "Bachelor of Science in Software Engineering", start: "2022", end: "2026", grade: "3.0 GPA" },
  { school: "Eagle House", degree: "Intermediate (Pre-Engineering)", start: "2021", end: "2022", grade: "89%" },
];

// Résumé "Selected projects" — the tech line and bullets verbatim, keyed by project id.
// Projects without an entry are described by their `description` only.
export const highlights: Readonly<Record<string, Highlight>> = {
  zcrypt: {
    heading: "Zero-Knowledge Encrypted Cloud Storage Platform",
    tech: ["Go (stdlib)", "Next.js", "TypeScript", "Bun", "PostgreSQL", "Tauri", "Web Crypto API", "WebAssembly", "SQLite", "Bubble Tea"],
    bullets: [
      "Designed and shipped a zero-knowledge cloud storage platform (zcrypt.cloud) where the server cannot decrypt user files, same threat model as Bitwarden / 1Password; positioned as an open-source Dropbox / Google Drive alternative.",
      "Built three client surfaces against a single Go backend: a Next.js web app (Bun runtime), a Tauri cross-platform desktop app, and a Bubble Tea terminal client (TUI), all consuming a custom stdlib HTTP server with zero framework dependencies.",
      "Implemented client-side AES-256-GCM encryption with PBKDF2 key derivation and zstd compression via Web Crypto API + WebAssembly, so the server only ever handles opaque encrypted blobs.",
      "Engineered a chunked upload/download pipeline with repo-pool auto-rotation distributing encrypted chunks across GitHub, GitLab, and HuggingFace, a bring-your-own-backend (BYOB) architecture with no commercial cloud dependency.",
    ],
    extraLinks: [["TUI", "https://zcrypt.cloud/tui"]],
  },
  learnity: {
    heading: "Online Tutoring Platform with Gamified Learning (FYP)",
    tech: ["Next.js 15", "TypeScript", "PostgreSQL", "GetStream", "Tailwind CSS", "Firebase"],
    bullets: [
      "Built an end-to-end online tutoring platform (learnity-app.vercel.app) connecting students with verified tutors for personalised 1-on-1 sessions and synchronous study groups.",
      "Engineered a custom gamification engine, XP system, streak multipliers, and progression formulas, designed around behavioural-engagement loops that reward consistent learning.",
      "Integrated GetStream for real-time HD video tutoring; implemented role-based access control across Students, Teachers, and Admins with isolated permission scopes.",
      "Owned the product end-to-end, schema, backend, authentication, real-time video, gamification, and the full Next.js 15 (SSR / ISR / App Router) frontend, shipping a complete EdTech product solo.",
    ],
  },
  netlink: {
    heading: "Real-Time Chat Platform (Web + Mobile)",
    tech: ["Go (Goroutines, Channels, WebSockets)", "Next.js", "Bun", "React Native", "PostgreSQL", "TypeScript"],
    bullets: [
      "Built a complete chat platform from scratch, a Go backend, a Next.js + Bun web client, and a React Native mobile app, all sharing a single bidirectional WebSocket protocol.",
      "Designed a concurrent WebSocket server using Go's goroutines and channels to handle thousands of simultaneous connections with low-latency message fan-out.",
      "Architected a lightweight, framework-free messaging protocol with persistent PostgreSQL storage for chat history, presence, and delivery state.",
      "Implemented the React Native mobile client with shared state management and offline-resilient message queuing, mirroring the web client feature set.",
    ],
  },
};

// Testimonials. NOTHING here is real yet — both entries are SAMPLES so the section can be designed;
// they render with a visible "sample" tag until replaced with real quotes (name, role, link) or removed.
export const testimonials: readonly Testimonial[] = [
  { placeholder: true, quote: "Sample quote. Replace with a real one from a lead, client or teammate: what was built, how it went, what you would say to the next person hiring him.", name: "Name Surname", role: "Engineering lead", company: "Company", link: null },
  { placeholder: true, quote: "Second sample. Two or three real testimonials are plenty; delete the rest. Keep them short enough to read in one breath.", name: "Name Surname", role: "Client", company: "Company", link: null },
];

// The four the reading site leads with (the résumé's selected projects + furniZsh); the rest live on /read/projects.html.
export const featured: readonly ProjectId[] = ["zcrypt", "learnity", "netlink", "furnizsh"];


// GitHub language colours (github/linguist), used for the cutaway layers and the composition bar
export const LANG_COLORS: Readonly<Record<string, number>> = {
  TypeScript: 0x3178c6, JavaScript: 0xf1e05a, Go: 0x00add8, Rust: 0xdea584, Python: 0x3572a5, Shell: 0x89e051,
  PowerShell: 0x012456, HTML: 0xe34c26, CSS: 0x663399, Ruby: 0x701516, SQL: 0xe38c00, Dart: 0x00b4ab, Nix: 0x7e7eff, Other: 0xededed,
};

/** GitHub repo slug (lower-case) → project id. */
export const repoIndex: Readonly<Record<string, ProjectId>> = Object.fromEntries(
  projects.map((p) => [repoSlug(p).toLowerCase(), p.id] as const),
);
/** "Wosmos/zcrypt" from the repo URL. */
export function repoPath(p: Project): string { return p.github.replace("https://github.com/", ""); }
export function repoSlug(p: Project): string { return repoPath(p).split("/")[1] ?? ""; }
export function projectById(id: string): Project | undefined { return projects.find((p) => p.id === id); }
export const featuredProjects: readonly Project[] = featured.map((id) => projectById(id)).filter((p): p is Project => p !== undefined);
export const SITE_URL = "https://wosmos.vercel.app";
/** Distance from the sun per project, outward. The database overrides these per row. */
export const DEFAULT_ORBITS: readonly number[] = [17, 25, 34, 45, 58, 73, 90, 110];

/** A line the cockpit can whisper when someone finds a secret. Editable from the admin. */
export interface EggFact { kind: "space" | "me" | "random"; text: string }
/** The starting pool. The admin owns the table; these seed it and stand in when the database is away. */
export const eggFacts: readonly EggFact[] = [
  { kind: "space", text: "A day on Venus is longer than its year. It turns backwards, too." },
  { kind: "space", text: "Saturn's rings are younger than some dinosaurs — perhaps 100 million years old." },
  { kind: "space", text: "Neutron star material: one sugar cube would weigh about a billion tonnes." },
  { kind: "space", text: "Jupiter has no surface to land on. You would just keep falling until you were crushed." },
  { kind: "space", text: "Space smells, apparently, of seared steak and hot metal. Ask the astronauts." },
  { kind: "space", text: "It rains diamonds on Neptune. Carbon, squeezed hard enough, has no other option." },
  { kind: "space", text: "The Voyager 1 probe still answers. Its computer has about 70 kilobytes of memory." },
  { kind: "space", text: "There are more stars in the sky than grains of sand on every beach on Earth." },
  { kind: "space", text: "Olympus Mons on Mars is so wide that standing on it, you could not tell it was a mountain." },
  { kind: "space", text: "The sun's light took 8 minutes to reach you and 100,000 years to escape the sun." },
  { kind: "space", text: "Every atom heavier than iron in your body was forged in a dying star." },
  { kind: "space", text: "Sound cannot cross a vacuum, so every explosion in every space film is a lie." },
  { kind: "me", text: "wosmo is not a company. It is one engineer, a keyboard and too much coffee." },
  { kind: "me", text: "I write Go for the parts that must not fall over, and TypeScript for the parts people touch." },
  { kind: "me", text: "zcrypt encrypts in your browser. I cannot read your files, and that is the whole point." },
  { kind: "me", text: "furniZsh ships to Homebrew, npm and the PowerShell Gallery. Three package managers, one toolkit." },
  { kind: "me", text: "This cockpit renders in raw GLSL. No model files, no textures — every planet is maths." },
  { kind: "me", text: "I prefer the boring deploy. Excitement in production is a bug report waiting to happen." },
  { kind: "me", text: "Ask me about concurrency and you will not get a short answer." },
  { kind: "me", text: "Yes, the résumé is one click away. No, I could not resist building the solar system first." },
  { kind: "random", text: "There is no reverse gear on this ship. There is, however, an escape key." },
  { kind: "random", text: "Honey never spoils. Archaeologists have eaten 3,000-year-old honey and lived." },
  { kind: "random", text: "Bananas are mildly radioactive. So is everyone reading this." },
  { kind: "random", text: "The word 'debug' predates computers. Bugs got into machinery first." },
  { kind: "random", text: "Octopuses have three hearts and a preference for the colour blue. Same." },
  { kind: "random", text: "Wombat droppings are cubic. Nobody asked for this, and yet, here we are." },
  { kind: "random", text: "The first computer bug was an actual moth, taped into a logbook in 1947." },
  { kind: "random", text: "If you are reading this, you found something most visitors never will." },
];
