import type { MetadataRoute } from "next";
import { person } from "@/data/portfolio";
import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/read",
    name: `${person.name} — Software Engineer`,
    short_name: SITE_NAME,
    description: person.positioning,
    lang: "en",
    // installing lands on the reading site, not the gate: an installed app should not ask again
    start_url: "/read",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#050508",
    theme_color: "#050508",
    categories: ["portfolio", "technology"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
