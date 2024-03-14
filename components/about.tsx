'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import { FaInstagram, FaLinkedin, FaGithub, FaTwitter } from 'react-icons/fa';
import { SiHashnode } from 'react-icons/si';

export default function About() {
  const { ref } = useSectionInView('About');
  const socialIcons = [
    { icon: <FaInstagram />, link: '#' },
    { icon: <FaLinkedin />, link: '#' },
    { icon: <FaGithub />, link: '#' },
    { icon: <FaTwitter />, link: '#' },
    { icon: <SiHashnode />, link: '#' },
  ];
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
      <p className='mb-3'>
        Crafting captivating digital experiences as a{' '}
        <span className='font-medium'>
          3rd-year Software Engineering student
        </span>
        . Specializing in <span className='font-medium'>React</span>,{' '}
        <span className='font-medium'>Next.js</span>, and venturing into{' '}
        <span className='font-medium'>React Native</span> for mobile app
        development. Passionate about blending functionality with aesthetics to
        simplify lives through intuitive interfaces.
      </p>
      <p className='mb-3'>
        Beyond coding, I indulge in{' '}
        <span className='font-medium'>video editing</span>,
        <span className='font-medium'> Photoshop artistry</span>, and{' '}
        <span className='font-medium'>sci-fi novels</span>. A stargazer at
        heart, forever in awe of the cosmic wonders. An introverted soul finding
        solace in quiet contemplation, yet always up for stimulating
        conversations over a cup of chai. Let's collaborate to weave code,
        creativity, and curiosity into unforgettable digital experiences. Reach
        out, and let's embark on this journey together.
      </p>

      <div className='flex w-full justify-center items-center gap-2'>
        <div className='hidden md:block w-1/3 h-[2px] bg-gray-200 dark:bg-opacity-20 rounded-lg'></div>
        {socialIcons.map((item, index) => (
          <a
            key={index}
            href={item.link}
            className='group w-10 h-10 bg-gray-900 text-white flex justify-center items-center rounded-full outline-none focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 text-xl mr-2 shadow-black/10 shadow-md transition-all hover:shadow-2xl '
          >
            {item.icon}
          </a>
        ))}
        <div className='hidden md:block w-1/3 h-[2px] bg-gray-200 dark:bg-opacity-20 rounded-lg'></div>
      </div>
    </motion.section>
  );
}
