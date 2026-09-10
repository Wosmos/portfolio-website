// Does this visitor actually want something? A score out of 100 and a band, worked out only from what
// the analytics already collect — no extra tracking, no third party, no personal data.
//
// Everything here is pure so it can be unit tested and replayed: `signalsFrom` turns a stored profile
// plus a list of events into flags, `scoreVisitor` turns flags into a number. /api/track calls both on
// the row it just upserted, and the visitor detail endpoint calls them again over the full history,
// which is why the two must never disagree about what a signal means.

export type Intent = "hot" | "warm" | "curious" | "passing" | "bot";

export interface LeadScore {
  score: number;
  intent: Intent;
  why: readonly string[];
}

/**
 * The tuning table. Positives are what someone does when they are considering hiring or briefing me;
 * negatives are what someone does when they landed here by accident. Points are added and clamped to
 * 0–100, so the ceiling is reached by a combination rather than by any single act except a message.
 */
export const WEIGHTS = {
  /** wrote in — the only signal that speaks for itself */
  sentMessage: 45,
  /** put the cursor in the contact form but did not send */
  startedForm: 20,
  openedContact: 12,

  openedResume: 16,
  clickedEmail: 14,
  clickedLinkedin: 8,
  clickedGithub: 6,

  /** read past three quarters of a page */
  readDeep: 8,
  /** full marks at ATTENTION_FULL seconds per visit, pro rata below it */
  attention: 12,
  /** three or more pages in one visit */
  multiPage: 6,

  /** per visit after the first, up to returningCap */
  returning: 5,
  returningCap: 12,
  /** still coming back days later */
  sustained: 7,

  openedProject: 8,
  multipleProjects: 6,
  openedCutaway: 7,
  flewToPlanet: 5,

  /** arrived from LinkedIn or a job board */
  recruiterSource: 10,
  /** went for the experience, skills or résumé pages rather than browsing */
  credentialPath: 8,

  /** one page, gone in seconds */
  bounced: -12,
  /** headless or scripted */
  automation: -60,
} as const;

/** Band edges, inclusive at the bottom. */
export const BANDS = { hot: 70, warm: 45, curious: 18 } as const;

/** Seconds of attention per visit that earn the whole `attention` weight. */
const ATTENTION_FULL = 180;
/** A visit shorter than this with a single pageview is somebody who left immediately. */
const BOUNCE_SECONDS = 10;

export function intentFor(score: number): Intent {
  if (score >= BANDS.hot) return "hot";
  if (score >= BANDS.warm) return "warm";
  if (score >= BANDS.curious) return "curious";
  return "passing";
}

export interface VisitorSignals {
  isOwner: boolean;
  isBot: boolean;
  automation: boolean;
  visits: number;
  pageviews: number;
  engagedSeconds: number;
  /** Days between first and last sight. */
  daysKnown: number;
  /** Most pages seen in a single visit. */
  pagesInSession: number;
  /** Deepest scroll on any page, 0–100. */
  maxScroll: number;
  projectsViewed: number;
  openedContact: boolean;
  startedForm: boolean;
  sentMessage: boolean;
  openedResume: boolean;
  clickedEmail: boolean;
  clickedLinkedin: boolean;
  clickedGithub: boolean;
  openedCutaway: boolean;
  flewToPlanet: boolean;
  fromLinkedin: boolean;
  fromJobBoard: boolean;
  hitCredentials: boolean;
  /** One pageview and gone before the clock got going. */
  bounced: boolean;
  /**
   * The last score this profile was given, if any. Signals only ever accumulate in real life — someone
   * who opened the contact form last week still opened it — so the engine never scores below it.
   */
  previous?: { score: number; why: readonly string[] } | null;
}

