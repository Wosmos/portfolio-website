import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/data/portfolio";
import { getPosts } from "@/lib/content";
import { OG_SIZE } from "@/lib/seo";
import { pad2 } from "@/lib/text";
import PostMeta from "@/components/read/PostMeta";

export const revalidate = 3600;

const DESCRIPTION = "Notes on Go, systems and shipping web software — what I built, and what it taught me.";

// an index with nothing on it is a thin page, so it stays out of the index until the first post ships
// (the sitemap makes the same call)
export async function generateMetadata(): Promise<Metadata> {
  const posts = await getPosts();
  return {
    title: "Blog",
    description: DESCRIPTION,
    alternates: { canonical: "/read/blog" },
    // naming `openGraph` replaces the parent's whole object, so the root brand card is repeated here —
    // see the same note in src/app/read/page.tsx
    openGraph: { url: "/read/blog", title: "Blog", description: DESCRIPTION, type: "website", images: [{ url: "/opengraph-image", ...OG_SIZE, alt: "Blog" }] },
    twitter: { card: "summary_large_image", title: "Blog", description: DESCRIPTION, images: ["/opengraph-image"] },
    ...(posts.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function BlogIndex() {
  const posts = await getPosts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Blog",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem", position: i + 1, name: p.title, description: p.excerpt, url: `${SITE_URL}/read/blog/${p.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero pj" style={{ marginTop: 0, gridTemplateColumns: "1fr" }}>
        <div>
          <p className="k">{posts.length ? `${pad2(posts.length)} posts · newest first` : "writing in progress"}</p>
          <h1 style={{ marginTop: 12 }}><span className="name">Blog</span></h1>
          <p className="hero__p">{DESCRIPTION}</p>
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        {posts.length === 0 ? (
          <p className="hero__p" style={{ marginTop: 0 }}>Nothing published yet. The first post is being written — until then, the <Link href="/read/projects">projects</Link> are the long version.</p>
        ) : (
          <ol className="posts">
            {posts.map((p) => (
              <li className="sf sf--thin card post" key={p.slug}>
                <Link className="sf__in" href={`/read/blog/${p.slug}`}>
                  <h2>{p.title}</h2>
                  {p.excerpt && <span className="post__ex">{p.excerpt}</span>}
                  <PostMeta post={p} />
                  <span className="post__go">read →</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
