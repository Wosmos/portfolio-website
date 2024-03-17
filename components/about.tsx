'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import Socials from './socials';
import { socialIcons } from '@/lib/data';
import AboutData from '../lib/data/about.json';
export default function About() {
  const { ref } = useSectionInView('About');

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
      {AboutData.map((paragraph, index) => (
        <p key={index} className='mb-3 text-sm md:text-lg space-x-1'>
          {paragraph.segments.map((segment, idx) => (
            <React.Fragment key={idx}>
              {segment.html ? (
                <span className='font-medium'>{segment.text}</span>
              ) : (
                segment.text
              )}
            </React.Fragment> 
          ))}
        </p>
      ))}
      {/* <p className='mb-3'>
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
      </p> */}

      <Socials socialIcons={socialIcons} showLines={true} />
    </motion.section>
  );
}
