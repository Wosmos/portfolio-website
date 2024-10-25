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
