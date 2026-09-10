// Writing. The body is markdown, capped so a paste accident cannot fill a row; publishing for the
// first time stamps publishedAt, and unpublishing leaves that date alone so it survives a round trip.

import { schema as t } from "@/db/client";
import { build, createCrud, type Parse } from "@/lib/admin-crud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 100_000;

const parse: Parse<typeof t.posts> = (input, base) =>
  build(input, (f) => {
    const published = f.bool("published", base?.published ?? false);
    const publishedAt = base?.publishedAt ?? null;
    return {
      slug: f.slug("slug", base?.slug),
      title: f.text("title", base?.title, 240),
      excerpt: f.optText("excerpt", base?.excerpt ?? "", 600),
      body: f.optText("body", base?.body ?? "", MAX_BODY),
      coverImage: f.optText("coverImage", base?.coverImage ?? "", 500),
      tags: f.list("tags", base?.tags ?? [], { count: 20, length: 40 }),
      readingMinutes: f.int("readingMinutes", base?.readingMinutes ?? 1, { min: 1, max: 999 }),
      published,
      publishedAt: published && publishedAt === null ? new Date() : publishedAt,
      updatedAt: new Date(),
    };
  });

const handlers = createCrud({
  name: "post",
  table: t.posts,
  id: t.posts.id,
  order: t.posts.createdAt,
  newestFirst: true,
  unique: { column: t.posts.slug, label: "slug", value: (row) => row.slug },
  parse,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
