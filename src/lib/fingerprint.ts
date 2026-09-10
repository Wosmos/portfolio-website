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
