import About from '@/components/about';
import Contact from '@/components/contact';
import Experience from '@/components/experience';
import Intro from '@/components/intro';
import Projects from '@/components/projects';
import SectionDivider from '@/components/section-divider';
import Skills from '@/components/skills';
import Document, { Html, Head, Main, NextScript } from 'next/document';

import { InfiniteMovingCardsDemo } from '@/components/card';
export default function Home() {
  return (
    <main className='flex flex-col items-center px-4 smooth-scroll-delayed'>
      <Intro />
      <SectionDivider />
      <About />

      <Projects />
      <Skills />
      <Experience />
      {/* <InfiniteMovingCardsDemo /> */}
      <Contact />
    </main>
  );
}
