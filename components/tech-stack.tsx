'use client';

import React, { useMemo } from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import {
  SiHtml5,
  SiCss3,
  SiTailwindcss,
  SiBootstrap,
  SiMaterialdesign,
  SiJavascript,
  SiJquery,
  SiFramer,
  SiReact,
  SiRedux,
  SiNextdotjs,
  SiTypescript,
  SiNodedotjs,
  SiGit,
  SiAppwrite,
  SiMongodb,
  SiExpress,
  SiFlutter,
  
} from 'react-icons/si';

interface TechStackItem {
  name: string;
  icon: React.ElementType;
  proficiency: string;
  description: string;
}

const techStackData: TechStackItem[] = [
  {
    name: 'HTML',
    icon: SiHtml5,
    proficiency: 'Advanced',
    description: 'Semantic markup, accessibility, SEO best practices',
  },
  {
    name: 'CSS',
    icon: SiCss3,
    proficiency: 'Advanced',
    description: 'Advanced layouts, animations, responsive design',
  },
  {
    name: 'Tailwind',
    icon: SiTailwindcss,
    proficiency: 'Advanced',
    description: 'Utility-first CSS, custom configurations, responsive design',
  },
  {
    name: 'Bootstrap',
    icon: SiBootstrap,
    proficiency: 'Intermediate',
    description: 'Component library, responsive grid system',
  },
  {
    name: 'MUI',
    icon: SiMaterialdesign,
    proficiency: 'Intermediate',
    description: 'Material Design components, theming, customization',
  },
  {
    name: 'JavaScript',
    icon: SiJavascript,
    proficiency: 'Advanced',
    description: 'ES6+, async/await, DOM manipulation',
  },
  {
    name: 'jQuery',
    icon: SiJquery,
    proficiency: 'Intermediate',
    description: 'DOM manipulation, AJAX, event handling',
  },
  {
    name: 'Framer Motion',
    icon: SiFramer,
    proficiency: 'Intermediate',
    description: 'Animations, gestures, transitions',
  },
  {
    name: 'React',
    icon: SiReact,
    proficiency: 'Advanced',
    description: 'Hooks, context, custom hooks, performance optimization',
  },
  {
    name: 'Redux',
    icon: SiRedux,
    proficiency: 'Advanced',
    description: 'State management, middleware, Redux Toolkit',
  },
  {
    name: 'Next.js',
    icon: SiNextdotjs,
    proficiency: 'Advanced',
    description: 'App Router, SSR, SSG, API routes',
  },
  {
    name: 'TypeScript',
    icon: SiTypescript,
    proficiency: 'Advanced',
    description: 'Type systems, interfaces, generics',
  },
  {
    name: 'Node.js',
    icon: SiNodedotjs,
    proficiency: 'Intermediate',
    description: 'Express, REST APIs, server-side development',
  },
  {
    name: 'Git',
    icon: SiGit,
    proficiency: 'Advanced',
    description: 'Version control, branching strategies, collaboration',
  },
  {
    name: 'Appwrite',
    icon: SiAppwrite,
    proficiency: 'Intermediate',
    description: 'Backend as a service, authentication, database',
  },
  {
    name: 'MongoDB',
    icon: SiMongodb,
    proficiency: 'Intermediate',
    description: 'NoSQL database, CRUD operations, aggregation',
  },
  {
    name: 'Express',
    icon: SiExpress,
    proficiency: 'Intermediate',
    description: 'REST APIs, middleware, routing',
  },
  {
    name: 'Flutter',
    icon: SiFlutter,
    proficiency: 'Beginner',
    description: 'Cross-platform mobile development, widgets',
  },
];

const TechStack = () => {
  const { ref } = useSectionInView('TechStack');

  const fadeInAnimationVariants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        y: 100,
      },
      animate: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: 0.05 * index,
        },
      }),
    }),
    []
  );

  return (
    <section
      id='techStack'
      ref={ref}
      className='max-w-[53rem] scroll-mt-28 text-center sm:mb-40 mb-28'
    >
      <SectionHeading>Tech Stack</SectionHeading>
      <ul className='flex flex-wrap justify-center gap-2 text-sm md:text-lg text-gray-800'>
        {techStackData.map((skill, index) => (
          <motion.li
            className='group relative'
            key={skill.name}
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{
              once: true,
            }}
            custom={index}
          >
            <div className='shadow-black/10 shadow-sm transition-all hover:shadow-2xl bg-white borderBlack rounded-md md:rounded-xl px-3 py-2 md:px-5 md:py-3 dark:bg-white/10 dark:text-white/80 cursor-pointer'>
              <div className='flex items-center gap-2'>
                {/* Icon - hidden on mobile */}
                <skill.icon className='hidden sm:block w-5 h-5' />
                {/* Name */}
                <span className='relative'>{skill.name}</span>
                <motion.span className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100' />
              </div>
            </div>

            {/* Tooltip */}
            <div className='absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+10px)] top-0 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-10'>
              <div className='bg-blue-50 dark:bg-gray-900 dark:text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-[200px] sm:max-w-none whitespace-normal sm:whitespace-nowrap  '>
                <div className='font-medium text-blue-400'>
                  {skill.proficiency}
                </div>
                <div className='text-xs'>{skill.description}</div>

                {/* Tooltip arrow */}
                <div className='absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[calc(100%-2px)] border-8 border-transparent border-t-blue-50 dark:border-t-gray-900' />
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
      <div className='h-2 md:h-4' />
    </section>
  );
};

export default TechStack;
