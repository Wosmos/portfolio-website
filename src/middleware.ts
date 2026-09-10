// The admin panel answers on /<ADMIN_PATH>/admin and is rewritten here to the real /admin routes, so
// no route file moves and the secret never appears in a bundle. A bare /admin is a 404.
//
// The session check and the segment lookup are duplicated from @/lib/auth on purpose: this file runs
// on the edge and importing that module would drag bcryptjs and the database client in with it. Only
// the HMAC verify is copied — the password, the audit and the cookie writing stay in one place.

import { NextResponse, type NextRequest } from "next/server";

const SESSION = "wosmo_admin";
const EXIT = "wosmo_admin_exit";
const DEV_SEGMENT = "admin-dev";
const encoder = new TextEncoder();
let warned = false;

function segment(): string | null {
  const raw = process.env.ADMIN_PATH?.trim();
  if (raw && /^[A-Za-z0-9._~-]{16,}$/.test(raw)) return raw;
  if (process.env.NODE_ENV === "production") {
    if (!warned) { warned = true; console.error("[admin] ADMIN_PATH is missing or too short; the panel is unreachable"); }
    return null;
  }
  if (!warned) { warned = true; console.warn(`[admin] ADMIN_PATH is not set; using /${DEV_SEGMENT}/admin in development`); }
  return DEV_SEGMENT;
}

/** btoa rather than Buffer: one fewer thing to assume about the edge runtime. */
function base64url(bytes: Uint8Array): string {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the named cookie carries a signature we made and an expiry still in the future. */
async function holds(request: NextRequest, name: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const raw = request.cookies.get(name)?.value;
  if (!raw) return false;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return false;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    if (!same(mac, base64url(new Uint8Array(signed)))) return false;
    const expires = Number(payload);
    return Number.isFinite(expires) && expires > Date.now();
  } catch {
    return false;
  }
}

function goTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

/** A rewrite to a path no route can serve, so Next answers with its own 404 page and status. */
function gone(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/not-found";
  url.search = "";
  return NextResponse.rewrite(url, { status: 404 });
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const secretSegment = segment();
  const base = secretSegment === null ? null : `/${secretSegment}/admin`;

  if (base !== null && (pathname === base || pathname.startsWith(`${base}/`))) {
    // trailing slashes go: they would rewrite onto /admin/ and bounce back out to the visible URL
    const rest = pathname.slice(base.length).replace(/\/+$/, "");
    const onLogin = rest === "/login";
    const signedIn = await holds(request, SESSION);
    // Gate here rather than in the pages: their redirect() targets are bare /admin paths, which the
    // branch below would 404, and the visitor would lose the secret prefix on the way.
    if (!signedIn && !onLogin) return goTo(request, `${base}/login`);
    if (signedIn && onLogin) return goTo(request, base);

    const url = request.nextUrl.clone();
    url.pathname = `/admin${rest}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("cache-control", "no-store");
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Anyone still holding a session, or who signed out in the last ten minutes, already knows the
    // password; sending them to the real URL costs nothing and keeps the dashboard's own hardcoded
    // /admin/login navigation working. Everyone else gets a 404.
    if (base !== null && ((await holds(request, SESSION)) || (await holds(request, EXIT)))) {
      return goTo(request, `${base}${pathname.slice("/admin".length).replace(/\/+$/, "")}`);
    }
    return gone(request);
  }

  return NextResponse.next();
}

// /api/admin/* is guarded by the session cookie, not by the secret segment, and must stay reachable
// from the panel — the second pattern brushes past it, which is why the body falls through to next().
export const config = {
  matcher: ["/admin", "/admin/:path*", "/:segment/admin", "/:segment/admin/:path*"],
};
