// Roles. Dates are "YYYY-MM" strings and `end` is null while the role is current.

import { schema as t } from "@/db/client";
import { build, createCrud, reject, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const month = (value: unknown, key: string): string => {
  if (typeof value !== "string" || !MONTH.test(value)) reject(`${key} must be a month like 2025-04`);
  return value;
};
const monthOrNull = (value: unknown, key: string): string | null => (value === null || value === "" ? null : month(value, key));

const parse: Parse<typeof t.experience> = (input, base) =>
  build(input, (f) => ({
    company: f.text("company", base?.company, 160),
    title: f.text("title", base?.title, 160),
    location: f.optText("location", base?.location ?? "", 160),
    start: f.of("start", base?.start, month),
    end: f.of("end", base?.end ?? null, monthOrNull),
    note: f.optText("note", base?.note ?? "", 600),
    bullets: f.list("bullets", base?.bullets ?? [], { count: 24, length: 600 }),
    stack: f.list("stack", base?.stack ?? [], { count: 40, length: 60 }),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "role",
  table: t.experience,
  id: t.experience.id,
  order: t.experience.sortOrder,
  sort: t.experience.sortOrder,
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
