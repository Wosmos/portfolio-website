// Testimonials. `placeholder` marks a sample so the page can label it instead of passing it off as real.

import { schema as t } from "@/db/client";
import { build, createCrud, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parse: Parse<typeof t.testimonials> = (input, base) =>
  build(input, (f) => ({
    quote: f.text("quote", base?.quote, 2000),
    name: f.text("name", base?.name, 160),
    role: f.optText("role", base?.role ?? "", 160),
    company: f.optText("company", base?.company ?? "", 160),
    link: f.optText("link", base?.link ?? "", 400),
    avatar: f.optText("avatar", base?.avatar ?? "", 500),
    placeholder: f.bool("placeholder", base?.placeholder ?? false),
    visible: f.bool("visible", base?.visible ?? true),
    sortOrder: f.int("sortOrder", base?.sortOrder ?? 0, { min: 0, max: 9999 }),
  }));

const handlers = createCrud({
  name: "testimonial",
  table: t.testimonials,
  id: t.testimonials.id,
  order: t.testimonials.sortOrder,
  sort: t.testimonials.sortOrder,
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
