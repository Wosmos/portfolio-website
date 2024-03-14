'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { techStack } from '@/lib/data';
import { useSectionInView } from '@/lib/hooks';
import { motion } from 'framer-motion';
import { Skilldata } from '@/lib/data';
import Image from 'next/image';

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

  return (
    <section
      id='skills'
      ref={ref}
      className=' max-w-[53rem] scroll-mt-28 text-center sm:mb-40'
    >
      <SectionHeading>My Skills</SectionHeading>

      <div className='grid w-full grid-cols-1 gap-4 mx-auto mt-32 sm:mt-0 sm:grid-cols-2 lg:gap-3 my-4  '>
        {Skilldata.map((item, index) => (
          <motion.div
            key={item.id}
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{
              once: true,
            }}
            className={`relative flex flex-col items-start gap-4 duration-300 group md:gap-8 px-8 pt-16 pb-4 bg-white/20 borderBlack rounded-xl py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer shadow-black/10 shadow-sm transition-all hover:shadow-2xl ${
              index === Skilldata.length - 1 && Skilldata.length % 2 !== 0
                ? 'sm:col-span-2'
                : ''
            }`}
          >
            <Image
              width='80'
              height='80'
              src={item.src.src}
              alt='web'
              className='dark:filter-none filter invert brightness-100 -mt-10 md:-mb-5'
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
