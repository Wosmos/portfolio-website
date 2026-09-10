// Drops the session cookie. Always succeeds, so the client can call it blind.

import { logout } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    await logout();
  } catch (e) {
    console.error("[admin] logout", e instanceof Error ? e.message : e);
  }
  return Response.json({ success: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
