import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import Image from 'next/image';
import cleanCodeImage from '../public/clean-code.jpeg';


const Blogs = ({ data }) => {
  const fadeInAnimationVariants = {
    initial: {
      opacity: 0,
      y: 100,
    },
    animate: (index) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.05 * index,
      },
    }),
  };

  return (
    <section className='mb-28 max-w-[53rem] scroll-mt-28 text-center sm:mb-40'>
      <SectionHeading>My Blogs</SectionHeading>

      <div
        className={`grid w-full grid-cols-1 gap-4 mx-auto mt-32 sm:mt-0 sm:grid-cols-2 lg:gap-3 my-4 ${
          data.length === 1 ? '' : 'sm:grid-cols-3'
        } lg:gap-3 my-4`}
      >
        {data.map((item, index) => (
          <motion.div
            key={item.id}
            variants={fadeInAnimationVariants}
            initial='initial'
            whileInView='animate'
            viewport={{
              once: true,
            }}
            className={`relative flex flex-col items-start gap-4 duration-700 group md:gap-8 px-8 pt-16 pb-4 bg-white/20 borderBlack rounded-xl py-3 dark:bg-white/10 dark:text-white/80 group cursor-pointer ${
              data.length === 1
                ? 'sm:col-span-3'
                : data.length === 2
                ? 'sm:col-span-1'
                : index === data.length - 1 && data.length % 3 !== 0
                ? 'sm:col-span-2'
                : ''
            }`}
          >
            <div className='overflow-hidden -mt-10 md:-mb-5 w-full h-52  md:h-32 rounded-md ring-1 ring-black dark:ring-white '>
              <Image
                width='160'
                height='80'
                src={cleanCodeImage.src}
                alt='web'
                className='w-full h-full object-cover rounded-md transition-transform duration-300 transform hover:scale-110 '
              />
            </div>

            <div className='relative flex flex-col items-start'>
              <h1 className='text-2xl font-semibold'>{item.title}</h1>
              <p className='mt-2 leading-relaxed text-gray-700 dark:text-white/70 text-left mb-4'>
                {item.description.length < 25
                  ? item.description
                  : item.description + ' ...'}
              </p>
              <button className='justify-center shadow-xl duration-300 group bg-gray-900 text-white px-7 py-3 flex items-center gap-3 rounded-xl outline-none focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105 transition'>
                Read More
              </button>
            </div>
            <div className='absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100' />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Blogs;
