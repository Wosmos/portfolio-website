'use client';
import { useActiveSectionContext } from '@/context/active-section-context';
import { motion } from 'framer-motion';
import Link from 'next/link';
import React from 'react';

import { links } from '@/lib/data';

import clsx from 'clsx';

type Props = {};

export default function SideBar () {
  const { activeSection, setActiveSection, setTimeOfLastClick } =
    useActiveSectionContext();

  
  return (
    <header className='z-[998] fixed left-0 top-0 h-[70vh] w-16 sm:w-24'>
      <nav className='md:flex flex-col h-full py-4 my-4 hidden'>
        <ul className='flex flex-col items-end justify-center gap-y-1 text-sm font-medium text-gray-500   fixed right-0 top-0 h-full w-16 sm:w-24 rounded-l-3xl border-r border-white border-opacity-40 bg-white bg-opacity-70 shadow-2xl backdrop-blur-[0.5rem] dark:bg-gray-950 dark:border-black/40 dark:bg-opacity-75 shadow-black/10 transition-all ring-white/15 ring-1 py-4 px-4'>
          {links.map((link, index) => (
            <motion.li
              className='relative'
              key={`side-${link.hash}`}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                className={clsx(
                  'flex flex-col items-end text-right justify-end px-2 py-2 hover:text-gray-950 transition font-normal dark:hover:text-white   ',
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
                <div className='text-xl md:text-2xl hover:scale-125 transition-all'>
                  {link.icon}
                </div>
                <span className='text-[0.6rem] md:text-xs mt-1'>
                  {link.name}
                </span>

                {link.name === activeSection && (
                  <motion.span
                    className='absolute -right-1 w-1 h-full bg-blue-500 rounded-l-full'
                    layoutId='activeSideSection'
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                  ></motion.span>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      </nav>
    </header>
  );
};


