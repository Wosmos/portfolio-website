// Postgres schema (Neon + Drizzle). Two halves:
//   content — everything the admin can edit, including the solar system's shader configuration
//   analytics — visitor profiles, sessions and events, with no raw IP addresses stored
//
// Content mirrors the shapes in src/data/portfolio.ts so the static records can seed the tables and
// still serve as a fallback when the database is unreachable.

import { boolean, index, integer, jsonb, pgTable, real, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// ── content ─────────────────────────────────────────────

/** One row. Name, contact details, the summary and the résumé link. */
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  line: text("line").notNull(),
  positioning: text("positioning").notNull(),
  summary: text("summary").notNull(),
  metaDescription: text("meta_description").notNull(),
  location: text("location").notNull(),
  tz: text("tz").notNull(),
  tzLabel: text("tz_label").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  cv: text("cv").notNull(),
  github: text("github").notNull(),
  linkedin: text("linkedin").notNull(),
  hashnode: text("hashnode").default("").notNull(),
  npmCard: text("npm_card").default("").notNull(),
  availability: text("availability").default("open · remote").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export interface RingConfigJson { ca: number; cb: number; inner: number; outer: number; tilt: number }

/** One moon. A repository's top-level folders become these: zcrypt's backend, frontend, mobile, core. */
export interface MoonConfigJson {
  /** What the label reads. Defaults to the folder name. */
  name: string;
  /** The repository path it was detected from, empty when it was added by hand. */
  path: string;
  /** Radius as a fraction of the planet's. */
  size: number;
  /** Orbit radius in multiples of the planet's radius. */
  orbit: number;
  /** Turns per minute around the planet. */
  speed: number;
  /** Orbital inclination, degrees. */
  tilt: number;
  /** Where it starts on its orbit, degrees, so two moons do not overlap. */
  phase: number;
  colour: number;
  type: "gas" | "rocky" | "ice" | "muddy" | "liquid" | "lava";
  /** True while it is still whatever detection produced; a hand edit clears it. */
  auto: boolean;
  visible: boolean;
}
/** Everything the shader needs for one planet. Colours are stored as integers, as the scene wants them. */
export interface PlanetConfigJson {
  type: "gas" | "rocky" | "lava" | "ice" | "liquid" | "muddy";
  size: number; c0: number; c1: number; c2: number; c3: number; rim: number;
  ocean?: number; cloud?: number; crater?: number; vein?: number;
  /** Surface noise seed — changes the terrain without touching anything else. */
  seed?: number;
  /** Spin rate (turns per scene minute) and axial tilt in degrees. */
  spin?: number; tilt?: number;
  /** Atmosphere shell: thickness as a fraction of the radius, and its opacity. */
  atmo?: number; atmoAlpha?: number;
  /** Night-side glow from the emissive channel (lava veins, city lights). */
  glow?: number;
  /** Band count for gas giants, and how hard the bands are edged. */
  bands?: number; bandSharp?: number;
  ring?: RingConfigJson | null;
}
export type LangShareJson = [name: string, percent: number];

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  /** Résumé "selected projects" heading and bullets, when the project has them. */
  heading: text("heading").default("").notNull(),
  bullets: jsonb("bullets").$type<string[]>().default([]).notNull(),
  tech: jsonb("tech").$type<string[]>().default([]).notNull(),
  stack: jsonb("stack").$type<string[]>().default([]).notNull(),
  extraLinks: jsonb("extra_links").$type<[label: string, url: string][]>().default([]).notNull(),
  category: text("category").notNull(),
  context: text("context").notNull(),
  status: text("status").default("").notNull(),
  year: integer("year"),
  weight: real("weight").default(0.5).notNull(),
  github: text("github").notNull(),
  live: text("live").default("").notNull(),
  /** Fallback language split; overwritten in the UI by the live GitHub numbers when they resolve. */
  langs: jsonb("langs").$type<LangShareJson[]>().default([]).notNull(),
  planet: jsonb("planet").$type<PlanetConfigJson>().notNull(),
  /** Distance from the sun in scene units — the orbit the planet sits on. */
  orbit: real("orbit").notNull(),
  /** Moons, one per meaningful top-level folder in the repository. */
  moons: jsonb("moons").$type<MoonConfigJson[]>().default([]).notNull(),
  /** Re-detect moons from the repository tree on the next refresh, replacing the untouched ones. */
  moonsAuto: boolean("moons_auto").default(true).notNull(),
  /** A private repository: the link would 404 for a visitor, so the page says so instead of offering it. */
  sourcePrivate: boolean("source_private").default(false).notNull(),
  /** When false the dashboard's own value wins over whatever GitHub reports. */
  useLiveLangs: boolean("use_live_langs").default(true).notNull(),
  useLiveMeta: boolean("use_live_meta").default(true).notNull(),
  useLiveReadme: boolean("use_live_readme").default(true).notNull(),
  coverImage: text("cover_image").default("").notNull(),
  images: jsonb("images").$type<{ url: string; caption?: string }[]>().default([]).notNull(),
  featured: boolean("featured").default(false).notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const experience = pgTable("experience", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location").default("").notNull(),
  /** "YYYY-MM"; `end` null means present. */
  start: varchar("start", { length: 7 }).notNull(),
  end: varchar("end", { length: 7 }),
  note: text("note").default("").notNull(),
  bullets: jsonb("bullets").$type<string[]>().default([]).notNull(),
  stack: jsonb("stack").$type<string[]>().default([]).notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const skillGroups = pgTable("skill_groups", {
  id: serial("id").primaryKey(),
  group: text("group").notNull(),
  items: jsonb("items").$type<string[]>().default([]).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const education = pgTable("education", {
  id: serial("id").primaryKey(),
  school: text("school").notNull(),
  degree: text("degree").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  grade: text("grade").default("").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

/** Lines the cockpit whispers when a visitor finds a secret. `kind` groups them: space · me · random. */
export const eggFacts = pgTable("egg_facts", {
  id: serial("id").primaryKey(),
  kind: varchar("kind", { length: 12 }).default("random").notNull(),
  text: text("text").notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  quote: text("quote").notNull(),
  name: text("name").notNull(),
  role: text("role").default("").notNull(),
  company: text("company").default("").notNull(),
  link: text("link").default("").notNull(),
  avatar: text("avatar").default("").notNull(),
  /** Marks the entry as a sample so the page can label it instead of passing it off as real. */
  placeholder: boolean("placeholder").default(false).notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").default("").notNull(),
  /** Markdown. Rendered with the same restricted subset the README uses. */
  body: text("body").default("").notNull(),
  coverImage: text("cover_image").default("").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  readingMinutes: integer("reading_minutes").default(1).notNull(),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** The scene's global values: the sun, orbit spacing, the belt, the camera. One row. */
export const sceneConfig = pgTable("scene_config", {
  id: serial("id").primaryKey(),
  sunRadius: real("sun_radius").default(6).notNull(),
  sunColorCore: integer("sun_color_core").default(0xfff3c4).notNull(),
  sunColorEdge: integer("sun_color_edge").default(0xff7a1a).notNull(),
  sunIntensity: real("sun_intensity").default(1).notNull(),
  orbitScale: real("orbit_scale").default(1).notNull(),
  beltRadius: real("belt_radius").default(65.5).notNull(),
  beltDensity: integer("belt_density").default(1400).notNull(),
  starCount: integer("star_count").default(3600).notNull(),
  nebulaA: integer("nebula_a").default(0x3b0764).notNull(),
  nebulaB: integer("nebula_b").default(0x0b2f6e).notNull(),
  bloom: real("bloom").default(1).notNull(),
  fov: real("fov").default(42).notNull(),
  /** stylised (hand-picked) · relative (true size ratios, eased distances) · real (true to scale). */
  scaleMode: varchar("scale_mode", { length: 10 }).default("stylised").notNull(),
  /** What the outermost orbit means in astronomical units — 30 is Neptune, 63241 is a light year. */
  spanAu: real("span_au").default(30).notNull(),
  /** Sun: the rest of what the shader can do. */
  sunColorMid: integer("sun_color_mid").default(0xffb547).notNull(),
  sunGranulation: real("sun_granulation").default(1).notNull(),
  sunCorona: real("sun_corona").default(1).notNull(),
  sunSpots: real("sun_spots").default(0).notNull(),
  sunSpin: real("sun_spin").default(1).notNull(),
  sunLimb: real("sun_limb").default(1).notNull(),
  sunFlare: real("sun_flare").default(1).notNull(),
  /** Asteroid belt geometry, not just its radius. */
  beltWidth: real("belt_width").default(9).notNull(),
  beltThickness: real("belt_thickness").default(1.2).notNull(),
  beltRockSize: real("belt_rock_size").default(1).notNull(),
  beltColor: integer("belt_color").default(0x8b7d6b).notNull(),
  beltTilt: real("belt_tilt").default(0).notNull(),
  /** The other repositories, drawn as constellations whose stars are sized by commit count. */
  constellations: boolean("constellations").default(true).notNull(),
  constellationGain: real("constellation_gain").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Free-form key/value for anything that does not deserve a column yet. */
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── inbox ───────────────────────────────────────────────

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  /** new · read · replied · archived · spam */
  state: varchar("state", { length: 16 }).default("new").notNull(),
  notes: text("notes").default("").notNull(),
  /** Which visitor profile sent it, when one is known. */
  visitorId: varchar("visitor_id", { length: 64 }),
  country: text("country").default("").notNull(),
  city: text("city").default("").notNull(),
  referrer: text("referrer").default("").notNull(),
  userAgent: text("user_agent").default("").notNull(),
  emailId: text("email_id").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("submissions_state_idx").on(t.state), index("submissions_created_idx").on(t.createdAt)]);

// ── analytics ───────────────────────────────────────────
// A visitor is identified by a salted hash of (IP + user agent + accept-language). The raw IP is never
// written to the database, and the salt lives only in the environment, so the table cannot be reversed
// into addresses. Everything else is what the browser volunteers.

export const visitors = pgTable("visitors", {
  /** hash(ip + ua + lang + salt) — stable for the same person on the same device and network. */
  id: varchar("id", { length: 64 }).primaryKey(),
  firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow().notNull(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
  visits: integer("visits").default(1).notNull(),
  pageviews: integer("pageviews").default(0).notNull(),
  events: integer("events").default(0).notNull(),
  /** Seconds of measured attention, summed across sessions. */
  engagedSeconds: integer("engaged_seconds").default(0).notNull(),
  country: text("country").default("").notNull(),
  region: text("region").default("").notNull(),
  city: text("city").default("").notNull(),
  timezone: text("timezone").default("").notNull(),
  device: varchar("device", { length: 16 }).default("desktop").notNull(),
  os: text("os").default("").notNull(),
  browser: text("browser").default("").notNull(),
  screen: text("screen").default("").notNull(),
  language: text("language").default("").notNull(),
  /** How they first arrived, kept so the source of a lead is not lost on later visits. */
  firstReferrer: text("first_referrer").default("").notNull(),
  firstLanding: text("first_landing").default("").notNull(),
  utmSource: text("utm_source").default("").notNull(),
  utmMedium: text("utm_medium").default("").notNull(),
  utmCampaign: text("utm_campaign").default("").notNull(),
  /** read · fly · both — which side of the site they use. */
  door: varchar("door", { length: 8 }).default("").notNull(),
  /** Set when this visitor sent a message, so the inbox can show their whole history. */
  converted: boolean("converted").default(false).notNull(),
  label: text("label").default("").notNull(),
  isBot: boolean("is_bot").default(false).notNull(),
  /** Me. Set from ADMIN_VISITOR_HASHES or by signing into the admin; excluded from every figure. */
  isOwner: boolean("is_owner").default(false).notNull(),
  /** 0–100, worked out from behaviour by src/lib/lead.ts. */
  score: integer("score").default(0).notNull(),
  /** hot · warm · curious · passing · bot — the band `score` falls in. */
  intent: varchar("intent", { length: 12 }).default("passing").notNull(),
  /** Why it scored that way, so the admin shows reasons rather than a bare number. */
  scoreWhy: jsonb("score_why").$type<readonly string[]>().default([]).notNull(),
  scoredAt: timestamp("scored_at", { withTimezone: true }),
}, (t) => [
  index("visitors_last_seen_idx").on(t.lastSeen),
  index("visitors_country_idx").on(t.country),
  index("visitors_score_idx").on(t.score),
  index("visitors_owner_idx").on(t.isOwner),
]);

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  visitorId: varchar("visitor_id", { length: 64 }).notNull().references(() => visitors.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  lastAt: timestamp("last_at", { withTimezone: true }).defaultNow().notNull(),
  pageviews: integer("pageviews").default(0).notNull(),
  events: integer("events").default(0).notNull(),
  engagedSeconds: integer("engaged_seconds").default(0).notNull(),
  maxScroll: integer("max_scroll").default(0).notNull(),
  entryPath: text("entry_path").default("").notNull(),
  exitPath: text("exit_path").default("").notNull(),
  referrer: text("referrer").default("").notNull(),
}, (t) => [index("sessions_visitor_idx").on(t.visitorId), index("sessions_started_idx").on(t.startedAt)]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  visitorId: varchar("visitor_id", { length: 64 }).notNull().references(() => visitors.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  /** pageview · click · scroll · door · cutaway · resume · contact · deck · … */
  name: varchar("name", { length: 40 }).notNull(),
  path: text("path").default("").notNull(),
  /** What was clicked or opened: a project id, a button label, a panel name. */
  target: text("target").default("").notNull(),
  value: real("value"),
  meta: jsonb("meta").$type<Record<string, string | number | boolean>>().default({}).notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("events_visitor_idx").on(t.visitorId), index("events_name_idx").on(t.name), index("events_at_idx").on(t.at)]);

/** One row per visitor per day, so the dashboard never scans the whole events table. */
export const daily = pgTable("daily", {
  day: varchar("day", { length: 10 }).notNull(),
  path: text("path").default("").notNull(),
  visits: integer("visits").default(0).notNull(),
  pageviews: integer("pageviews").default(0).notNull(),
  uniques: integer("uniques").default(0).notNull(),
  engagedSeconds: integer("engaged_seconds").default(0).notNull(),
}, (t) => [uniqueIndex("daily_day_path_idx").on(t.day, t.path)]);

export const adminLogins = pgTable("admin_logins", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  ok: boolean("ok").notNull(),
  /** Hashed like a visitor id — enough to spot an attack, useless as an address. */
  fromHash: varchar("from_hash", { length: 64 }).default("").notNull(),
  userAgent: text("user_agent").default("").notNull(),
});
