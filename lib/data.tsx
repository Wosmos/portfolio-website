import React from 'react';
import { CgWorkAlt } from 'react-icons/cg';
import moviesAppImage from '@/public/corpcomment.png';
import bankingAppImage from '@/public/rmtdev.png';
import landingPageImage from '@/public/wordanalytics.png';

import uiux from '../public/serv-img/1.png';
import web from '../public/serv-img/2.png';
import app from '../public/serv-img/3.png';
import wp from '../public/serv-img/4.png';

import { LuGraduationCap } from 'react-icons/lu';
import {
  FaHtml5,
  FaReact,
  FaNodeJs,
  FaPython,
  FaGitAlt,
  FaBootstrap,
  FaCss3Alt,
  FaHome,
  FaUserAlt,
  FaLaptopCode,
  FaLayerGroup,
  FaProjectDiagram,
  FaBriefcase,
  FaBloggerB,
  FaEnvelope,
} from 'react-icons/fa';

import { IoLogoJavascript } from 'react-icons/io5';
import { BiLogoTypescript, BiLogoMongodb } from 'react-icons/bi';
import { TbBrandFramerMotion, TbBrandNextjs } from 'react-icons/tb';
import { SiTailwindcss, SiRedux, SiAppwrite } from 'react-icons/si';

export const links = [
  {
    name: 'Home',
    hash: '#home',
    icon: <FaHome />,
  },
  {
    name: 'About',
    hash: '#about',
    icon: <FaUserAlt />,
  },
  {
    name: 'Skills',
    hash: '#skills',
    icon: <FaLaptopCode />,
  },
  {
    name: 'TechStack',
    hash: '#techStack',
    icon: <FaLayerGroup />,
  },
  {
    name: 'Projects',
    hash: '#projects',
    icon: <FaProjectDiagram />,
  },
  {
    name: 'Experience',
    hash: '#experience',
    icon: <FaBriefcase />,
  },
  {
    name: 'Blogs',
    hash: '#blogs',
    icon: <FaBloggerB />,
  },
  {
    name: 'Contact',
    hash: '#contact',
    icon: <FaEnvelope />,
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
    title: 'Tech Startup Landing Page',
    description:
      "A landing page designed for a tech startup. The page showcases the company's product or service, highlights its features.",
    tags: [
      React.createElement(FaReact),
      React.createElement(IoLogoJavascript),
      React.createElement(SiTailwindcss),
    ],
    imageUrl: landingPageImage,
  },
  {
    title: 'Movies App',
    description:
      'A web application for browsing and discovering movies. Users can search for movies, view details such as ratings and reviews, and save their favorite movies to watch later.',
    tags: [
      React.createElement(FaReact),
      React.createElement(BiLogoTypescript),
      React.createElement(SiTailwindcss),
      React.createElement(SiRedux),
    ],
    imageUrl: moviesAppImage,
  },
  // {
  //   title: 'Banking Web App',
  //   description:
  //     'Web app for online banking services. Users can manage their accounts, transfer funds, pay bills, and view transaction history.',
  //   tags: [
  //     React.createElement(FaReact),
  //     React.createElement(SiTailwindcss),
  //     React.createElement(FaHtml5),
  //     React.createElement(FaCss3Alt),
  //   ],
  //   imageUrl: bankingAppImage,
  // },
] as const;

export const Skilldata = [
  {
    id: 1,
    src: web,
    title: 'Sample Title 3',
    description: 'Lorem ipsum dolor sit amet  minima ',
  },
  {
    id: 2,
    src: app,
    title: 'Sample Title 3',
    description: 'Lorem ipsum dolor sit amet  minima ',
  },
  {
    id: 3,
    src: uiux,
    title: 'Sample Title 3',
    description: 'Lorem ipsum dolor sit amet  minima ',
  },

  {
    id: 4,
    src: wp,
    title: 'Sample Title 4',
    description: 'Lorem ipsum dolor sit amet  adipisicing elit.',
  },
] as const;

export const Blogdata = [
  {
    id: 1,
    src: web,
    title: 'Sample Title 3',
    description: 'Lorem ipsum dolor sit amet  minima ',
    link: 'http://hashnode.com',
    Date: '30 June 2023',
  },
  {
    id: 2,
    src: app,
    title: 'Sample Title 3',
    description: 'Lorem ipsum dolor sit amet  minima ',
    link: 'http://hashnode.com',
    Date: '20 Jun 2023',
  },
  {
    id: 3,
    src: uiux,
    title: 'Sample Title 3',
    description: 'Lorem ipsum dolor sit amet  minima ',
    link: 'http://hashnode.com',
    Date: '10 May 2023',
  },

  // {
  //   id: 4,
  //   src: wp,
  //   title: 'Sample Title 4',
  //   description: 'Lorem ipsum dolor sit amet  adipisicing elit.',
  // link: 'http://hashnode.com'
  // },
] as const;

export const techStack = [
  'HTML',
  'CSS',
  'Tailwind',
  'BootStrap',
  'Material UI',
  'JavaScript',
  'Jquery',
  'Framer Motion',
  'React',
  'Redux',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Git',
  'AppWrite',
  'MongoDB',
  'Express',
  'Python',
] as const;
