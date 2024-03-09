import React from 'react';
import { CgWorkAlt } from 'react-icons/cg';
import moviesAppImage from '@/public/corpcomment.png';
import bankingAppImage from '@/public/rmtdev.png';
import landingPageImage from '@/public/wordanalytics.png';

import { LuGraduationCap } from 'react-icons/lu';
import {
  FaHtml5,
  FaReact,
  FaNodeJs,
  FaPython,
  FaGitAlt,
  FaBootstrap,
  FaCss3Alt,
} from 'react-icons/fa';

import { IoLogoJavascript } from 'react-icons/io5';
import { BiLogoTypescript, BiLogoMongodb } from 'react-icons/bi';
import { TbBrandFramerMotion, TbBrandNextjs } from 'react-icons/tb';
import { SiTailwindcss, SiRedux, SiAppwrite } from 'react-icons/si';


export const links = [
  {
    name: 'Home',
    hash: '#home',
  },
  {
    name: 'About',
    hash: '#about',
  },
  {
    name: 'Projects',
    hash: '#projects',
  },
  {
    name: 'Skills',
    hash: '#skills',
  },
  {
    name: 'Experience',
    hash: '#experience',
  },
  {
    name: 'Contact',
    hash: '#contact',
  },
] as const;

export const experiencesData = [
  {
    title: 'Graduated bootcamp',
    location: 'Miami, FL',
    description:
      'I graduated after 6 months of studying. I immediately found a job as a front-end developer.',
    icon: React.createElement(LuGraduationCap),
    date: '2019',
  },
  {
    title: 'Front-End Developer',
    location: 'Orlando, FL',
    description:
      'I worked as a front-end developer for 2 years in 1 job and 1 year in another job. I also upskilled to the full stack.',
    icon: React.createElement(CgWorkAlt),
    date: '2019 - 2021',
  },
  {
    title: 'Full-Stack Developer',
    location: 'Houston, TX',
    description:
      "I'm now a full-stack developer working as a freelancer. My stack includes React, Next.js, TypeScript, Tailwind, Prisma and MongoDB. I'm open to full-time opportunities.",
    icon: React.createElement(FaReact),
    date: '2021 - present',
  },
] as const;

export const projectsData = [
  {
    link: 'https://example.com/project1',
    title: 'Tech Startup Landing Page',
    description:
      "A landing page designed for a tech startup. The page showcases the company's product or service, highlights its features.",
    tags: [<FaReact />, <IoLogoJavascript />, <SiTailwindcss />],
    imageUrl: landingPageImage,
  },
  {
    link: 'https://example.com/project2',
    title: 'Movies App',
    description:
      'A web application for browsing and discovering movies. Users can search for movies, view details such as ratings and reviews, and save their favorite movies to watch later.',
    tags: [<FaReact />, <BiLogoTypescript />, <SiTailwindcss />, <SiRedux />],
    imageUrl: moviesAppImage,
  },
  {
    link: 'https://example.com/project3',
    title: 'Banking Web App',
    description:
      'Web app for online banking services. Users can manage their accounts, transfer funds, pay bills, and view transaction history.',
    tags: [<FaReact />, <SiTailwindcss />, <FaHtml5 />, <FaCss3Alt />],
    imageUrl: bankingAppImage,
  },
] as const;

export const skillsData = [
  'HTML',
  'CSS',
  'Tailwind',
  'BootStrap',
  'Framer Motion',
  'JavaScript',
  'TypeScript',
  'React',
  'Redux',
  'Next.js',
  'Node.js',
  'Git',
  'AppWrite',
  'MongoDB',
  'Express',
  'Python',
] as const;
