'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';
import { sendEmail } from '@/actions/sendEmail';
import SubmitBtn from './submit-btn';
import toast from 'react-hot-toast';
import {
  FaInstagram,
  FaWhatsapp,
  FaLinkedin,
  FaDiscord,
  FaReddit,
} from 'react-icons/fa';
import { MdOutlineMailOutline } from 'react-icons/md';

export default function Contact() {
  const { ref } = useSectionInView('Contact');

  return (
    <motion.section
      id='contact'
      ref={ref}
      className='mb-20 sm:mb-28 w-[min(100%,50rem)] text-center '
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
      <div className=' flex flex-col md:flex-row gap-2 '>
        {/* left section */}
        <div className='mt-10 flex flex-col flex-1 text-black dark:text-white text-center md:text-left  px-8  item-end h-72  '>
          <h1 className='text-4xl font-normal mb-4 mt-2'>Let's Connect!</h1>
          <p className='md:text-lg mb-4  mt-4 text-sm'>
            Whether you have a project in mind, want to discuss potential
            collaboration, or just want to say hello, feel free to reach out!
          </p>
          <ul className='  mt-4'>
            <span className='nd:text-3xl text-xl mb-4 cursor-pointer '>
              {'  '}
              Phone: <span> </span>
              <a
                href='https://wa.me/923062248224?text=Hello%20there!'
                className='hover:underline font-bold transition-all focus:scale-110 hover:scale-110'
              >
                {' '}
                +92 306 224 8224
                <span className='w-full h-[2px] bg-black dark:bg-white hidden hover:block transition-all' />
              </a>{' '}
            </span>
            <ul className='text-md flex gap-4 bottom-0 mt-6 md:justify-start  justify-center'>
              {[
                { text: <FaWhatsapp />, link: 'https://Whatsapp.com' },
                { text: <FaDiscord />, link: 'https://GoogleChats.com' },
                { text: <FaReddit />, link: 'https://GoogleChats.com' },
                {
                  text: <MdOutlineMailOutline />,
                  link: 'https://GoogleChats.com',
                },
              ].map((icon, index) => (
                <a
                  key={index}
                  href={icon.link}
                  className='cursor-pointer hover:text-3xl hover:scale-125 transition-all text-2xl'
                >
                  {icon.text}
                </a>
              ))}
            </ul>
          </ul>
        </div>
        {/* right section */}
        <form
          className='mt-10 flex flex-col dark:text-black flex-1 '
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
          dark:bg-opacity-80 dark:focus:bg-opacity-100 transition-all dark:outline-none shadow-md
          dark:text-white hover:shadow-2xl
          '
            name='senderEmail'
            type='email'
            required
            maxLength={500}
            placeholder='Your email'
          />
          <textarea
            className='h-52 my-3 rounded-lg borderBlack p-4 dark:bg-white/10 dark:bg-opacity-80 dark:focus:bg-opacity-100  dark:outline-none dark:text-white shadow-md hover:shadow-2xl transition-all'
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
