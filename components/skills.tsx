'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { skillsData } from '@/lib/data';
import { useSectionInView } from '@/lib/hooks';
import { motion } from 'framer-motion';
import Image from 'next/image';
import uiux from '../public/serv-img/1.png';
import web from '../public/serv-img/2.png';
import app from '../public/serv-img/3.png';
import wp from '../public/serv-img/4.png';
import { BiBrightness } from 'react-icons/bi';

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

export default function Skills() {
  const { ref } = useSectionInView('Skills');
  const data = [
    {
      id: 1,
      src: uiux,
      title: 'Sample Title 1',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eum minima placeat consequatur quis. Eveniet, eius dolor temporibus vero inventore possimus.',
    },
    {
      id: 2,
      src: web,
      title: 'Sample Title 2',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eum minima placeat consequatur quis. Eveniet, eius dolor temporibus vero inventore possimus.',
    },
    {
      id: 3,
      src: app,
      title: 'Sample Title 3',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eum minima placeat consequatur quis. Eveniet, eius dolor temporibus vero inventore possimus.',
    },
    {
      id: 4,
      src: wp,
      title: 'Sample Title 4',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eum minima placeat consequatur quis. Eveniet, eius dolor temporibus vero inventore possimus.',
    },
  ];
  return (
    <section
      id='skills'
      ref={ref}
      className='mb-28 max-w-[53rem] scroll-mt-28 text-center sm:mb-40'
    >
      <SectionHeading>Tech Stack</SectionHeading>

      <ul className='flex flex-wrap justify-center gap-2 text-lg text-gray-800 mb-16'>
        {skillsData.map((skill, index) => (
          <motion.li
            className='relative bg-white borderBlack rounded-xl px-5 py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer'
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
      <SectionHeading>My Skills</SectionHeading>

      <div className='grid w-full grid-cols-1 gap-4 mx-auto mt-32 sm:mt-0 sm:grid-cols-2 lg:gap-3 my-4'>
        {data.map((item, index) => (
          <motion.div
            key={item.id}
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{
              once: true,
            }}
            className={`relative flex flex-col items-start gap-4 duration-700 group md:gap-8 px-8 pt-16 pb-4 bg-white/20 borderBlack rounded-xl py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer ${
              index === data.length - 1 && data.length % 2 !== 0
                ? 'sm:col-span-2'
                : ''
            }`}
          >
            <img
              width='80'
              height='80'
              src={item.src.src}
              alt='web'
              className='dark:filter-none filter invert brightness-100 -mt-10 -mb-5'
            />
            <div className='relative flex flex-col items-start'>
              <h1 className='text-2xl font-semibold'>{item.title}</h1>
              <p className='mt-2 leading-relaxed text-gray-700 dark:text-white/70 text-left'>
                {item.description}
              </p>
            </div>
            <div className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100' />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
