// Turning a request into a stable visitor id without keeping anything that identifies a person.
//
// The id is SHA-256 over (ip + user agent + language + a server-side salt), truncated. The raw IP is
// never stored, and without the salt the table cannot be turned back into addresses. Same person, same
// device, same network gives the same id, which is what "a profile" means here; a new network or a new
// device starts a new profile, which is the honest limit of doing this without cookies or consent.

const encoder = new TextEncoder();

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Buffer.from(digest).toString("hex");
}

export async function hashVisitor(ip: string, userAgent: string, language: string): Promise<string> {
  const salt = process.env.ANALYTICS_SALT ?? "unsalted-development";
  return (await sha256(`${ip}|${userAgent}|${language}|${salt}`)).slice(0, 40);
}

export interface Agent { device: "desktop" | "mobile" | "tablet" | "bot"; os: string; browser: string; isBot: boolean }

const BOTS = /bot|crawler|spider|crawl|slurp|bing|yandex|duckduck|baidu|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|discord|preview|lighthouse|headless|monitor|uptime|curl|wget|python-requests|axios|node-fetch|go-http/i;

/** Enough of a user-agent parse for a dashboard, without shipping a 200 kB database of them. */
export function parseAgent(ua: string): Agent {
  if (!ua || BOTS.test(ua)) return { device: "bot", os: "", browser: "", isBot: true };
  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  const mobile = !tablet && /mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua);
  const os =
    /windows nt 10/i.test(ua) ? "Windows" :
    /windows/i.test(ua) ? "Windows" :
    /iphone|ipad|ipod/i.test(ua) ? "iOS" :
    /mac os x/i.test(ua) ? "macOS" :
    /android/i.test(ua) ? "Android" :
    /cros/i.test(ua) ? "ChromeOS" :
    /linux/i.test(ua) ? "Linux" : "";
  const browser =
    /edg\//i.test(ua) ? "Edge" :
    /opr\/|opera/i.test(ua) ? "Opera" :
    /brave/i.test(ua) ? "Brave" :
    /chrome\//i.test(ua) && !/chromium/i.test(ua) ? "Chrome" :
    /chromium/i.test(ua) ? "Chromium" :
    /firefox\//i.test(ua) ? "Firefox" :
    /safari\//i.test(ua) ? "Safari" : "";
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", os, browser, isBot: false };
}

/** Vercel adds these; locally they are simply absent. */
export interface GeoHint { country: string; region: string; city: string }
export function geoFrom(get: (name: string) => string | null): GeoHint {
  const dec = (v: string | null): string => { if (!v) return ""; try { return decodeURIComponent(v); } catch { return v; } };
  return {
    country: dec(get("x-vercel-ip-country")),
    region: dec(get("x-vercel-ip-country-region")),
    city: dec(get("x-vercel-ip-city")),
  };
}

export function clientIp(get: (name: string) => string | null): string {
  const fwd = get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? get("x-real-ip") ?? "";
}

// ── me, and things that are not people ──────────────────

/** Set by the admin login so my own browsing never reaches /api/track at all. */
export const NO_TRACK_COOKIE = "wosmo_no_track";

/**
 * ADMIN_VISITOR_HASHES is a comma-separated list of visitor-id prefixes. A prefix rather than a whole
 * id because the id changes with the network: the first 12 characters of the hash of one laptop on one
 * network are enough to name it, and pasting a short prefix from the dashboard is a one-off job.
 */
export function isAllowListedOwner(visitorId: string): boolean {
  const raw = process.env.ADMIN_VISITOR_HASHES;
  if (!raw) return false;
  for (const entry of raw.split(",")) {
    const prefix = entry.trim().toLowerCase();
    // a prefix under 6 characters would match a large slice of the table, so it is ignored
    if (prefix.length >= 6 && visitorId.startsWith(prefix)) return true;
  }
  return false;
}

/** Loopback, link-local and the RFC1918 ranges — plus the empty string, which is what localhost gives. */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  return /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd)/i.test(ip);
}

export interface AutomationHint {
  /** navigator.webdriver, as reported by the page. */
  webdriver?: boolean;
}

/**
 * Cheap headless/automation heuristic, for clients whose user agent is not on the crawler list. None of
 * these is proof on its own, so two independent signals are required before a visitor is called scripted;
 * real browsers behind privacy extensions routinely trip exactly one of them.
 */
export function looksAutomated(get: (name: string) => string | null, hint: AutomationHint = {}): boolean {
  const ua = get("user-agent") ?? "";
  let marks = 0;
  if (hint.webdriver === true) marks += 2;                                  // decisive on its own
  if (/headless|electron|phantom|puppeteer|playwright|selenium|cypress/i.test(ua)) marks += 2;
  if (!ua || ua.length < 24) marks += 1;                                    // no real browser is this terse
  if (!get("accept-language")) marks += 1;                                  // every browser sends one
  if (!get("accept")) marks += 1;
  // a Chromium user agent without client hints is usually a spoofed one
  if (/chrome\/\d/i.test(ua) && !get("sec-ch-ua")) marks += 1;
  return marks >= 2;
}
