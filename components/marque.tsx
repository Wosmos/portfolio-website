'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TechStackMarqueeProps {
  techStackIcons: React.ReactNode[];
  fadeInAnimationVariants: any;
}

const TechStackMarquee: React.FC<TechStackMarqueeProps> = ({
  techStackIcons,
  fadeInAnimationVariants,
}) => {
  return (
    <div className='relative overflow-hidden'>
      <motion.div
        className='marquee flex gap-4'
        animate={{ x: [0, -100] }}
        transition={{
          duration: 60, // Adjust the duration as needed
          ease: 'linear',
          repeat: Infinity,
          repeatType: 'loop',
        }}
      >
        {techStackIcons.map((skill, index) => (
          <motion.div
            className='shadow-black/10 shadow-sm transition-all hover:shadow-2xl relative bg-white borderBlack rounded-md md:rounded-xl px-3 py-2 md:px-10 md:py-6 dark:bg-white/10 dark:text-white/80 group cursor-pointer'
            key={index}
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{ once: true }}
            custom={index}
          >
            {skill}
            <motion.span className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100' />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default TechStackMarquee;
