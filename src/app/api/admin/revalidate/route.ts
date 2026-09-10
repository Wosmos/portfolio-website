// Drops the content cache so the public pages rebuild on their next request. Used by the admin's
// "clear the cache" button after an edit that touched something the readers cache.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidateContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  revalidateContent();
  return NextResponse.json({ ok: true });
}
