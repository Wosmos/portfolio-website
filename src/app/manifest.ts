import type { MetadataRoute } from "next";
import { person } from "@/data/portfolio";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${person.name} — Software Engineer`,
    short_name: "wosmo",
    description: person.positioning,
    start_url: "/read",
    display: "standalone",
    background_color: "#050508",
    theme_color: "#050508",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
  };
}
