'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { links, pageLinks } from '@/lib/data';
import Link from 'next/link';
import clsx from 'clsx';
import { useActiveSectionContext } from '@/context/active-section-context';
import Logo from '../components/logo';


const navItems = [
  { ...pageLinks[0], description: 'Return to the homepage' },
  { ...pageLinks[1], description: 'Learn about my background and journey' },
  { ...pageLinks[2], description: 'View my core competencies and abilities' },
  { ...pageLinks[3], description: 'Explore my technical expertise and tools' },
  { ...pageLinks[4], description: 'Browse my portfolio of work' },
  { ...pageLinks[5], description: 'See my professional journey and roles' },
  { ...pageLinks[6], description: 'Read my articles and insights' },
  { ...pageLinks[7], description: 'Get in touch with me' },
];

export default function DualHeader() {
  const { activeSection, setActiveSection, setTimeOfLastClick } =
    useActiveSectionContext();

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <>
      <header className='z-[999] relative'>
        <motion.div
          className='fixed top-0 left-1/2 h-[4.5rem] w-full rounded-none border border-white border-opacity-40 bg-white bg-opacity-70 shadow-2xl backdrop-blur-[0.5rem] sm:top-6 sm:h-[3.25rem] sm:w-[36rem] sm:rounded-full dark:bg-gray-950 dark:border-black/40 dark:bg-opacity-75 shadow-black/10 transition-all ring-white/15 ring-1'
          initial={{ y: -100, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
        ></motion.div>

        <nav className='flex fixed top-[0.15rem] left-1/2 h-12 -translate-x-1/2 py-2 sm:top-[1.7rem] sm:h-[initial] sm:py-0'>
          <ul className='flex w-[20rem] md:w-[28rem] flex-wrap items-center justify-center gap-y-1 text-[0.9rem] font-medium text-gray-500 sm:w-[initial] sm:flex-nowrap sm:gap-5'>
            <motion.span
              className='hidden md:block absolute object-cover st top-[-28px] mr-[1000px] z-50 text-white'
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'tween',
                duration: 0.2,
              }}
            >
              <motion.div
                variants={logoVariants}
                initial='hidden'
                animate='visible'
                transition={{ duration: 0.3 }}
              >
                <Link href='/'>
                  <Logo
                    width='200'
                    height='100'
                    classname='fill-black dark:fill-white stroke-1 w-[200px] h-[100px] lg:w-[250px] lg:h-[120px] sm:block hidden'
                  />
                </Link>
              </motion.div>
            </motion.span>

            {navItems.map((link) => (
              <motion.li
                className='group h-3/4 flex items-center justify-center relative'
                key={link.hash}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <Link
                  className={clsx(
                    'flex w-full items-center justify-center px-2 md:px-2 py-3 hover:text-gray-950 transition font-normal dark:hover:text-white',
                    {
                      'text-gray-950 dark:text-gray-200':
                        activeSection === link.name,
                    }
                  )}
                  href={link.hash}
                  onClick={() => {
                    setActiveSection(link.name);
                    setTimeOfLastClick(Date.now());
                  }}
                >
                  <div className='block text-xl md:text-2xl hover:scale-125 transition-all'>
                    {link.icon}
                  </div>

                  {link.name === activeSection && (
                    <motion.span
                      className='dark:bg-transparent rounded-full absolute inset-0 overflow-hidden'
                      layoutId='activeSection'
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    >
                      <motion.span className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent'></motion.span>
                    </motion.span>
                  )}
                </Link>

                {/* Tooltip - positioned below */}
                <div className='absolute left-1/2 -translate-x-1/2 translate-y-[calc(100%+10px)] bottom-0 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-10'>
                  <div className='bg-blue-50 dark:bg-gray-900 dark:text-white px-4 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap'>
                    <div className='font-bold text-blue-400'>{link.name}</div>
                    <div className='text-xs font-thin opacity-90'>{link.description}</div>

                    {/* Tooltip arrow - Now points upward */}
                    <div className='absolute left-1/2 -translate-x-1/2 top-0 -translate-y-[calc(100%-2px)] border-8 border-transparent border-b-blue-50 dark:border-b-gray-900' />
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
