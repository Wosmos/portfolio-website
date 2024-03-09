'use client';
import { LuGraduationCap } from 'react-icons/lu';
import {
  FaHtml5,
  FaReact,
  FaNodeJs,
  FaPython,
  FaGitAlt,
  FaBootstrap,
  FaCss3Alt,
} from 'react-icons/fa';

import moviesAppImage from '@/public/corpcomment.png';
import bankingAppImage from '@/public/rmtdev.png';
import landingPageImage from '@/public/wordanalytics.png';
import { IoLogoJavascript } from 'react-icons/io5';
import { BiLogoTypescript, BiLogoMongodb } from 'react-icons/bi';
import { TbBrandFramerMotion, TbBrandNextjs } from 'react-icons/tb';
import { SiTailwindcss, SiRedux, SiAppwrite } from 'react-icons/si';
import React from 'react';
import SectionHeading from './section-heading';
import { projectsData } from '@/lib/data';
import Project from './project';
import { useSectionInView } from '@/lib/hooks';

export default function Projects() {
  const { ref } = useSectionInView('Projects', 0.5);

  return (
    <section ref={ref} id='projects' className='scroll-mt-28 mb-28 '>
      <SectionHeading>My projects</SectionHeading>
      <div>
        {projectsData.map((project, index) => (
          <React.Fragment key={index}>
            <Project {...project} />
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
