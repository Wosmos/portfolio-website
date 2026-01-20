import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Viewport configuration (separate export as required by Next.js 14+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#00d4ff",
};

export const metadata: Metadata = {
  title: "Wasif Malik | Cosmic Engineer",
  description:
    "Wasif Malik - Full Stack Engineer crafting digital experiences with Next.js, Flutter, and AI. Building the future, one line of code at a time.",
  keywords: [
    "Wasif Malik",
    "Software Engineer",
    "Next.js",
    "Flutter",
    "React",
    "AI",
    "Full Stack Developer",
  ],
  authors: [{ name: "Wasif Malik" }],
  creator: "Wasif Malik",
  publisher: "Wasif Malik",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      "index": true,
      "follow": true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Wasif Malik | Cosmic Engineer",
    description:
      "Building scalable digital ecosystems with cutting-edge technology",
    type: "website",
    locale: "en_US",
    siteName: "Wasif Malik Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wasif Malik | Cosmic Engineer",
    description:
      "Building scalable digital ecosystems with cutting-edge technology",
  },
  metadataBase: new URL("https://wosmo.vercel.app"),
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} ${jetbrainsMono.variable} antialiased selection:bg-indigo-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
