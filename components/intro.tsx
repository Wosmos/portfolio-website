'use client';

import Image from 'next/image';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSectionInView } from '@/lib/hooks';
import { TypeAnimation } from 'react-type-animation';
import { useActiveSectionContext } from '@/context/active-section-context';
import pfpimg from '../public/profile.jpg';

// importing react icons
import { BsArrowRight, BsLinkedin } from 'react-icons/bs';
import { HiDownload } from 'react-icons/hi';
import { FaGithubSquare } from 'react-icons/fa';

export default function Intro() {
  const { ref } = useSectionInView('Home', 0.5);
  const { setActiveSection, setTimeOfLastClick } = useActiveSectionContext();
  return (
    <section
      ref={ref}
      id='home'
      className='mb-28 max-w-[50rem] text-center sm:mb-0 scroll-mt-[100rem]'
    >
      <div className='flex items-center justify-center'>
        <div className='relative'>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'tween',
              duration: 0.2,
            }}
          >
            <Image
              src={pfpimg}
              alt='wosmo portrait'
              width='200'
              height='200'
              quality='95'
              priority={true}
              className='  w-28 h-28 rounded-[500px] object-cover border-[0.35rem] border-white shadow-xl'
            />
          </motion.div>

          <motion.span
            className='absolute bottom-0 left-0 text-4xl'
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 125,
              delay: 0.1,
              duration: 0.7,
            }}
          ></motion.span>
        </div>
      </div>

      <motion.h1
        className='mb-10 mt-4 px-4 text-2xl font-medium !leading-[1.5] sm:text-4xl'
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className='font-bold'>Hello, I&apos;m</span>
        <div className='z-10 text-4xl duration-1000  cursor-default text-edge-outline animate-title font-display sm:text-5xl md:text-6xl font-bold whitespace-nowrap dark:text-gr'>
          <TypeAnimation
            className=''
            sequence={[
              'Wasif',
              1000,
              'React Dev',
              1000,
              'Flutter Dev',
              1000,
              'Graphic designer',
              1000,
            ]}
            wrapper='span'
            speed={50}
            repeat={Infinity}
          />
        </div>
        <q className='text-sm font-semibold italic relative  p-4 '>
          I&apos;m Wasif aka <b>Wosmo. </b>
          An Astrophile who loves to code.
        </q>
      </motion.h1>

      <motion.div
        className='flex flex-col sm:flex-row items-center justify-center gap-2 px-4 text-lg font-medium'
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.1,
        }}
      >
        {/* <Link
          href='#contact'
          className='group bg-gray-900 text-white px-7 py-3 flex items-center gap-3 rounded-full outline-none focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 transition '
          onClick={() => {
            setActiveSection('Contact');
            setTimeOfLastClick(Date.now());
          }}
        >
          Contact me here{' '}
          <BsArrowRight className='opacity-70 group-hover:translate-x-1 transition' />
        </Link> */}
        <span className='w-4 hidden md:block' />
        <a
          className='group bg-white px-7 py-3 flex items-center -mt-6 gap-2 rounded-full outline-none focus:scale-110 hover:scale-110 active:scale-105  cursor-pointer borderBlack dark:bg-black/90 shadow-black/10 shadow-md transition-all hover:shadow-2xl'
          href='/CV.pdf'
          download
        >
          Download CV{' '}
          <HiDownload className='opacity-60 group-hover:translate-y-1 transition' />
        </a>
      </motion.div>
    </section>
  );
}
