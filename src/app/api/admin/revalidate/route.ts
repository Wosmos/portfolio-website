// On-demand revalidation. Nothing on this site expires on a timer any more — the content cache, the
// GitHub reads and every rendered page are all cached until something says otherwise — so this
// endpoint is the only thing that makes the public site catch up, alongside the write-time
// revalidateContent() an admin save already does.
//
// It is also the webhook target: a GitHub Action can POST here with REVALIDATE_SECRET instead of a
// session cookie, which is why the guard accepts either.

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CONTENT_KEYS, revalidateContent, revalidateKey, type ContentKey } from "@/lib/content";
import { GITHUB_TAG } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_PATHS: readonly string[] = ["/", "/read", "/read/projects", "/read/contact", "/read/blog", "/ship"];
/**
 * The dynamic routes, rebuilt as whole segments. Listing "/read/projects" does not reach
 * "/read/projects/zcrypt" — with no expiry left anywhere, a project page that is not named here would
 * keep its first render for good.
 */
const PUBLIC_SEGMENTS: readonly string[] = ["/read/projects/[slug]", "/read/blog/[slug]"];
const isKey = (v: string): v is ContentKey => (CONTENT_KEYS as readonly string[]).includes(v);

/** A path we are willing to rebuild: our own routes only, never a caller-supplied URL. */
function safePath(path: string): string | null {
  if (!path.startsWith("/") || path.includes("..") || path.includes("//")) return null;
  if (path.length > 120) return null;
  return /^\/(read|ship)?[a-z0-9\-/]*$/.test(path) ? path : null;
}

function signedIn(request: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const sent = request.headers.get("x-revalidate-secret") ?? "";
  // fixed-length compare; both sides are short, so a plain loop is enough
  if (sent.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= sent.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!signedIn(request)) {
    const denied = await requireAdmin();
    if (denied) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let body: unknown = null;
  try { body = await request.json(); } catch { body = null; }
  const input = typeof body === "object" && body !== null ? body : {};
  const keyRaw = Reflect.get(input, "key");
  const pathRaw = Reflect.get(input, "path");

  const dropped: string[] = [];

  if (typeof keyRaw === "string" && isKey(keyRaw)) {
    revalidateKey(keyRaw);
    dropped.push(`content:${keyRaw}`);
  } else {
    revalidateContent();
    dropped.push("content");
  }

  if (typeof pathRaw === "string") {
    const path = safePath(pathRaw);
    if (!path) return NextResponse.json({ error: "That path cannot be revalidated" }, { status: 400 });
    revalidatePath(path);
    dropped.push(path);
  } else {
    for (const path of PUBLIC_PATHS) { revalidatePath(path); dropped.push(path); }
    for (const seg of PUBLIC_SEGMENTS) { revalidatePath(seg, "page"); dropped.push(seg); }
    // the language splits, the readmes and the repo facts come from github and are cached the same way
    revalidateTag(GITHUB_TAG, "max");
    dropped.push("github");
  }

  return NextResponse.json({ ok: true, dropped, at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
