import type { MetadataRoute } from "next";
import { projects, SITE_URL } from "@/data/portfolio";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/read`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/read/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...projects.map((p) => ({ url: `${SITE_URL}/read/projects/${p.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/read/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/ship`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
