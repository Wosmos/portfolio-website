// The one profile row: the name, the contact details, the summary and the résumé link.

import { schema as t } from "@/db/client";
import { build, createSingleton, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parse: Parse<typeof t.profile> = (input, base) =>
  build(input, (f) => ({
    name: f.text("name", base?.name, 120),
    fullName: f.text("fullName", base?.fullName, 160),
    role: f.text("role", base?.role, 120),
    line: f.text("line", base?.line, 200),
    positioning: f.text("positioning", base?.positioning, 800),
    summary: f.text("summary", base?.summary, 4000),
    metaDescription: f.text("metaDescription", base?.metaDescription, 320),
    location: f.text("location", base?.location, 120),
    tz: f.text("tz", base?.tz, 64),
    tzLabel: f.text("tzLabel", base?.tzLabel, 32),
    email: f.text("email", base?.email, 254),
    phone: f.optText("phone", base?.phone ?? "", 40),
    cv: f.optText("cv", base?.cv ?? "", 300),
    github: f.optText("github", base?.github ?? "", 300),
    linkedin: f.optText("linkedin", base?.linkedin ?? "", 300),
    hashnode: f.optText("hashnode", base?.hashnode ?? "", 300),
    npmCard: f.optText("npmCard", base?.npmCard ?? "", 120),
    availability: f.optText("availability", base?.availability ?? "", 80),
    updatedAt: new Date(),
  }));

const handlers = createSingleton({ name: "profile", table: t.profile, parse });
export const GET = handlers.GET;
export const PUT = handlers.PUT;