export function scoreVisitor(input: VisitorSignals): LeadScore {
  // Hard exclusions answer before anything is added up: neither is a lead, and neither should be able
  // to earn a score by behaving like one.
  if (input.isBot) return { score: 0, intent: "bot", why: ["a crawler, not a person"] };
  if (input.isOwner) return { score: 0, intent: "bot", why: ["that is me"] };

  let score = 0;
  const why: string[] = [];
  const add = (points: number, reason: string): void => {
    if (points === 0) return;
    score += points;
    why.push(reason);
  };

  if (input.sentMessage) add(WEIGHTS.sentMessage, "sent a message");
  if (input.startedForm) add(WEIGHTS.startedForm, "started the contact form");
  if (input.openedContact) add(WEIGHTS.openedContact, "opened the contact page");

  if (input.openedResume) add(WEIGHTS.openedResume, "opened the résumé");
  if (input.clickedEmail) add(WEIGHTS.clickedEmail, "clicked the email address");
  if (input.clickedLinkedin) add(WEIGHTS.clickedLinkedin, "clicked through to linkedin");
  if (input.clickedGithub) add(WEIGHTS.clickedGithub, "clicked through to github");

  if (input.maxScroll >= 75) add(WEIGHTS.readDeep, `read to ${Math.min(100, Math.round(input.maxScroll))}%`);

  const perVisit = input.engagedSeconds / Math.max(1, input.visits);
  const attention = Math.round(WEIGHTS.attention * Math.min(1, perVisit / ATTENTION_FULL));
  if (attention > 0) add(attention, `${Math.round(perVisit)}s of attention per visit`);

  if (input.pagesInSession >= 3) add(WEIGHTS.multiPage, `${input.pagesInSession} pages in one visit`);

  if (input.visits > 1) {
    add(Math.min(WEIGHTS.returningCap, WEIGHTS.returning * (input.visits - 1)), `came back ${input.visits - 1}×`);
    if (input.daysKnown >= 2) add(WEIGHTS.sustained, `still reading ${Math.round(input.daysKnown)} days later`);
  }

  if (input.projectsViewed > 0) add(WEIGHTS.openedProject, "opened a project");
  if (input.projectsViewed > 1) add(WEIGHTS.multipleProjects, `compared ${input.projectsViewed} projects`);
  if (input.openedCutaway) add(WEIGHTS.openedCutaway, "opened the cutaway");
  if (input.flewToPlanet) add(WEIGHTS.flewToPlanet, "flew to a planet");

  if (input.fromJobBoard) add(WEIGHTS.recruiterSource, "arrived from a job board");
  else if (input.fromLinkedin) add(WEIGHTS.recruiterSource, "arrived from linkedin");
  if (input.hitCredentials) add(WEIGHTS.credentialPath, "went straight for experience, skills or the résumé");

  if (input.bounced) add(WEIGHTS.bounced, "one page, gone in seconds");
  // Soft automation: a headless-looking client can still be a real person behind a hardened browser,
  // so it loses points rather than being thrown out, and only lands in the bot band if nothing is left.
  if (input.automation) add(WEIGHTS.automation, "looks scripted");

  const now = Math.max(0, Math.min(100, score));
  const before = input.previous;
  if (before && before.score > now) return { score: before.score, intent: intentFor(before.score), why: before.why };
  const intent = input.automation && now === 0 ? "bot" : intentFor(now);
  return { score: now, intent, why: why.length ? why : ["nothing worth reporting yet"] };
}

// ── turning rows into signals ───────────────────────────
// Both callers hand over the same two things: the stored profile and a list of events. Kept here, next
// to the weights, so "opened the contact page" means one thing across the whole codebase.

/** The columns of `visitors` the engine reads. Dates may arrive as strings from JSON. */
export interface ProfileLike {
  isOwner: boolean;
  isBot: boolean;
  visits: number;
  pageviews: number;
  engagedSeconds: number;
  firstSeen: Date | string;
  lastSeen: Date | string;
  firstReferrer: string;
  firstLanding: string;
  converted: boolean;
}

/** The columns of `events` the engine reads. */
export interface EventLike {
  name: string;
  path: string;
  target: string;
  value?: number | null;
  meta?: Record<string, string | number | boolean> | null;
}

