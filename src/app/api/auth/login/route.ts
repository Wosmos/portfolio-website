// The only way in. The password check, the throttle and the cookie all live in @/lib/auth; this maps
// its answer onto a status code and says nothing more than it has to.

import { login } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const say = (body: Record<string, unknown>, status: number): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  let username = "";
  let password = "";
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return say({ error: "Invalid JSON body" }, 400);
    const user: unknown = Reflect.get(body, "username");
    const pass: unknown = Reflect.get(body, "password");
    if (typeof user !== "string" || typeof pass !== "string") return say({ error: "A username and password are required" }, 400);
    username = user;
    password = pass;
  } catch {
    return say({ error: "Invalid JSON body" }, 400);
  }
  if (username === "" || password === "" || username.length > 200 || password.length > 400) {
    return say({ error: "A username and password are required" }, 400);
  }

  try {
    const result = await login(username, password);
    if (result === "ok") return say({ success: true }, 200);
    if (result === "throttled") return say({ error: "Too many attempts. Try again later." }, 429);
    if (result === "unconfigured") {
      console.error("[admin] login: ADMIN_USERNAME or ADMIN_PASSWORD_HASH is missing or malformed");
      return say({ error: "Admin access is not configured" }, 500);
    }
    return say({ error: "Wrong username or password" }, 401);
  } catch (e) {
    console.error("[admin] login", e instanceof Error ? e.message : e);
    return say({ error: "Could not sign in" }, 500);
  }
}
