'use client';
import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { FaCode, FaGithub, FaStar } from 'react-icons/fa';
import { IoIosEye } from 'react-icons/io';
import Link from 'next/link';
import { projectsData } from '@/lib/data';
import { FiShare } from 'react-icons/fi';

type ProjectProps = (typeof projectsData)[number] & {
  githubStats?: {
    stars: number;
    lastCommit: string;
  };
  isShareable?: boolean;
};

export default function Project({
  title,
  description,
  tags,
  imageUrl,
  site,
  sourceCode,
  githubStats,
  isShareable = false,
}: ProjectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isImageHovered, setIsImageHovered] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['0 1', '1.33 1'],
  });

  const scaleProgess = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacityProgess = useTransform(scrollYProgress, [0, 1], [0.6, 1]);

  // Enhanced hover animations
  const imageAnimationVariants = {
    hover: {
      scale: 1.05,
      rotateZ: isImageHovered ? 2 : -2,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    normal: {
      scale: 1,
      rotateZ: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };
  const handleShare = async () => {
    if (!isShareable) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: description,
          url: site,
        });
      } else {
        // Fallback copy to clipboard
        await navigator.clipboard.writeText(site);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  return (
    <motion.div
      ref={ref}
      style={{
        scale: scaleProgess,
        opacity: opacityProgess,
      }}
      className='group mb-3 sm:mb-8 last:mb-0'
    >
      <section className='relative bg-gradient-to-br from-gray-100/30 via-gray-100/20 to-gray-100/30 dark:from-gray-800/30 dark:via-gray-800/20 dark:to-gray-800/30 max-w-[42rem] border border-black/5 rounded-lg overflow-hidden sm:pr-8 sm:h-[20rem] hover:border-black/10 dark:hover:border-white/10 sm:group-even:pl-8 dark:text-white dark:bg-white/10 shadow-lg hover:shadow-xl transition-all duration-300'>
        {/* Floating Stats Badge - Only shows if githubStats exist */}
        {githubStats && (
          <div className='absolute top-4 right-4 flex items-center gap-3 bg-black/10 dark:bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm'>
            <div className='flex items-center gap-1'>
              <FaStar className='text-yellow-500' />
              <span>{githubStats.stars}</span>
            </div>
            <div className='text-xs opacity-70'>
              Updated: {githubStats.lastCommit}
            </div>
          </div>
        )}

        {/* Hover Overlay with Actions */}
        <div className='absolute z-10 inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center items-center gap-x-6'>
          <Link href={sourceCode}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className='flex flex-col items-center gap-2'
            >
              <FaCode className='text-5xl text-white/90 hover:text-white transition-colors' />
              <span className='text-white/80 text-sm'>Source</span>
            </motion.div>
          </Link>
          <Link href={site}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className='flex flex-col items-center gap-2'
            >
              <IoIosEye className='text-5xl text-white/90 hover:text-white transition-colors' />
              <span className='text-white/80 text-sm'>Preview</span>
            </motion.div>
          </Link>
          {isShareable && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className='flex flex-col items-center gap-2 cursor-pointer'
              onClick={handleShare}
            >
              <FiShare className='text-5xl text-white/90 hover:text-white transition-colors' />
              <span className='text-white/80 text-sm'>Share</span>
            </motion.div>
          )}
        </div>

        <div className='pt-4 pb-7 px-5 sm:pl-10 sm:pr-2 sm:pt-10 sm:max-w-[50%] flex flex-col h-full sm:group-even:ml-[18rem]'>
          <h3 className='text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300'>
            {title}
          </h3>
          <p className='mt-2 leading-relaxed text-gray-700 dark:text-white/70'>
            {description}
          </p>

          {/* Enhanced Tags Section */}
          <ul className='flex flex-wrap mt-6 gap-2 sm:mt-auto'>
            {tags.map((tag, index) => (
              <li
                key={index}
                className='px-4 py-2 text-[0.9rem] uppercase tracking-wider rounded-full 
                          bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200
                          border border-gray-200 dark:border-gray-700
                          transform hover:-translate-y-0.5 transition-transform duration-200'
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>

        {/* Enhanced Image Section */}
        <motion.div
          variants={imageAnimationVariants}
          animate={isImageHovered ? 'hover' : 'normal'}
          onMouseEnter={() => setIsImageHovered(true)}
          onMouseLeave={() => setIsImageHovered(false)}
          className='absolute hidden sm:block top-8 -right-40 w-[28.25rem] rounded-t-lg shadow-2xl
            transition-transform duration-300
            group-hover:translate-x-3
            group-hover:translate-y-3
            group-hover:rotate-2
            group-even:group-hover:-translate-x-3
            group-even:group-hover:translate-y-3
            group-even:group-hover:-rotate-2
            group-even:right-[initial] group-even:-left-40'
        >
          <Image
            src={imageUrl}
            alt='Project Preview'
            quality={95}
            className='rounded-t-lg'
            width={452}
            height={300}
            priority={false}
          />
          {/* Image Overlay Gradient */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
        </motion.div>
      </section>
    </motion.div>
  );
}
