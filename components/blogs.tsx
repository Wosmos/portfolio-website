'use client';
import React from 'react';
// import ReactTooltip from 'react-tooltip';
import { Tooltip } from 'react-tooltip';
import Blogdata from '@/lib/data/blogs.json';
import { motion } from 'framer-motion';
import SectionHeading from './section-heading';
import { useSectionInView } from '@/lib/hooks';
import { BiHeart } from 'react-icons/bi';
import { BsEye } from 'react-icons/bs';
import Link from 'next/link';

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
            className='flex flex-row md:flex-col  duration-300 group   bg-white/20  rounded-xl  dark:bg-white/10 dark:text-white/80 group cursor-pointer shadow-black/10 shadow-md transition-all hover:shadow-2xl w-full md:w-[300px]  gap-x-6 gap-y-4'
          >
            <div className='relative h-56 overflow-hidden md:h-48  md:rounded-t-md md:rounded-b-none rounded-md bg-black/20 rounded-tl-md rounded-bl-md  rounded-tr-none rounded-br-none '>
              <Link href={blog.link} >
                <img
                  width='100'
                  height='80'
                  src={blog.src}
                  alt='blog1'
                  className='w-full h-full object-cover transition-transform duration-300 transform hover:scale-110'
                />
              </Link>
            </div>
            <div className='p-6 flex flex-col text-left'>
              <h3 className='text-[18px] font-[600] mb-2'>{blog.title}</h3>
              <p
                className='md:hidden text-gray-600 mb-4 relative overflow-hidden'
                data-tooltip-target='tooltip-default'
              >
                {blog.description.length <= 25 ? (
                  blog.description
                ) : (
                  <>
                    <span>{blog.description.substring(0, 35)} ... </span>
                    <span className='absolute top-0 left-0 z-10 w-full h-full bg-white text-gray-600 dark:bg-white/0 dark:text-white  pb-2 pt-1 text-[11px] rounded-sm backdrop-blur-sm shadow-xl shadow-black opacity-0 transition-opacity duration-500 hover:opacity-100 '>
                      {blog.description}
                    </span>
                  </>
                )}
              </p>

              <div className=' flex flex-col justify-start  items-start w-full text-gray-400 text-[10px] md:text-xs '>
                <p className='text-gray-400  text-[12px] md:text-sm font-normal'> {blog.Date}</p>
                <p> {blog.readTime} min read</p>
              </div>
             
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Blogs;
