// Skill groups — one row per heading, with the items under it.

import { schema as t } from "@/db/client";
import { FOLD, build, createCrud, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parse: Parse<typeof t.skillGroups> = (input, base) =>
  build(input, (f) => ({
    group: f.text("group", base?.group, 120),
    items: f.list("items", base?.items ?? [], { count: 60, length: 80 }),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "skill group",
  table: t.skillGroups,
  id: t.skillGroups.id,
  order: t.skillGroups.sortOrder,
  sort: t.skillGroups.sortOrder,
  keys: [{
    parts: [{ column: t.skillGroups.group, value: (row) => row.group, compare: FOLD }],
    message: (existing) => `there is already a group called ${existing.group}`,
  }],
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
