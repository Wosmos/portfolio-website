'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import Socials from './socials';
import { socialIcons } from '@/lib/data';
import SectionHeading from './section-heading';

export default function About() {
  const { ref } = useSectionInView('About');
  const [isExpanded, setIsExpanded] = useState(false);

  const content = useMemo(() => {
    const firstParagraph = `Crafting captivating digital experiences as a Last-year Software Engineering student. Specializing in React, Next.js, and venturing into React Native for mobile app development. Passionate about blending functionality with aesthetics to simplify lives through intuitive interfaces.`;

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

  const paragraphVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const lineVariants = {
    hidden: {
      opacity: 0,
      scaleX: 0,
    },
    visible: {
      opacity: 1,
      scaleX: 1,
      transition: {
        duration: 0.5,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.section
      ref={ref}
      className='mb-28 max-w-[45rem] text-center leading-8 sm:mb-40 scroll-mt-28 relative'
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.175 }}
      id='about'
    >
      {/* Decorative Background Elements */}
      <motion.div
        className='absolute -top-10 -left-10 w-24 h-24 bg-purple-100/50 dark:bg-purple-900/20 rounded-full blur-2xl -z-10'
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      />
      <motion.div
        className='absolute -bottom-10 -right-10 w-32 h-32 bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-2xl -z-10'
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.5 }}
      />

      {/* <motion.div
        variants={lineVariants}
        initial='hidden'
        animate='visible'
        className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500'
      /> */}

      <SectionHeading>
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          About me
        </motion.span>
      </SectionHeading>

      <motion.div
        variants={paragraphVariants}
        initial='hidden'
        animate='visible'
        className='relative px-4 sm:px-0'
      >
        <AnimatePresence mode='wait'>
          <motion.div
            key={isExpanded ? 'full' : 'truncated'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className='mb-3 whitespace-pre-wrap text-gray-800 dark:text-gray-200'
          >
            {/* Show full content on desktop, controlled content on mobile */}
            <div className='hidden sm:block'>{content.full}</div>
            <div className='block sm:hidden'>
              {isExpanded ? content.full : content.truncated}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Show button only on mobile when content is truncatable */}
        <motion.button
          onClick={toggleContent}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className='mt-2 underline mb-4 sm:hidden text-blue-500 hover:text-blue-700 font-medium transition-colors text-sm'
        >
          {isExpanded ? 'See Less' : 'See More'}
        </motion.button>
      </motion.div>

      <Socials socialIcons={socialIcons} showLines={true} />
    </motion.section>
  );

}