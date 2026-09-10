// The lines the flight deck whispers when a visitor finds a secret. `kind` groups them so the cockpit
// can pick a fitting one: space trivia, a note about the pilot, or something entirely unfiled.

import { schema as t } from "@/db/client";
import { FOLD, build, createCrud, reject, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: readonly string[] = ["space", "me", "random"];

const parse: Parse<typeof t.eggFacts> = (input, base) =>
  build(input, (f) => ({
    kind: f.of("kind", base?.kind ?? "random", (v, k) => {
      if (typeof v !== "string" || !KINDS.includes(v)) reject(`${k} must be space, me or random`);
      return v;
    }),
    text: f.text("text", base?.text, 400),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "fact",
  table: t.eggFacts,
  id: t.eggFacts.id,
  order: t.eggFacts.sortOrder,
  sort: t.eggFacts.sortOrder,
  keys: [{
    parts: [{ column: t.eggFacts.text, value: (row) => row.text, compare: FOLD }],
    message: () => "that line is already in the pool",
  }],
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
