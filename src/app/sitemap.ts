import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/portfolio";
import { getPosts, getProjects } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/read`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/read/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...projects.map((p) => ({ url: `${SITE_URL}/read/projects/${p.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    // the blog index is only worth listing once something is published
    ...(posts.length ? [{ url: `${SITE_URL}/read/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    ...posts.map((p) => ({
      url: `${SITE_URL}/read/blog/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/read/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/ship`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
