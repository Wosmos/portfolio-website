// Education. `start` and `end` are free text here because the résumé prints them verbatim.

import { schema as t } from "@/db/client";
import { FOLD, build, createCrud, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parse: Parse<typeof t.education> = (input, base) =>
  build(input, (f) => ({
    school: f.text("school", base?.school, 200),
    degree: f.text("degree", base?.degree, 200),
    start: f.text("start", base?.start, 40),
    end: f.text("end", base?.end, 40),
    grade: f.optText("grade", base?.grade ?? "", 80),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "education entry",
  table: t.education,
  id: t.education.id,
  order: t.education.sortOrder,
  sort: t.education.sortOrder,
  keys: [{
    parts: [
      { column: t.education.school, value: (row) => row.school, compare: FOLD },
      { column: t.education.degree, value: (row) => row.degree, compare: FOLD },
    ],
    message: (existing) => `${existing.degree} at ${existing.school} is already listed`,
  }],
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
