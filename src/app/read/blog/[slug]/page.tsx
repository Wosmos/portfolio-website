import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/data/portfolio";
import { getPerson, getPosts } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { clampDescription, OG_SIZE } from "@/lib/seo";
import { pad2 } from "@/lib/text";
import PostMeta from "@/components/read/PostMeta";

// No window: the page is rebuilt when a save or the publish button says so, not on a timer.
export const revalidate = false;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = (await getPosts()).find((p) => p.slug === slug);
  if (!post) return { title: "Post not found", robots: { index: false } };
  const description = clampDescription(post.excerpt);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/read/blog/${post.slug}` },
    openGraph: {
      url: `/read/blog/${post.slug}`,
      title: post.title,
      description,
      type: "article",
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.tags.length ? { tags: [...post.tags] } : {}),
      // naming `openGraph` replaces the parent's whole object, so the card has to be named here — the
      // post's own cover when it has one, the root brand card otherwise
      images: [{ url: post.coverImage || "/opengraph-image", ...OG_SIZE, alt: post.title }],
    },
    twitter: { card: "summary_large_image", title: post.title, description, images: [post.coverImage || "/opengraph-image"] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [posts, person] = await Promise.all([getPosts(), getPerson()]);
  const i = posts.findIndex((p) => p.slug === slug);
  const post = posts[i];
  if (!post) notFound();

  // posts arrive newest first, so the neighbour above is the newer one
  const newer = i > 0 ? posts[i - 1] : undefined;
  const older = posts[i + 1];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/read/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/read/blog/${post.slug}`,
    author: { "@type": "Person", name: person.fullName, url: SITE_URL },
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.coverImage ? { image: post.coverImage } : {}),
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
  };

  return (
    <article className="pj" style={{ marginTop: 0 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link className="back" href="/read/blog">← all posts</Link>

      <header>
        <p className="k">post {pad2(posts.length - i)} · {person.name}</p>
        <h1 style={{ marginTop: 12 }}><span className="name">{post.title}</span></h1>
        {post.excerpt && <p className="pj__tag">{post.excerpt}</p>}
        <div style={{ marginTop: 18 }}><PostMeta post={post} /></div>
      </header>

      {/* renderMarkdown escapes the source before adding any markup, so this is safe to inline */}
      <div className="prose post__body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />

      <nav className="pj__nav" aria-label="Other posts">
        {newer ? <Link href={`/read/blog/${newer.slug}`}>← {newer.title}</Link> : <span />}
        {older ? <Link href={`/read/blog/${older.slug}`}>{older.title} →</Link> : <span />}
      </nav>
    </article>
  );
}
