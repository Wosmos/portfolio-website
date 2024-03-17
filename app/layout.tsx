import Header from '@/components/header';
import './globals.css';
import { Inter } from 'next/font/google';
import ActiveSectionContextProvider from '@/context/active-section-context';
import Footer from '@/components/footer';
import ThemeSwitch from '@/components/theme-switch';
import ThemeContextProvider from '@/context/theme-context';
import { Toaster } from 'react-hot-toast';
import {
  BluePinkGradient,
  BluePurpleGradient,
  LightDarkGradient,
  DarkLightGradient,
  LightPurpleGradient,
  BluePinkDiagonalGradient,
} from '@/components/gradient';
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Wosmo | Front-end Developer Portfolio',
  description:
    'Wosmo (Muhammad Wasif Malik) is a skilled Front-end Developer with 2+ years of experience in building modern web applications using cutting-edge technologies.',
  keywords:
    'Front-end Developer, Web Developer, React, JavaScript, HTML, CSS, Portfolio, Wosmo, Muhammad Wasif Malik',
  author: 'Muhammad Wasif Malik',
  robots: 'index, follow',
  canonical: 'https://wosmo.com', // Replace with your actual domain once purchased
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Wosmo | Front-end Developer Portfolio',
    description:
      'Wosmo (Muhammad Wasif Malik) is a skilled Front-end Developer with 2+ years of experience in building modern web applications using cutting-edge technologies.',
    url: 'https://wosmo.com', // Replace with your actual domain once purchased
    siteName: 'Wosfolio',
    images: [
      {
        url: 'https://your-website.com/og-image.jpg', // Replace with your open graph image URL
        width: 1200,
        height: 630,
        alt: 'Wosmo Front-end Developer Portfolio',
      },
    ],
    locale: 'en-US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wosmo | Front-end Developer Portfolio',
    description:
      'Wosmo (Muhammad Wasif Malik) is a skilled Front-end Developer with 2+ years of experience in building modern web applications using cutting-edge technologies.',
    site: '@your-twitter-handle', // Replace with your Twitter handle
    creator: '@your-twitter-handle', // Replace with your Twitter handle
    images: ['https://your-website.com/twitter-card.jpg'], // Replace with your Twitter card image URL
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='!scroll-smooth'>
      <body
        className={`${inter.className} bg-blue-50/95 text-gray-950 relative pt-28 sm:pt-36 dark:bg-[#0d031a] dark:text-gray-50 dark:text-opacity-90`}
      >
        <BluePinkGradient />
        <BluePurpleGradient />
        <LightDarkGradient />
        <ThemeContextProvider>
          <ActiveSectionContextProvider>
            <Header />
            {children}
            <Footer />
            <Toaster position='top-right' />
            <ThemeSwitch />
          </ActiveSectionContextProvider>
        </ThemeContextProvider>
        <LightPurpleGradient />
        <BluePinkDiagonalGradient />
      </body>
    </html>
  );
}
