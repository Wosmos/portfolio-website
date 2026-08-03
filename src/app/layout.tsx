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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00d4ff',
};

export const metadata: Metadata = {
  title: "Wasif Malik | Software Engineer",
  description: "Wasif Malik — Software Engineer building production web applications and systems-level software end-to-end: concurrent Go backends, modern Next.js frontends, and security-first architecture.",
  icons: {
    icon: '/icon.svg',
  },
  keywords: ["Wasif Malik", "Software Engineer", "Go", "Golang", "Next.js", "React", "TypeScript", "Full Stack Developer"],
  authors: [{ name: "Wasif Malik" }],
  creator: "Wasif Malik",
  publisher: "Wasif Malik",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Wasif Malik | Software Engineer",
    description: "Software Engineer building production web apps and systems-level software — Go backends, Next.js frontends, and security-first architecture.",
    type: "website",
    locale: "en_US",
    siteName: "Wasif Malik Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wasif Malik | Software Engineer",
    description: "Software Engineer building production web apps and systems-level software — Go backends, Next.js frontends, and security-first architecture.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
