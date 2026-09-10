import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/portfolio";

// Everything public is crawlable. The admin panel and the API are not, and both prefixes match by
// prefix, so `/admin/login` and `/api/track` are covered too. `/llms.txt` needs no rule of its own:
// it sits under the allowed root, and the sitemap below points crawlers at the pages themselves.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
