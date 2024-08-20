'use client';

import About from '@/components/about';
import Contact from '@/components/contact';
import Experience from '@/components/experience';
import Intro from '@/components/intro';
import Projects from '@/components/projects';
import SectionDivider from '@/components/section-divider';
import Skills from '@/components/skills';
import Blogs from '@/components/blogs';
import BackgroundColumns from '@/components/bg';
import TechStack from '@/components/tech-stack';
import SideBar from '@/components/sideBar';
export default function Home() {
  return (
    <>
      <main className='flex flex-col items-center px-4'>
        <Intro />
        {/* <SideBar/> */}
        <SectionDivider />
        <About />
        <Skills />
        <TechStack />
        <Projects />
        <Experience />
        <Blogs />
        <Contact />
      </main>
    </>
  );
}
