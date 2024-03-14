'use client';
import React from 'react';
import { Blogdata } from '@/lib/data';
import { motion } from 'framer-motion';
import Image from 'next/image';
import SectionHeading from './section-heading';
import { useSectionInView } from '@/lib/hooks';
import cc from '../public/clean-code.jpeg';
const fadeInAnimationVariants = {
  initial: {
    opacity: 0,
    y: 100,
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.05 * index,
    },
  }),
};

const Blogs = () => {
  const { ref } = useSectionInView('Blogs');
  return (
    <div
      ref={ref}
      id='blogs'
      className='max-w-[60rem] scroll-mt-28 text-center sm:mb-40 mb-28'
    >
      <SectionHeading>My Blogs</SectionHeading>

      <div className=' flex flex-wrap justify-center gap-4'>
        {Blogdata.map((blog, index) => (
          <motion.div
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{
              once: true,
            }}
            key={index}
            className='overflow-hidden transform flex flex-col  md:items-start gap-4 duration-300 group px-8 md:pt-16 pb-4 bg-white/20 borderBlack rounded-xl md:py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer shadow-black/10 shadow-md transition-all hover:shadow-2xl w-full md:w-[300px] py-6 text-center'
          >
            <div className='relative h-56 overflow-hidden md:h-48 md:rounded-t-md md:rounded-b-none rounded-md bg-black/20 md:-mt-16 md:-mx-8'>
              <Image
                width='100'
                height='80'
                src={cc.src}
                alt='blog1'
                className='w-full h-full object-cover transition-transform duration-300 transform hover:scale-110'
              />
            </div>
            <div className='md:p-6 flex-grow'>
              <h3 className='text-xl font-bold mb-2'>{blog.title}</h3>
              <p className='text-gray-600 mb-4'>
                {blog.description.length < 35
                  ? blog.description
                  : blog.description + ' ...'}
              </p>
              <p className='text-gray-400 text-sm mb-2'>Published on {blog.Date}</p>
              <a
                href={blog.link}
                target='_blank'
                rel='noopener noreferrer'
                className='justify-center duration-300 md:w-full px-4 py-2 group bg-gray-900 text-white md:px-7 md:py-3 flex items-center gap-3 rounded-xl outline-none focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 shadow-black/10 shadow-md transition-all hover:shadow-2xl  md:mt-0'
              >
                Read More
              </a>
            </div>
          </motion.div>
        ))}
        
      </div>
    </div>
  );
};

export default Blogs;
