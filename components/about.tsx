'use client';
import React, { useState, useCallback, useMemo } from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import Socials from './socials';
import { socialIcons } from '@/lib/data';

export default function About() {
  const { ref } = useSectionInView('About');
  const [isExpanded, setIsExpanded] = useState(false);

  const content = useMemo(() => {
    const firstParagraph = `Crafting captivating digital experiences as a 3rd-year Software Engineering student. Specializing in React, Next.js, and venturing into React Native for mobile app development. Passionate about blending functionality with aesthetics to simplify lives through intuitive interfaces.`;

    const secondParagraph = `Beyond coding, I indulge in video editing, Photoshop artistry, and sci-fi novels. A stargazer at heart, forever in awe of the cosmic wonders. An introverted soul finding solace in quiet contemplation, yet always up for stimulating conversations over a cup of chai. Let's collaborate to weave code, creativity, and curiosity into unforgettable digital experiences. Reach out, and let's embark on this journey together.`;

    return {
      full: `${firstParagraph}\n\n${secondParagraph}`,
      truncated: `${firstParagraph.slice(0, 300)}${
        firstParagraph.length > 300 ? '...' : ''
      }`,
    };
  }, []);

  const toggleContent = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <motion.section
      ref={ref}
      className='mb-28 max-w-[45rem] text-center leading-8 sm:mb-40 scroll-mt-28'
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.175 }}
      id='about'
    >
      <SectionHeading>About me</SectionHeading>

      <div className='relative'>
        <div className='mb-3 whitespace-pre-wrap'>
          {/* Show full content on desktop, controlled content on mobile */}
          <div className='hidden sm:block'>{content.full}</div>
          <div className='block sm:hidden'>
            {isExpanded ? content.full : content.truncated}
          </div>
        </div>

        {/* Show button only on mobile when content is truncatable */}
        <button
          onClick={toggleContent}
          className='-mt-32 underline mb-4 sm:hidden text-blue-500 hover:text-blue-700 font-medium  transition-colors text-xs'
        >
          {isExpanded ? 'See Less' : 'See More'}
        </button>
      </div>

      <Socials socialIcons={socialIcons} showLines={true} />
    </motion.section>
  );
}



// import React, { useState } from 'react';
// import { motion } from 'framer-motion';
// import { useSectionInView } from '@/lib/hooks';
// import Socials from './socials';
// import Image from 'next/image';
// import * as Icons from 'react-icons/si';
// import SkillData from '@/lib/data/skills.json';

// const techStackData = [
//   {
//     name: 'HTML',
//     icon: Icons.SiHtml5,
//     proficiency: 'Advanced',
//     description: 'Semantic markup, accessibility, SEO best practices',
//   },
//   {
//     name: 'CSS',
//     icon: Icons.SiCss3,
//     proficiency: 'Advanced',
//     description: 'Advanced layouts, animations, responsive design',
//   },
//   {
//     name: 'Tailwind',
//     icon: Icons.SiTailwindcss,
//     proficiency: 'Advanced',
//     description: 'Utility-first CSS, custom configurations, responsive design',
//   },
//   {
//     name: 'Bootstrap',
//     icon: Icons.SiBootstrap,
//     proficiency: 'Intermediate',
//     description: 'Component library, responsive grid system',
//   },
//   {
//     name: 'MUI',
//     icon: Icons.SiMaterialdesign,
//     proficiency: 'Intermediate',
//     description: 'Material Design components, theming, customization',
//   },
//   {
//     name: 'JavaScript',
//     icon: Icons.SiJavascript,
//     proficiency: 'Advanced',
//     description: 'ES6+, async/await, DOM manipulation',
//   },
//   {
//     name: 'jQuery',
//     icon: Icons.SiJquery,
//     proficiency: 'Intermediate',
//     description: 'DOM manipulation, AJAX, event handling',
//   },
//   {
//     name: 'Framer Motion',
//     icon: Icons.SiFramer,
//     proficiency: 'Intermediate',
//     description: 'Animations, gestures, transitions',
//   },
//   {
//     name: 'React',
//     icon: Icons.SiReact,
//     proficiency: 'Advanced',
//     description: 'Hooks, context, custom hooks, performance optimization',
//   },
//   {
//     name: 'Redux',
//     icon: Icons.SiRedux,
//     proficiency: 'Advanced',
//     description: 'State management, middleware, Redux Toolkit',
//   },
//   {
//     name: 'Next.js',
//     icon: Icons.SiNextdotjs,
//     proficiency: 'Advanced',
//     description: 'App Router, SSR, SSG, API routes',
//   },
//   {
//     name: 'TypeScript',
//     icon: Icons.SiTypescript,
//     proficiency: 'Advanced',
//     description: 'Type systems, interfaces, generics',
//   },
//   {
//     name: 'Node.js',
//     icon: Icons.SiNodedotjs,
//     proficiency: 'Intermediate',
//     description: 'Express, REST APIs, server-side development',
//   },
//   {
//     name: 'Git',
//     icon: Icons.SiGit,
//     proficiency: 'Advanced',
//     description: 'Version control, branching strategies, collaboration',
//   },
//   {
//     name: 'Appwrite',
//     icon: Icons.SiAppwrite,
//     proficiency: 'Intermediate',
//     description: 'Backend as a service, authentication, database',
//   },
//   {
//     name: 'MongoDB',
//     icon: Icons.SiMongodb,
//     proficiency: 'Intermediate',
//     description: 'NoSQL database, CRUD operations, aggregation',
//   },
//   {
//     name: 'Express',
//     icon: Icons.SiExpress,
//     proficiency: 'Intermediate',
//     description: 'REST APIs, middleware, routing',
//   },
//   {
//     name: 'Flutter',
//     icon: Icons.SiFlutter,
//     proficiency: 'Beginner',
//     description: 'Cross-platform mobile development, widgets',
//   },
// ];
// import { socialIcons } from '@/lib/data';
// const About = () => {
//   const { ref } = useSectionInView('About');
//   const [expandedAbout, setExpandedAbout] = useState(false);

