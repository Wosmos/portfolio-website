'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { techStack } from '@/lib/data';
import { useSectionInView } from '@/lib/hooks';

const TechStack = () => {
    const { ref } = useSectionInView('TechStack');
  const fadeInAnimationVariants = {
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
  };

  return (
    <section id='techStack' ref={ref} className='max-w-[53rem] scroll-mt-28 text-center sm:mb-40'>
      <SectionHeading>Tech Stack</SectionHeading>
      <ul className='flex flex-wrap justify-center gap-2 text-lg text-gray-800 '>
        {techStack.map((skill, index) => (
          <motion.li
            className='shadow-black/10 shadow-sm transition-all hover:shadow-2xl relative bg-white borderBlack rounded-xl px-5 py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer'
            key={index}
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{
              once: true,
            }}
            custom={index}
          >
            {skill}
            <motion.span className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100' />
          </motion.li>
        ))}
      </ul>
    </section>
  );
};

export default TechStack;
