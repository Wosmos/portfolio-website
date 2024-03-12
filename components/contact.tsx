'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import { sendEmail } from '@/actions/sendEmail';
import SubmitBtn from './submit-btn';
import toast from 'react-hot-toast';

export default function Contact() {
  const { ref } = useSectionInView('Contact');

  return (
    <motion.section
      id='contact'
      ref={ref}
      className='mb-20 sm:mb-28 w-[min(100%,38rem)] text-center'
      initial={{
        opacity: 0,
      }}
      whileInView={{
        opacity: 1,
      }}
      transition={{
        duration: 1,
      }}
      viewport={{
        once: true,
      }}
    >
      <SectionHeading>Contact me</SectionHeading>
      <div className='flex flex-col md:flex-row'>
        {/* left section */}
        <div className='bg-black w-full flex-1 h-4'>
          <p className='text-gray-700 dark:text-white -mt-6 dark:text-white/80'>
            Please contact me directly at{' '}
            <a
              className='border-b-[1px] border-blue-500 '
              href='mailto:example@gmail.com'
            >
              m.wasifmalik17@gmail.com
            </a>{' '}
            or through this form.
          </p>
        </div>
        {/* right section */}
        <form
          className='mt-10 flex flex-col dark:text-black'
          action={async (formData) => {
            const { data, error } = await sendEmail(formData);

            if (error) {
              toast.error(error);
              return;
            }

            toast.success('Email sent successfully!');
          }}
        >
          <input
            className='h-14 px-4 rounded-lg borderBlack dark:bg-white/10 
          dark:bg-opacity-80 dark:focus:bg-opacity-100 transition-all dark:outline-none
          dark:text-white
          '
            name='senderEmail'
            type='email'
            required
            maxLength={500}
            placeholder='Your email'
          />
          <textarea
            className='h-52 my-3 rounded-lg borderBlack p-4 dark:bg-white/10 dark:bg-opacity-80 dark:focus:bg-opacity-100 transition-all dark:outline-none dark:text-white'
            name='message'
            placeholder='Your message'
            required
            maxLength={5000}
          />
          <SubmitBtn />
        </form>
      </div>
    </motion.section>
  );
}
