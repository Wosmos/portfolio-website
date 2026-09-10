// Three knocks on the footer wordmark ask for the panel's URL. This hands back the secret segment, so
// it is not a secret from anyone who finds the knock — the password is the gate. It exists so the owner
// never has to keep the path in a bookmark, and it is throttled so it cannot be swept for.

import { knocks, requestSource, adminBase } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(): Promise<Response> {
  try {
    const who = await requestSource();
    if (knocks.blocked(who)) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: NO_STORE });
    knocks.note(who);

    const path = adminBase();
    if (path === null) return Response.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
    return Response.json({ path }, { status: 200, headers: NO_STORE });
  } catch (e) {
    console.error("[admin] knock", e instanceof Error ? e.message : e);
    return Response.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  }
}
