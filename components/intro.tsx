'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSectionInView } from '@/lib/hooks';
import { TypeAnimation } from 'react-type-animation';
import { useActiveSectionContext } from '@/context/active-section-context';
import { HiDownload } from 'react-icons/hi';
import { FaGithubSquare, FaLinkedin } from 'react-icons/fa';
import pfpimg from '../public/profile.jpg';
import hoverGif from '../public/hover-greeting.gif'; // Placeholder for hover GIF

export default function Intro() {
  const [isHovered, setIsHovered] = useState(false);
  const { ref } = useSectionInView('Home', 0.5);
  const { setActiveSection, setTimeOfLastClick } = useActiveSectionContext();

  return (
    <section
      ref={ref}
      id='home'
      className='mb-28 max-w-[60rem] text-center sm:mb-0 scroll-mt-[100rem] px-4'
    >
      <div className='flex flex-col items-center justify-center space-y-8'>
        {/* Profile Image with Advanced Animation and Hover Effect */}
        <motion.div
          className='relative group'
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            damping: 10,
            stiffness: 200,
            duration: 0.5,
          }}
        >
          <div
            className='relative'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div
              className='absolute inset-0 rounded-full bg-gradient-to-br 
              from-purple-500/30 via-pink-500/30 to-red-500/30 
              animate-pulse duration-[3000ms]'
            />
            <Image
              src={pfpimg}
              alt='Wasif Malik portrait'
              width='150'
              height='150'
              quality='95'
              priority
              className='relative w-20 h-20 md:w-36 md:h-36 rounded-full object-cover 
                border-4 border-transparent
                shadow-2xl 
                group-hover:scale-105 
                transition-all duration-500 
                ring-4 ring-purple-500/30 
                dark:ring-purple-900/30'
            />
          </div>
        </motion.div>

        {/* Animated Introduction Text */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
          }}
          className='text-center space-y-4'
        >
          <h1 className='text-3xl md:text-5xl font-bold text-gray-800 dark:text-gray-100'>
            Hello, I&apos;m{' '}
            <span className='text-purple-600 dark:text-purple-400'>
              Wasif Malik
            </span>
          </h1>

          <div className='text-2xl md:text-4xl font-semibold text-gray-700 dark:text-gray-300'>
            <TypeAnimation
              sequence={[
                'React Developer',
                1000,
                'Next.js Specialist',
                1000,
                'Flutter Enthusiast',
                1000,
                'Web Designer',
                1000,
              ]}
              wrapper='span'
              speed={50}
              repeat={Infinity}
              className='text-gradient bg-clip-text text-transparent 
              bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 
              dark:from-purple-400 dark:via-pink-300 dark:to-red-400'
            />
          </div>

          <p className='text-md md:text-lg text-gray-600 dark:text-gray-400 italic max-w-2xl mx-auto px-4'>
            Transforming digital landscapes through code, blending creativity
            with cutting-edge technology.
          </p>
        </motion.div>

        {/* Social and CV Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            delay: 0.2,
          }}
          className='flex justify-center items-center gap-4'
        >
          <a
            href='/my-cv.pdf'
            download
            className='group relative inline-flex items-center 
            px-6 py-3 text-lg font-medium 
            bg-purple-600 text-white 
            rounded-full 
            hover:bg-purple-700 
            transition-all duration-300 
            shadow-lg shadow-purple-500/50 
            hover:shadow-xl 
            hover:scale-105 
            dark:bg-purple-800 
            dark:hover:bg-purple-700'
          >
            Download CV
            <HiDownload className='ml-2 group-hover:translate-y-1 transition' />
          </a>

          <div className='flex space-x-4'>
            <Link
              href='https://github.com/wosmos'
              target='_blank'
              className='text-4xl text-gray-700 
              hover:text-purple-600 
              dark:text-gray-300 
              dark:hover:text-purple-400 
              transition-colors'
            >
              <FaGithubSquare />
            </Link>
            <Link
              href='https://www.linkedin.com/in/wasif-m-79205a1bb/'
              target='_blank'
              className='text-4xl text-gray-700 
              hover:text-purple-600 
              dark:text-gray-300 
              dark:hover:text-purple-400 
              transition-colors'
            >
              <FaLinkedin />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