//   const aboutContent = {
//     short:
//       'Crafting captivating digital experiences as a 3rd-year Software Engineering student. Specializing in React, Next.js, and venturing into React Native for mobile development.',
//     full: `Crafting captivating digital experiences as a 3rd-year Software Engineering student. Specializing in React, Next.js, and venturing into React Native for mobile app development. Passionate about blending functionality with aesthetics to simplify lives through intuitive interfaces.

// Beyond coding, I indulge in video editing, Photoshop artistry, and sci-fi novels. A stargazer at heart, forever in awe of the cosmic wonders. An introverted soul finding solace in quiet contemplation, yet always up for stimulating conversations over a cup of chai.`,
//   };

//   const fadeInAnimationVariants = {
//     initial: { opacity: 0, y: 20 },
//     animate: (index) => ({
//       opacity: 1,
//       y: 0,
//       transition: { delay: 0.05 * index },
//     }),
//   };

//   return (
//     <section ref={ref} className='w-full max-w-7xl mx-auto px-4 py-12'>
//       <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
//         {/* About Me - Large Card */}
//         <motion.div
//           className='col-span-1 md:col-span-2 row-span-2 p-6 bg-white dark:bg-white/10 rounded-2xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group'
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//         >
//           <h3 className='text-2xl font-bold mb-4'>About Me</h3>
//           <div className='prose dark:prose-invert'>
//             <p className='text-gray-600 dark:text-gray-300'>
//               {expandedAbout ? aboutContent.full : aboutContent.short}
//             </p>
//             <button
//               onClick={() => setExpandedAbout(!expandedAbout)}
//               className='text-blue-500 hover:text-blue-600 mt-2 font-medium'
//             >
//               {expandedAbout ? 'Read Less' : 'Read More'}
//             </button>
//           </div>
//           <Socials className='mt-4' showLines={false} />
//           <div className='absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300' />
//         </motion.div>

//         {/* Skills Highlights */}
//         {SkillData.map((skill, index) => (
//           <motion.div
//             key={skill.title}
//             className='p-6 bg-white dark:bg-white/10 rounded-2xl shadow-lg hover:shadow-xl transition-all group'
//             variants={fadeInAnimationVariants}
//             initial='initial'
//             whileInView='animate'
//             viewport={{ once: true }}
//             custom={index}
//           >
//             <div className='flex items-center gap-4 mb-4'>
//               <Image
//                 src={skill.icon}
//                 width={40}
//                 height={40}
//                 alt={skill.title}
//                 className='dark:filter dark:brightness-90'
//               />
//               <h3 className='text-xl font-semibold'>{skill.title}</h3>
//             </div>
//             <p className='text-gray-600 dark:text-gray-300 text-sm'>
//               {skill.description}
//             </p>
//             <div className='absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300' />
//           </motion.div>
//         ))}

//         {/* Tech Stack Grid */}
//         <motion.div
//           className='col-span-1 md:col-span-2 p-6 bg-white dark:bg-white/10 rounded-2xl shadow-lg hover:shadow-xl transition-shadow'
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5, delay: 0.2 }}
//         >
//           <h3 className='text-2xl font-bold mb-4'>Tech Stack</h3>
//           <div className='grid grid-cols-3 sm:grid-cols-4 gap-3'>
//             {techStackData.map((tech, index) => {
//               const Icon = Icons[tech.icon];
//               return (
//                 <motion.div
//                   key={tech.name}
//                   className='group relative p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
//                   variants={fadeInAnimationVariants}
//                   initial='initial'
//                   whileInView='animate'
//                   viewport={{ once: true }}
//                   custom={index}
//                 >
//                   <div className='flex flex-col items-center gap-2'>
//                     <Icon className='w-8 h-8 text-gray-700 dark:text-gray-300' />
//                     <span className='text-sm font-medium'>{tech.name}</span>
//                   </div>

//                   {/* Tooltip */}
//                   <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap'>
//                     <div className='font-medium'>{tech.proficiency}</div>
//                     <div className='text-xs'>{tech.description}</div>
//                   </div>
//                 </motion.div>
//               );
//             })}
//           </div>
//         </motion.div>

//         {/* Featured Project Preview */}
//         <motion.div
//           className='col-span-1 md:col-span-2 lg:col-span-1 p-6 bg-white dark:bg-white/10 rounded-2xl shadow-lg hover:shadow-xl transition-shadow group'
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5, delay: 0.3 }}
//         >
//           <h3 className='text-2xl font-bold mb-4'>Featured Work</h3>
//           <div className='relative overflow-hidden rounded-lg'>
//             <Image
//               src='/api/placeholder/400/300'
//               alt='Featured project'
//               className='w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300'
//             />
//             <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity'>
//               <div className='absolute bottom-4 left-4 text-white'>
//                 <h4 className='font-semibold'>Latest Project</h4>
//                 <p className='text-sm'>View Details →</p>
//               </div>
//             </div>
//           </div>
//         </motion.div>
//       </div>
//     </section>
//   );
// };

// export default About;

