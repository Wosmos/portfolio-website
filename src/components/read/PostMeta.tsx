// The date / reading time / tags line, shared by the blog index and the article header. Inline
// elements only, because the index renders it inside the card's link.

import type { Post } from "@/lib/content";

/** Fixed locale and time zone, so a revalidation never renders a different string than the build. */
export function postDate(iso: string | null): string {
  if (!iso) return "unpublished";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function PostMeta({ post }: { post: Post }) {
  return (
    <span className="post__meta">
      {post.publishedAt ? <time dateTime={post.publishedAt}>{postDate(post.publishedAt)}</time> : <span>{postDate(null)}</span>}
      <span>{post.readingMinutes} min read</span>
      {post.tags.map((t) => <em key={t}>#{t}</em>)}
    </span>
  );
}