export interface SignalInput {
  profile: ProfileLike;
  events: readonly EventLike[];
  /** Deepest scroll known for this profile, 0–100. */
  maxScroll?: number;
  /** Most pages in a single visit. Defaults to the pageviews in `events`. */
  pagesInSession?: number;
  automation?: boolean;
  previous?: { score: number; why: readonly string[] } | null;
}

const CONTACT = /(^|\/)contact(\/|$)/i;
const PROJECT = /\/projects\/[^/]+/i;
const CREDENTIALS = /(experience|skills|resume|cv|about)/i;
const JOB_BOARDS = /(indeed|glassdoor|wellfound|angel\.co|ziprecruiter|monster|dice\.com|otta|hired|workable|greenhouse|lever\.co|remoteok|weworkremotely|hackernews|ycombinator)/i;
const LINKEDIN = /linkedin\./i;
const GITHUB = /github\.(com|io)/i;
const RESUME = /(resume|cv|\.pdf)/i;

const DAY_MS = 86_400_000;
const asTime = (v: Date | string): number => (v instanceof Date ? v.getTime() : new Date(v).getTime());

/** A click event's destination, from whichever of target/href/meta carries it. */
function clickHref(e: EventLike): string {
  const meta = e.meta ?? {};
  const href = typeof meta.href === "string" ? meta.href : "";
  return `${href} ${e.target}`;
}

export function signalsFrom(input: SignalInput): VisitorSignals {
  const p = input.profile;
  const paths = new Set<string>();
  const projects = new Set<string>();
  let depth = input.maxScroll ?? 0;
  let openedContact = CONTACT.test(p.firstLanding);
  let startedForm = false;
  let openedResume = false;
  let clickedEmail = false;
  let clickedLinkedin = false;
  let clickedGithub = false;
  let openedCutaway = false;
  let flewToPlanet = false;
  let pageviews = 0;

  for (const e of input.events) {
    const path = e.path || "";
    if (e.name === "pageview") {
      pageviews += 1;
      paths.add(path);
      if (CONTACT.test(path)) openedContact = true;
      const project = PROJECT.exec(path);
      if (project) projects.add(project[0]);
    }
    if (e.name === "read_depth" && typeof e.value === "number") depth = Math.max(depth, e.value);
    if (e.name === "contact_start") startedForm = true;
    if (e.name === "cutaway") openedCutaway = true;
    if (e.name === "deck_flight" || e.name === "planet_drag") flewToPlanet = true;
    if (e.name === "resume") openedResume = true;
    if (e.name === "project_open") projects.add(e.target || path);
    if (e.name === "click") {
      const href = clickHref(e);
      if (href.includes("mailto:")) clickedEmail = true;
      if (LINKEDIN.test(href)) clickedLinkedin = true;
      if (GITHUB.test(href)) clickedGithub = true;
      if (RESUME.test(href)) openedResume = true;
    }
  }

  const referrer = p.firstReferrer;
  const engagedSeconds = Math.max(0, p.engagedSeconds);
  const visits = Math.max(1, p.visits);

  return {
    isOwner: p.isOwner,
    isBot: p.isBot,
    automation: input.automation ?? false,
    visits,
    pageviews: Math.max(p.pageviews, pageviews),
    engagedSeconds,
    daysKnown: Math.max(0, (asTime(p.lastSeen) - asTime(p.firstSeen)) / DAY_MS),
    pagesInSession: input.pagesInSession ?? paths.size,
    maxScroll: Math.max(0, Math.min(100, depth)),
    projectsViewed: projects.size,
    openedContact,
    startedForm,
    sentMessage: p.converted,
    openedResume,
    clickedEmail,
    clickedLinkedin,
    clickedGithub,
    openedCutaway,
    flewToPlanet,
    fromLinkedin: LINKEDIN.test(referrer),
    fromJobBoard: JOB_BOARDS.test(referrer),
    // "straight for" means the very first page they asked for, not one they wandered into later
    hitCredentials: CREDENTIALS.test(p.firstLanding),
    bounced: p.pageviews <= 1 && engagedSeconds < BOUNCE_SECONDS && visits === 1,
    previous: input.previous ?? null,
  };
}
