import Header from '@/components/header';
import './globals.css';
import { Inter } from 'next/font/google';
import ActiveSectionContextProvider from '@/context/active-section-context';
import Footer from '@/components/footer';
import ThemeSwitch from '@/components/theme-switch';
import ThemeContextProvider from '@/context/theme-context';
import { Toaster } from 'react-hot-toast';
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Wosmo | Portfolio',
  description:
    'Wasif aka Wosmo is a Front-end developer with 2+ years of experience.',
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
        <div className='bg-[#e2e2fb] absolute top-[-6rem] -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#7c0d75]'></div>

        <div className='bg-gradient-to-tl from-blue-300 via-purple-200 to-pink-300 absolute top-[-1rem] -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-tl dark:from-blue-100 dark:via-purple-900  dark:to-blue-900'></div>
        <ThemeContextProvider>
          <ActiveSectionContextProvider>
            <Header /> 
            {children}
            <Footer />
            <Toaster position='top-right' />
            <ThemeSwitch />
          </ActiveSectionContextProvider>
        </ThemeContextProvider>
        <div className='bg-[#8989f9d4] absolute bottom-0 -z-10 right-[11rem] h-[31.25rem] w-[31.25rem] rounded-full blur-[10rem] sm:w-[68.75rem] dark:bg-[#460556]'></div>
        <div className='absolute bg-gradient-to-br from-blue-300 via-purple-200 to-pink-300  bottom-0 right-0 -z-10 left-[-35rem] h-[31.25rem] w-[50rem] rounded-full blur-[15rem] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem] dark:bg-gradient-to-bl dark:from-blue-100 dark:via-purple-900  dark:to-blue-900'></div>
      </body>
    </html>
  );
}
