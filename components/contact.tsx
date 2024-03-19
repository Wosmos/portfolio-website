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
  FaGithub,
} from 'react-icons/fa';
import { MdOutlineMailOutline } from 'react-icons/md';
import Socials from './socials';
import { socialIcons } from '@/lib/data';
import { SiHashnode } from 'react-icons/si';

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
      <div className=' flex flex-col-reverse md:flex-row gap-2 '>
        {/* left section */}
        <div className=' flex flex-col flex-1 text-black dark:text-white text-center md:text-left  px-8  item-end h-72  '>
          <h1 className='text-lg md:text-5xl font-normal mb-4 mt-2 bg-black/0 hidden  md:block'>
            Let's Connect!
          </h1>
          <p className='md:text-lg mb-4 hidden  md:block  md:leading-relaxed tracking-wider text-sm'>
            Whether you have a project in mind, want to discuss potential
            collaboration, or just want to say hello, feel free to reach out!
          </p>
          <ul className='  md:mt-4  '>
            <span className='md:text-2xl text-lg mb-4 cursor-pointer '>
              {'  '}
              Phone: <span> </span>
              <a
                href='https://wa.me/923062248224?text=Hello%20there!'
                className='hover:underline md:text-[29px]  font-bold transition-all focus:scale-110 hover:scale-110'
              >
                {' '}
                +92 306 224 8224
                <span className='w-full h-[2px] bg-black dark:bg-white hidden hover:block transition-all' />
              </a>{' '}
            </span>
            <div className='flex md:justify-start justify-center items-center '>
              <ul className='mt-2 flex gap-2 md:gap-4 bottom-0  md:mt-6 md:justify-start  justify-start text-left'>
                {/* <Socials socialIcons={socialIcons} showLines={false} /> */}
                {[
                  {
                    icon: <FaInstagram />,
                    link: 'https://www.instagram.com/wosmo_tech/',
                  },
                  {
                    icon: <FaLinkedin />,
                    link: 'https://www.linkedin.com/in/wasif-malik-79205a1bb/',
                  },
                  { icon: <FaGithub />, link: 'https://github.com/Wosmos' },
                  // { icon: <SiHashnode />, link: 'https://hashnode.com/@Wosmo' },
                  {
                    icon: <FaWhatsapp />,
                    link: 'https://wa.me/923062248224?text=Hello%20there!',
                  },
                ].map((social, index) => (
                  <li
                    key={index}
                    className='text-md md:text-xl scale-110 hover:text-3xl transition-all duration-200 ease-in-out focus:text-2xl'
                  >
                    <a
                      href={social.link}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </ul>
        </div>
        {/* right section */}
        <form
          className='mt-2 flex flex-col dark:text-black flex-1  md:mt-0'
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
