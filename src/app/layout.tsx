import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Tracker from "@/components/Tracker";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { person, SITE_URL } from "@/data/portfolio";
import "./globals.css";

const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#050508" };

const TITLE = `${person.name} — Software Engineer · Go · Next.js · Systems`;
const DESCRIPTION = person.metaDescription;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s — ${person.name}` },
  description: DESCRIPTION,
  applicationName: "wosmo",
  authors: [{ name: person.name, url: SITE_URL }],
  creator: person.name,
  keywords: ["Wasif Malik", "Software Engineer", "Go", "Golang", "Next.js", "React", "TypeScript", "Systems", "Karachi", "Remote"],
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], shortcut: "/favicon.ico", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  category: "technology",
  formatDetection: { telephone: true, email: true, address: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: { type: "website", locale: "en_US", url: SITE_URL, siteName: "wosmo", title: TITLE, description: DESCRIPTION },
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
