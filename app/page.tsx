import About from '@/components/about';
import Contact from '@/components/contact';
import Experience from '@/components/experience';
import Intro from '@/components/intro';
import Projects from '@/components/projects';
import SectionDivider from '@/components/section-divider';
import Skills from '@/components/skills';
import Blogs from '@/components/blogs';
import TechStack from '@/components/tech-stack';
import { Head } from 'next/document';
export default function Home() {
  return (
    <>
      <Head>
        <title>Wosmo | Front-end Developer Portfolio</title>
        <meta
          name='description'
          content='Wosmo (Muhammad Wasif Malik) is a skilled Front-end Developer with 2+ years of experience in building modern web applications using cutting-edge technologies.'
        />
        <meta
          name='keywords'
          content='Front-end Developer, Web Developer, React, JavaScript, HTML, CSS, Portfolio, Wosmo, Muhammad Wasif Malik'
        />
        <meta name='author' content='Muhammad Wasif Malik' />
        <meta name='robots' content='index, follow' />
        <meta property='og:type' content='website' />
        <meta property='og:url' content='https://wosmo.com'/>
        <meta property='og:title' content='Wosmo | Front-End Dev'/>
        <link rel='canonical' href='https://wosmo.com' />
        {/* Other head tags */}
      </Head>
      <main className='flex flex-col items-center px-4'>
        <Intro />
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
