// On-demand revalidation. Every admin write already drops the content cache through
// revalidateContent(), so this endpoint is for the cases a write cannot know about: a GitHub push the
// site should pick up early, one page that looks stale, or the "publish now" button.
//
// It is also the webhook target: a GitHub Action can POST here with REVALIDATE_SECRET instead of a
// session cookie, which is why the guard accepts either.

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CONTENT_KEYS, revalidateContent, revalidateKey, type ContentKey } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_PATHS: readonly string[] = ["/", "/read", "/read/projects", "/read/contact", "/read/blog", "/ship"];
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
  }

  return NextResponse.json({ ok: true, dropped, at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
