import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Tracker from "@/components/Tracker";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { person, SITE_URL } from "@/data/portfolio";
import { clampDescription, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#050508" };

const TITLE = `${person.name} — Software Engineer · Go · Next.js · Systems`;
const DESCRIPTION = clampDescription(person.metaDescription);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s — ${person.name}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: person.name, url: SITE_URL }],
  creator: person.name,
  keywords: ["Wasif Malik", "Software Engineer", "Go", "Golang", "Next.js", "React", "TypeScript", "Systems", "Karachi", "Remote"],
  // no canonical here on purpose — every page sets its own, and an inherited "/" would be wrong.
  // The plain-text map is advertised so a model crawler can find it without guessing.
  alternates: { types: { "text/plain": "/llms.txt" } },
  // the W on its dark tile, so a tab, a bookmark and an iOS home screen all show the trademark
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }, { url: "/favicon.ico", sizes: "48x48" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  category: "technology",
  formatDetection: { telephone: true, email: true, address: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // no `images` here on purpose: the opengraph-image files fill them in, and a nested one
  // (a project, the deck) then overrides the brand card for its own route
  openGraph: { type: "website", locale: "en_US", url: SITE_URL, siteName: SITE_NAME, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={mono.variable}>
      <body>
        {children}
        <Tracker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
